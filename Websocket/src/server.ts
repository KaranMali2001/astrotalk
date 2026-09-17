import uWS from "uWebSockets.js";
import { config, WEBSOCKET_CONFIG } from "./config";
import { AgoraWebhookPayload, WebSocketConnection } from "./types";
import { endCallAPI, getCallInfoByChannel, logger, verifySignature, verifyToken } from "./utils";
import { connectionManager } from "./websocket/connectionManager";
import { messageHandler } from "./websocket/messageHandler";

interface UserData {
  userId: string;
  role: "USER" | "PROFESSIONAL";
  roomId?: string;
  agoraRoomId?: string;
  professionalId?: string;
  callType?: "CHAT" | "AUDIO_CALL" | "VIDEO_CALL";
}

const app = uWS.App({
  // maxPayloadLength: WEBSOCKET_CONFIG.maxPayloadLength,
});

// WebSocket route for call connections
app.ws("/ws", {
  compression: uWS.DEDICATED_COMPRESSOR_3KB,
  maxPayloadLength: WEBSOCKET_CONFIG.maxPayloadLength,
  maxBackpressure: WEBSOCKET_CONFIG.maxPayloadLength,
  idleTimeout: WEBSOCKET_CONFIG.idleTimeout,

  upgrade: (res, req, context) => {
    const query = req.getQuery();
    const token = getTokenFromQuery(query);

    console.log("HERE", token);
    if (!token) {
      res.writeStatus("401 Unauthorized").end("Missing token");
      return;
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      res.writeStatus("401 Unauthorized").end("Invalid token");
      return;
    }

    // Store user data for use in open handler
    const userData = {
      userId: decoded.userId,
      role: decoded.role,
      roomId: (decoded as any).roomId || (decoded as any).callId, // Use callId as roomId fallback
      agoraRoomId: (decoded as any).agoraRoomId || (decoded as any).roomId, // Use roomId as agoraRoomId fallback
      // For professional session tokens, userId IS the professionalId
      // For room tokens, use the explicit professionalId field
      professionalId: (decoded as any).professionalId || (decoded.role === "PROFESSIONAL" ? decoded.userId : undefined),
      callType: (decoded as any).callType, // Extract callType from decoded token
    };

    res.upgrade(userData, req.getHeader("sec-websocket-key"), req.getHeader("sec-websocket-protocol"), req.getHeader("sec-websocket-extensions"), context);
  },

  open: (ws) => {
    const userData = ws.getUserData() as UserData;

    const connection: WebSocketConnection = {
      socket: ws,
      userId: userData.userId,
      role: userData.role,
      roomId: userData.roomId,
      agoraRoomId: userData.agoraRoomId,
      professionalId: userData.professionalId,
      callType: userData.callType,
    };

    connectionManager.addConnection(connection);

    // Handle user connection (auto-notify professional for incoming calls)
    messageHandler.handleUserConnection(connection);

    logger.info(`WebSocket connection established`, {
      userId: connection.userId,
      role: connection.role,
      roomId: connection.roomId,
    });
  },

  message: async (ws, message, _opCode) => {
    console.log("MESSAGE FROM CLIENT", ws.getUserData(), Buffer.from(message).toString());
    const userData = ws.getUserData() as UserData;
    const connection = connectionManager.findConnection(userData.userId);
    logger.info("Message received", { message: Buffer.from(message).toString() });
    if (connection) {
      const messageData = Buffer.from(message).toString();
      // Await the async handler to ensure it completes
      await messageHandler.handleMessage(connection, messageData).catch((error) => {
        logger.error("Error handling message:", error);
      });
    }
  },

  close: (ws, code, message) => {
    const userData = ws.getUserData() as UserData;
    connectionManager.removeConnection(userData.userId);

    logger.info(`WebSocket connection closed`, {
      userId: userData.userId,
      code,
      message: Buffer.from(message).toString(),
    });
  },
});

// Agora webhook endpoint
app.post("/agora/webhook", (res, req) => {
  let body = Buffer.alloc(0);
  const signature = req.getHeader("x-agora-signature");

  res.onData((chunk, isLast) => {
    body = Buffer.concat([body, Buffer.from(chunk)]);

    if (isLast) {
      try {
        const bodyString = body.toString();

        // Verify webhook signature in production
        if (process.env.NODE_ENV === "production" && signature) {
          if (!verifySignature(signature, bodyString, config.AGORA_WEBHOOK_SECRET)) {
            logger.warn("Invalid Agora webhook signature");
            res.writeStatus("401 Unauthorized").end("Invalid signature");
            return;
          }
        } else if (process.env.NODE_ENV === "production") {
          logger.warn("Missing Agora webhook signature");
          res.writeStatus("401 Unauthorized").end("Missing signature");
          return;
        }

        const payload: AgoraWebhookPayload = JSON.parse(bodyString);
        handleAgoraWebhook(payload);
        res.writeStatus("200 OK").end("OK");
      } catch (error) {
        logger.error("Parse failed");
        res.writeStatus("400 Bad Request").end("Invalid JSON");
      }
    }
  });

  res.onAborted(() => {
    logger.warn("Agora webhook request aborted");
  });
});

