# WebSocket Server Architecture

## Overview
This document outlines the WebSocket server implementation for real-time communication between professionals and users, facilitating live call connections through Agora integration.

## Flow Diagram
```
Professional -> Toggle Active -> API -> WS URL + Token -> WS Connection
User -> Initiate Call -> API -> JWT Token + WS URL -> WS Connection
WS Server -> Verify Token -> Extract ProfID -> Check Online Status
Professional Online -> Send Notification -> Professional Accepts
WS -> API Call (start-call) -> Agora Tokens -> Send to Frontend
Frontend -> Agora Connection -> Live Call
Agora Webhook -> WS Server -> API Call (end-call) -> Notify Frontend
```

## API Endpoints & Request/Response Formats

### 1. Professional Session Toggle

**Endpoint:** `POST /api/professionals/session/toggle`

**Headers:**
```
Authorization: Bearer <professional_jwt_token>
```

**Response:**
```typescript
interface SessionToggleResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    professionalId: string;
    startTime: Date;
    endTime?: Date;
    isActive: boolean;
    sessionToken: string;
    wsUrl: string; // Format: "ws://localhost:8080?token=<session_token>"
  }
}
```

**JWT Token Structure (Professional):**
```typescript
interface ProfessionalSessionToken {
  userId: string; // Professional ID
  role: "PROFESSIONAL";
  jti: string; // Unique token ID
  iat: number;
  exp: number;
}
```

### 2. User Call Initiation

**Endpoint:** `POST /api/calls/initiate-call`

**Headers:**
```
Authorization: Bearer <user_jwt_token>
```

**Request Body:**
```typescript
interface InitiateCallRequest {
  professionalId: string;
}
```

**Response:**
```typescript
interface InitiateCallResponse {
  success: boolean;
  message: string;
  data: {
    call: {
      id: string;
      userId: string;
      professionalId: string;
      callType: "AUDIO_CALL";
      status: "INITIATED";
      agoraChannelId: string;
      perMinuteRate: number;
      maxCallDuration: number;
      createdAt: Date;
      user: {
        id: string;
        username: string;
      }
    };
    ws: string; // Format: "ws://localhost:8080?token-<room_token>"
  }
}
```

**JWT Token Structure (Room Token for User):**
```typescript
interface RoomToken {
  roomId: string; // Agora Channel ID
  userId: string;
  role: "USER";
  agoraRoomId: string;
  jti: string;
  iat: number;
  exp: number;
}
```

### 3. Call Start API (Internal)

**Endpoint:** `POST /api/calls/start-call`

**Headers:**
```
Authorization: Bearer <internal_token>
Content-Type: application/json
```

**Request Body:**
```typescript
interface StartCallRequest {
  profId: string;
  userId: string;
  callId: string;
}
```

**Response:**
```typescript
interface StartCallResponse {
  success: boolean;
  message: string;
  data: {
    call: {
      id: string;
      userId: string;
      professionalId: string;
      status: "ONGOING";
      agoraChannelId: string;
      startTime: Date;
      maxCallDuration: number;
      user: {
        id: string;
        username: string;
      }
    };
    agoraRoomTokenForProf: string;
    agoraRoomTokenForUser: string;
  }
}
```

### 4. Call End API (Internal)

**Endpoint:** `POST /api/calls/end-call`

**Headers:**
```
Authorization: Bearer <internal_token>
Content-Type: application/json
```

**Request Body:**
```typescript
interface EndCallRequest {
  callId: string;
  totalDuration: number; // in minutes
}
```

**Response:**
```typescript
interface EndCallResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    status: "COMPLETED";
    totalDuration: number;
    totalAmount: number;
    endTime: Date;
  }
}
```

## WebSocket Server Implementation

### Connection Handling
```typescript
interface WebSocketConnection {
  socket: WebSocket;
  userId: string;
  role: "USER" | "PROFESSIONAL";
  roomId?: string;
  agoraRoomId?: string;
}

// WebSocket connection with token verification
ws.on('connection', (socket: WebSocket, request: IncomingMessage) => {
  const url = new URL(request.url!, 'ws://localhost');
  const token = url.searchParams.get('token');
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    const connection: WebSocketConnection = {
      socket,
      userId: decoded.userId || decoded.id,
      role: decoded.role,
      roomId: decoded.roomId,
      agoraRoomId: decoded.agoraRoomId
    };
    
    // Add to online connections
    addConnection(connection);
    
    // If professional, notify they're online
    if (connection.role === 'PROFESSIONAL') {
      broadcastProfessionalStatus(connection.userId, true);
    }
    
  } catch (error) {
    socket.close(1008, 'Invalid token');
  }
});
```

### WebSocket Message Types
```typescript
// Incoming message from user/professional
interface WSIncomingMessage {
  type: 'call_request' | 'accept_call' | 'reject_call' | 'end_call';
  data: any;
}

// Outgoing message to user/professional
interface WSOutgoingMessage {
  type: 'incoming_call' | 'call_accepted' | 'call_rejected' | 'call_started' | 'call_ended';
  data: any;
}

// Call request (from user to professional)
interface CallRequestMessage {
  type: 'call_request';
  data: {
    callId: string;
    userId: string;
    userName: string;
  }
}

// Call acceptance (from professional)
interface AcceptCallMessage {
  type: 'accept_call';
  data: {
    callId: string;
    userId: string;
  }
}

// Call rejection (from professional)
interface RejectCallMessage {
  type: 'reject_call';
  data: {
    callId: string;
    userId: string;
    reason?: string;
  }
}

// Call tokens distribution
interface CallStartedMessage {
  type: 'call_started';
  data: {
    agoraToken: string;
    channelId: string;
    callId: string;
  }
}
```

