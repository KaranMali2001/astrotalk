import { AcceptCallMessage, CallEndedMessage, CallStartedMessage, IncomingCallMessage, RejectCallMessage, WebSocketConnection, WSIncomingMessage } from "../types";
import { endCallAPI, getCallInfoByChannel, getUserName, logger, rejectCallAPI, startCallAPI } from "../utils";
import { connectionManager } from "./connectionManager";

export class MessageHandler {
  async handleMessage(connection: WebSocketConnection, messageData: string): Promise<void> {
    try {
      const message: WSIncomingMessage = JSON.parse(messageData);

      switch (message.type) {
        case "accept_call":
          await this.handleAcceptCall(connection, message as AcceptCallMessage);
          break;

        case "reject_call":
          await this.handleRejectCall(connection, message as RejectCallMessage);
          break;

        case "end_call":
          await this.handleEndCall(connection, message);
          break;

        default:
          logger.warn(`Unknown message type: ${message.type}`, { userId: connection.userId });
      }
    } catch (error) {
      logger.error("Message failed");
      this.sendError(connection, "Invalid format");
    }
  }

  async handleUserConnection(connection: WebSocketConnection): Promise<void> {
    if (connection.role === "USER" && connection.roomId && connection.agoraRoomId) {
      try {
        logger.info("CONNECTION", connection);
        const professionalId = connection.professionalId; // Get professionalId directly from token

        if (!professionalId) {
          logger.error("No professional found", { professionalId, connection });
          return;
        }

        // Send notification to professional if online
        const professionalConnection = connectionManager.findConnection(professionalId, "PROFESSIONAL");
        if (professionalConnection) {
          const userName = await getUserName(connection.userId);

          const incomingCallMessage: IncomingCallMessage = {
            type: "incoming_call",
            data: {
              callId: connection.roomId,
              userId: connection.userId,
              userName: userName,
              agoraChannelId: connection.agoraRoomId,
              callType: connection.callType, // Include callType from connection
            },
          };
          logger.info("Professional connection found:", incomingCallMessage);
          this.sendMessage(professionalConnection, incomingCallMessage);
          logger.info(`Call notification sent to professional: ${professionalId}`);
        } else {
          logger.warn(`Professional ${professionalId} is not online`);
          // Optionally notify user that professional is offline
          this.sendError(connection, "Prof offline");
        }
      } catch (error) {
        logger.error("Connection failed");
      }
    }
  }

  private async handleAcceptCall(connection: WebSocketConnection, message: AcceptCallMessage): Promise<void> {
    if (connection.role !== "PROFESSIONAL") {
      this.sendError(connection, "Prof only");
      return;
    }

    try {
      // Call start-call API
      const response = await startCallAPI(connection.userId, message.data.userId, message.data.callId);

      // Send tokens to both parties
      await this.sendCallTokens(connection.userId, message.data.userId, response.data);

      logger.info(`Call accepted by professional: ${connection.userId}, Call: ${message.data.callId}`);
    } catch (error) {
      logger.error("Accept failed");
      this.sendError(connection, "Start failed");
    }
  }

  private async handleRejectCall(connection: WebSocketConnection, message: RejectCallMessage): Promise<void> {
    if (connection.role !== "PROFESSIONAL") {
      this.sendError(connection, "Prof only");
      return;
    }

    try {
      // Call reject-call API
      console.log("CALL ID", message.data.callId);
      await rejectCallAPI(message.data.callId, connection.userId, message.data.reason);

      // Notify user of rejection
      const userConnection = connectionManager.findConnection(message.data.userId, "USER");
      if (userConnection) {
        this.sendMessage(userConnection, {
          type: "call_rejected",
          data: {
            callId: message.data.callId,
            reason: message.data.reason || "Professional declined the call",
          },
        });
      }

      logger.info(`Call rejected by professional: ${connection.userId}, Call: ${message.data.callId}`);
    } catch (error) {
      //@ts-ignore
      logger.error("Reject call error:", error.message);
      this.sendError(connection, "Reject failed");
    }
  }