// Health check endpoint
app.get("/health", (res, _req) => {
  const stats = {
    status: "ok",
    uptime: process.uptime(),
    connections: connectionManager.getConnectionsCount(),
    professionals: connectionManager.getProfessionalConnections().length,
    users: connectionManager.getUserConnections().length,
    timestamp: new Date().toISOString(),
  };

  res.writeHeader("Content-Type", "application/json");
  res.end(JSON.stringify(stats));
});

// Internal endpoint for API to notify about call ends
app.post("/internal/notify-call-ended", (res, req) => {
  const internalSecret = req.getHeader("x-internal-secret");

  // Verify internal secret
  if (internalSecret !== config.JWT_INTERNAL_SECRET) {
    res.writeStatus("401 Unauthorized").end("Invalid internal secret");
    return;
  }

  let body = Buffer.alloc(0);

  res.onData(async (chunk, isLast) => {
    body = Buffer.concat([body, Buffer.from(chunk)]);

    if (isLast) {
      try {
        const payload = JSON.parse(body.toString());
        const { channelId, callId, reason, totalDuration, userId, professionalId } = payload;

        if (!callId) {
          res.writeStatus("400 Bad Request").end("Missing callId");
          return;
        }

        // Use provided values
        let finalChannelId = channelId || "";
        let finalUserId = userId || "";
        let finalProfessionalId = professionalId || "";

        // If we have channelId but missing userId/professionalId, try to get call info
        if (finalChannelId && (!finalUserId || !finalProfessionalId)) {
          const callInfo = await getCallInfoByChannel(finalChannelId);
          if (callInfo?.data) {
            finalUserId = finalUserId || callInfo.data.userId;
            finalProfessionalId = finalProfessionalId || callInfo.data.professionalId;
          }
        }

        // Notify both parties via WebSocket
        messageHandler.sendCallEndNotification(finalChannelId, reason || "call_ended_manually", totalDuration || 0, callId, finalUserId, finalProfessionalId);

        res.writeStatus("200 OK").end("Notification sent");
      } catch (error) {
        logger.error("Parse failed", error);
        res.writeStatus("400 Bad Request").end("Invalid JSON");
      }
    }
  });

  res.onAborted(() => {
    logger.warn("Internal notify request aborted");
  });
});

async function handleAgoraWebhook(payload: any): Promise<void> {
  logger.info("Agora webhook received:", payload);

  try {
    // Handle both old format (eventMs) and new format (eventType)
    const eventCode = payload.eventMs || payload.eventType;
    const channelName = payload.channelName || payload.payload?.channelName;
    const uid = payload.uid || payload.payload?.lastUid;
    const ts = payload.ts || payload.payload?.ts;

    logger.info("Parsed webhook data:", { eventCode, channelName, uid, ts });

    switch (eventCode) {
      case 104: // broadcaster_left - publisher/host left
        logger.info(`Broadcaster ${uid} left channel ${channelName}`);
        if (channelName) {
          await handleCallEnd(channelName);
        }
        break;

      default:
        logger.info(`Unhandled Agora event: ${eventCode} for channel ${channelName}`);
    }
  } catch (error) {
    logger.error("Webhook failed:", error);
    throw error; // Re-throw so the HTTP handler can respond with 500
  }
}

// Handle call end from Agora webhook
async function handleCallEnd(channelName: string): Promise<void> {
  try {
    // Call end-call API
    const res = await endCallAPI(channelName);
    logger.info("REs", { res });
    //@ts-ignore
    const { totalDuration, id: callId } = res.data.data;

    // Notify both parties
    messageHandler.sendCallEndNotification(channelName, "call_completed", totalDuration, callId);

    logger.info("Call ended successfully", {
      callId,
      channelName,
      totalDuration,
    });
  } catch (error) {
    logger.error("End failed:", error);
    throw error; // Re-throw to be handled by the caller
  }
}

// Helper function to extract token from query string
function getTokenFromQuery(query: string): string | null {
  const params = new URLSearchParams(query);
  return params.get("token");
}

// Start server
const port = config.WS_PORT;
app.listen(port, (token) => {
  if (token) {
    logger.info(`WebSocket server started on port ${port}`);
    logger.info(`Health check available at http://localhost:${port}/health`);
    logger.info(`Agora webhooks at http://localhost:${port}/webhooks/agora`);
  } else {
    logger.error(`Start failed on port ${port}`);
    process.exit(1);
  }
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down gracefully");
  process.exit(0);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception");
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled rejection");
  process.exit(1);
});