### Call Flow Implementation

#### Step 1: User Connects & Automatically Notifies Professional
```typescript
// When user connects with room token, automatically notify professional
function handleUserConnection(connection: WebSocketConnection) {
  if (connection.role === 'USER' && connection.roomId) {
    // Extract professional ID from call data
    const professionalId = getProfessionalIdFromCall(connection.roomId);
    
    // Send notification to professional if online
    const professionalConnection = findConnection(professionalId, 'PROFESSIONAL');
    if (professionalConnection) {
      professionalConnection.socket.send(JSON.stringify({
        type: 'incoming_call',
        data: {
          callId: connection.roomId,
          userId: connection.userId,
          userName: getUserName(connection.userId),
          agoraChannelId: connection.agoraRoomId
        }
      }));
    }
  }
}
```

#### Step 2: Professional Accepts/Rejects Call
```typescript
function handleProfessionalResponse(connection: WebSocketConnection, message: WSIncomingMessage) {
  if (message.type === 'accept_call') {
    // Call start-call API
    startCallAPI(message.data.callId, connection.userId, message.data.userId)
      .then(response => {
        // Send tokens to both parties
        sendCallTokens(connection.userId, message.data.userId, response.data);
      });
  } else if (message.type === 'reject_call') {
    // Call reject-call API and notify user
    rejectCallAPI(message.data.callId, connection.userId, message.data.reason)
      .then(() => {
        notifyCallRejection(message.data.userId, message.data.reason);
      });
  }
}
```

#### Step 3: Distribute Agora Tokens
```typescript
function sendCallTokens(profId: string, userId: string, callData: any) {
  const userConnection = findConnection(userId, 'USER');
  const profConnection = findConnection(profId, 'PROFESSIONAL');
  
  if (userConnection) {
    userConnection.socket.send(JSON.stringify({
      type: 'call_started',
      data: {
        agoraToken: callData.agoraRoomTokenForUser,
        channelId: callData.call.agoraChannelId,
        callId: callData.call.id
      }
    }));
  }
  
  if (profConnection) {
    profConnection.socket.send(JSON.stringify({
      type: 'call_started',
      data: {
        agoraToken: callData.agoraRoomTokenForProf,
        channelId: callData.call.agoraChannelId,
        callId: callData.call.id
      }
    }));
  }
}
```

### Agora Webhook Handling

#### Webhook Route Setup
```typescript
interface AgoraWebhookPayload {
  eventType: 'user_joined' | 'user_left' | 'channel_destroyed';
  channelName: string;
  uid: string;
  timestamp: number;
}

app.post('/webhooks/agora', (req: Request, res: Response) => {
  const payload: AgoraWebhookPayload = req.body;
  
  if (payload.eventType === 'user_left') {
    handleUserLeft(payload.channelName, payload.uid);
  } else if (payload.eventType === 'channel_destroyed') {
    handleChannelDestroyed(payload.channelName);
  }
  
  res.status(200).send('OK');
});
```

#### Call End Handler
```typescript
async function handleUserLeft(channelId: string, uid: string) {
  try {
    // Get call info from channel
    const callInfo = await getCallInfoByChannel(channelId);
    if (!callInfo) return;
    
    // Calculate duration and end call
    const startTime = new Date(callInfo.startTime);
    const endTime = new Date();
    const totalDuration = Math.ceil((endTime.getTime() - startTime.getTime()) / (1000 * 60));
    
    // Call end-call API
    const response = await fetch('/api/calls/end-call', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.INTERNAL_API_TOKEN
      },
      body: JSON.stringify({
        callId: callInfo.id,
        totalDuration
      })
    });
    
    // Notify both parties
    const connections = getConnectionsByChannel(channelId);
    connections.forEach(connection => {
      connection.socket.send(JSON.stringify({
        type: 'call_ended',
        data: {
          reason: 'user_left',
          totalDuration,
          callId: callInfo.id
        }
      }));
    });
    
  } catch (error) {
    console.error('Error handling user left:', error);
  }
}
```

## Server Configuration

### Environment Variables
```env
JWT_SECRET=your_jwt_secret_key
WS_PORT=8080
API_BASE_URL=http://localhost:3000
AGORA_WEBHOOK_SECRET=your_agora_webhook_secret
```

### Dependencies
```json
{
  "ws": "^8.0.0",
  "jsonwebtoken": "^9.0.0",
  "express": "^4.18.0",
  "node-fetch": "^3.0.0"
}
```

## Security Considerations

1. **JWT Token Validation**: All WebSocket connections must provide valid JWT tokens
2. **Token Expiration**: Implement token refresh mechanism for long sessions
3. **Rate Limiting**: Limit connection attempts and message frequency
4. **Webhook Verification**: Verify Agora webhook signatures
5. **CORS Configuration**: Configure WebSocket CORS for production

## Error Handling

### Connection Errors
- Invalid token: Close connection with code 1008
- Professional offline: Send error message to user
- Call already in progress: Reject new call requests

### API Errors
- Start call failure: Notify both parties of failure
- End call failure: Log error but continue with cleanup

## Monitoring & Logging

- Log all connection events
- Track call success/failure rates
- Monitor WebSocket connection counts
- Alert on webhook delivery failures

## Deployment Notes

- Use PM2 or similar process manager
- Configure load balancer for WebSocket connections
- Set up health check endpoints
- Configure SSL/TLS for production WebSocket connections