  private async handleEndCall(connection: WebSocketConnection, message: WSIncomingMessage): Promise<void> {
    try {
      const callId = message.data.callId || connection.roomId;
      // Use channelId from message first (it's the actual Agora channel), then fallback to connection
      const channelId = message.data.channelId || connection.agoraRoomId;

      if (channelId) {
        // Call the end-call API using the channel name
        const res = await endCallAPI(channelId);

        // The API returns { success, message, data: { call } }
        //@ts-ignore
        const responseData = res.data;
        //@ts-ignore
        const call = responseData?.data?.call || responseData?.data || responseData;
        const totalDuration = call?.callDuration || 0;
        const finalCallId = call?.id || callId;

        // Get userId and professionalId from the call object
        let userId = call?.userId;
        let professionalId = call?.professionalId;

        // If we don't have both, fetch call info by channel
        if (!userId || !professionalId) {
          const callInfo = await getCallInfoByChannel(channelId);

          if (callInfo?.data) {
            userId = userId || callInfo.data.userId;
            professionalId = professionalId || callInfo.data.professionalId;
          } else if (callInfo) {
            userId = userId || callInfo.userId;
            professionalId = professionalId || callInfo.professionalId;
          }
        }

        // Notify both parties
        this.sendCallEndNotification(channelId, "call_ended_manually", totalDuration, finalCallId || callId, userId, professionalId);
      }
    } catch (error) {
      // Don't re-throw - we want to continue even if there's an error
    }
  }

  private async sendCallTokens(profId: string, userId: string, callData: any): Promise<void> {
    const userConnection = connectionManager.findConnection(userId, "USER");
    const profConnection = connectionManager.findConnection(profId, "PROFESSIONAL");
    const channelId = callData.call.agoraChannelId;
    const callId = callData.call.id;

    const callStartedMessage: CallStartedMessage = {
      type: "call_started",
      data: {
        agoraToken: "",
        channelId: channelId,
        callId: callId,
      },
    };

    if (userConnection) {
      // Update connection with channelId
      connectionManager.updateConnectionChannel(userId, channelId, callId);
      callStartedMessage.data.agoraToken = callData.agoraRoomTokenForUser;
      this.sendMessage(userConnection, callStartedMessage);
    }

    if (profConnection) {
      // Update connection with channelId - this is crucial for professionals
      connectionManager.updateConnectionChannel(profId, channelId, callId);
      callStartedMessage.data.agoraToken = callData.agoraRoomTokenForProf;
      this.sendMessage(profConnection, callStartedMessage);
    }
  }

  public sendCallEndNotification(channelId: string, reason: string, totalDuration: number, callId: string, userId?: string, professionalId?: string): void {
    let connections = connectionManager.getConnectionsByChannel(channelId);

    // If we couldn't find connections by channelId, try finding by userId and professionalId
    if (connections.length === 0 && (userId || professionalId)) {
      if (userId && professionalId) {
        connections = connectionManager.getConnectionsByCall(userId, professionalId);
      } else {
        // Try to find individual connections
        if (userId) {
          const userConn = connectionManager.findConnection(userId, "USER");
          if (userConn) {
            connections.push(userConn);
          }
        }
        if (professionalId) {
          const profConn = connectionManager.findConnection(professionalId, "PROFESSIONAL");
          if (profConn) {
            connections.push(profConn);
          }
        }
      }
    }

    const callEndedMessage: CallEndedMessage = {
      type: "call_ended",
      data: {
        reason,
        totalDuration,
        callId,
      },
    };

    if (connections.length > 0) {
      connections.forEach((connection) => {
        this.sendMessage(connection, callEndedMessage);
        // Clear the channelId from connection after call ends
        connection.agoraRoomId = undefined;
        connection.roomId = undefined;
      });
    }
  }

  private sendMessage(connection: WebSocketConnection, message: any): void {
    try {
      connection.socket.send(JSON.stringify(message));
    } catch (error) {
      // Send failed silently
    }
  }

  private sendError(connection: WebSocketConnection, message: string): void {
    try {
      connection.socket.send(
        JSON.stringify({
          type: "error",
          data: { message },
        })
      );
    } catch (error) {
      // Send failed silently
    }
  }
}

export const messageHandler = new MessageHandler();
