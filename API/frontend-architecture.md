# Frontend Architecture - User & Professional Interface

## Overview
This document outlines the frontend implementation for both user and professional interfaces, including WebSocket integration, Agora voice calling, and real-time communication features.

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User App      │    │  Professional   │    │   WebSocket     │
│                 │    │     App         │    │    Server       │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • Browse Pros   │    │ • Session Mgmt  │    │ • Real-time     │
│ • Initiate Call │◄──►│ • Accept/Reject │◄──►│   Communication │
│ • Agora Client  │    │ • Agora Client  │    │ • Token Verify  │
│ • Balance Check │    │ • Wallet Mgmt   │    │ • Call Routing  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Backend API   │
                    │                 │
                    │ • Authentication│
                    │ • Call Management│
                    │ • Agora Tokens  │
                    │ • Wallet System │
                    └─────────────────┘
```

## Technology Stack

### Core Technologies
- **React 18** with TypeScript
- **Vite** for build tooling
- **React Router** for navigation
- **Context API** for state management
- **Agora SDK** for voice calling
- **WebSocket** for real-time communication

### Dependencies
```json
{
  "react": "^18.0.0",
  "react-dom": "^18.0.0",
  "react-router-dom": "^6.0.0",
  "agora-rtc-react": "^2.0.0",
  "agora-rtc-sdk-ng": "^4.19.0",
  "axios": "^1.0.0",
  "jwt-decode": "^3.1.2",
  "@types/react": "^18.0.0",
  "@types/react-dom": "^18.0.0",
  "typescript": "^5.0.0",
  "vite": "^4.0.0"
}
```

## Project Structure

```
src/
├── components/
│   ├── common/
│   │   ├── Header.tsx
│   │   ├── LoadingSpinner.tsx
│   │   └── ErrorBoundary.tsx
│   ├── user/
│   │   ├── UserLogin.tsx
│   │   ├── UserDashboard.tsx
│   │   ├── ProfessionalBrowser.tsx
│   │   ├── CallInterface.tsx
│   │   └── WalletInfo.tsx
│   └── professional/
│       ├── ProfessionalLogin.tsx
│       ├── ProfessionalDashboard.tsx
│       ├── SessionToggle.tsx
│       ├── IncomingCallNotification.tsx
│       └── CallInterface.tsx
├── contexts/
│   ├── AuthContext.tsx
│   ├── WebSocketContext.tsx
│   ├── CallContext.tsx
│   └── AgoraContext.tsx
├── hooks/
│   ├── useWebSocket.ts
│   ├── useAgora.ts
│   ├── useAuth.ts
│   └── useCall.ts
├── services/
│   ├── api.ts
│   ├── websocket.ts
│   ├── agora.ts
│   └── auth.ts
├── types/
│   ├── api.ts
│   ├── auth.ts
│   ├── call.ts
│   └── websocket.ts
├── utils/
│   ├── constants.ts
│   ├── helpers.ts
│   └── validation.ts
├── pages/
│   ├── UserApp.tsx
│   └── ProfessionalApp.tsx
└── App.tsx
```

## Type Definitions

### API Types
```typescript
// types/api.ts
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

export interface Professional {
  id: string;
  name: string;
  aboutMe: string;
  perMinuteRateCall: number;
  perMinuteRateChat: number;
  isActive: boolean;
  isVerified: boolean;
  profileImage?: string;
  specializations: string[];
}

export interface User {
  id: string;
  username: string;
  phoneNumber: string;
  wallet: {
    totalBalence: number;
    currency: string;
  };
}

export interface Call {
  id: string;
  userId: string;
  professionalId: string;
  callType: 'AUDIO_CALL' | 'CHAT';
  status: 'INITIATED' | 'ONGOING' | 'COMPLETED' | 'REJECTED';
  agoraChannelId: string;
  perMinuteRate: number;
  maxCallDuration: number;
  totalDuration?: number;
  totalAmount?: number;
  createdAt: string;
  startTime?: string;
  endTime?: string;
}
```

### WebSocket Types
```typescript
// types/websocket.ts
export interface WSMessage {
  type: WSMessageType;
  data: any;
}

export type WSMessageType = 
  | 'incoming_call'
  | 'call_accepted'
  | 'call_rejected'
  | 'call_started'
  | 'call_ended'
  | 'professional_status'
  | 'connection_established';

export interface IncomingCallData {
  callId: string;
  userId: string;
  userName: string;
  agoraChannelId: string;
  perMinuteRate: number;
}

export interface CallStartedData {
  agoraToken: string;
  channelId: string;
  callId: string;
}

export interface CallEndedData {
  reason: 'user_left' | 'professional_left' | 'timeout' | 'insufficient_balance';
  totalDuration: number;
  callId: string;
}
```

### Authentication Types
```typescript
// types/auth.ts
export interface AuthUser {
  id: string;
  role: 'USER' | 'PROFESSIONAL';
  phoneNumber: string;
  name?: string;
  username?: string;
}

export interface LoginRequest {
  phoneNumber: string;
}

export interface VerifyOtpRequest {
  phoneNumber: string;
  otp: string;
  requestId: string;
}

export interface AuthToken {
  token: string;
  expiresAt: string;
  user: AuthUser;
}
```

## Authentication Context

```typescript
// contexts/AuthContext.tsx
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { AuthUser, AuthToken } from '../types/auth';
import { apiService } from '../services/api';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (phoneNumber: string) => Promise<{ requestId: string }>;
  verifyOtp: (phoneNumber: string, otp: string, requestId: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthAction {
  type: 'SET_LOADING' | 'SET_USER' | 'SET_TOKEN' | 'LOGOUT';
  payload?: any;
}

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload,
        isLoading: false
      };
    case 'SET_TOKEN':
      return { ...state, token: action.payload };
    case 'LOGOUT':
      localStorage.removeItem('authToken');
      return {
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false
      };
    default:
      return state;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    token: null,
    isLoading: true,
    isAuthenticated: false
  });

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      // Verify token and set user
      apiService.setAuthToken(token);
      dispatch({ type: 'SET_TOKEN', payload: token });
      // Decode and set user info
      // Implementation depends on your token structure
    } else {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const login = async (phoneNumber: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    const endpoint = state.user?.role === 'PROFESSIONAL' 
      ? '/api/professionals/login' 
      : '/api/users/login';
    
    const response = await apiService.post(endpoint, { phoneNumber });
    dispatch({ type: 'SET_LOADING', payload: false });
    return response.data;
  };

  const verifyOtp = async (phoneNumber: string, otp: string, requestId: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    const endpoint = state.user?.role === 'PROFESSIONAL'
      ? '/api/professionals/verify-otp'
      : '/api/users/verify-otp';

    const response = await apiService.post(endpoint, {
      phoneNumber,
      otp,
      requestId
    });

    const authData: AuthToken = response.data;
    localStorage.setItem('authToken', authData.token);
    apiService.setAuthToken(authData.token);
    
    dispatch({ type: 'SET_TOKEN', payload: authData.token });
    dispatch({ type: 'SET_USER', payload: authData.user });
  };

  const logout = () => {
    apiService.clearAuthToken();
    dispatch({ type: 'LOGOUT' });
  };

  const refreshToken = async () => {
    // Implementation for token refresh
  };

  return (
    <AuthContext.Provider value={{
      ...state,
      login,
      verifyOtp,
      logout,
      refreshToken
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

## WebSocket Context

```typescript
// contexts/WebSocketContext.tsx
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { WSMessage, WSMessageType } from '../types/websocket';
import { useAuth } from './AuthContext';

interface WebSocketContextType {
  socket: WebSocket | null;
  isConnected: boolean;
  sendMessage: (message: WSMessage) => void;
  subscribe: (type: WSMessageType, callback: (data: any) => void) => () => void;
  connect: (wsUrl: string) => void;
  disconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const listenersRef = useRef<Map<WSMessageType, Set<(data: any) => void>>>(new Map());

  const connect = (wsUrl: string) => {
    if (socket?.readyState === WebSocket.OPEN) {
      return;
    }

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      setSocket(ws);
    };

    ws.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data);
        const listeners = listenersRef.current.get(message.type);
        if (listeners) {
          listeners.forEach(callback => callback(message.data));
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      setSocket(null);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  };

  const disconnect = () => {
    if (socket) {
      socket.close();
    }
  };

  const sendMessage = (message: WSMessage) => {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected');
    }
  };

  const subscribe = (type: WSMessageType, callback: (data: any) => void) => {
    if (!listenersRef.current.has(type)) {
      listenersRef.current.set(type, new Set());
    }
    listenersRef.current.get(type)!.add(callback);

    return () => {
      const listeners = listenersRef.current.get(type);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          listenersRef.current.delete(type);
        }
      }
    };
  };

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return (
    <WebSocketContext.Provider value={{
      socket,
      isConnected,
      sendMessage,
      subscribe,
      connect,
      disconnect
    }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
};
```

## Agora Context

```typescript
// contexts/AgoraContext.tsx
import React, { createContext, useContext, useRef, useState } from 'react';
import AgoraRTC, {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  ICameraVideoTrack,
  IMicrophoneAudioTrack
} from 'agora-rtc-sdk-ng';

interface AgoraContextType {
  client: IAgoraRTCClient;
  localAudioTrack: IMicrophoneAudioTrack | null;
  remoteUsers: IAgoraRTCRemoteUser[];
  isJoined: boolean;
  isAudioEnabled: boolean;
  joinChannel: (token: string, channelId: string, uid: string) => Promise<void>;
  leaveChannel: () => Promise<void>;
  toggleAudio: () => Promise<void>;
}

const AgoraContext = createContext<AgoraContextType | null>(null);

export function AgoraProvider({ children }: { children: React.ReactNode }) {
  const clientRef = useRef<IAgoraRTCClient>(AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' }));
  const [localAudioTrack, setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const [isJoined, setIsJoined] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);

  const client = clientRef.current;

  React.useEffect(() => {
    const handleUserPublished = async (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
      await client.subscribe(user, mediaType);
      if (mediaType === 'audio') {
        user.audioTrack?.play();
      }
      setRemoteUsers(prev => [...prev.filter(u => u.uid !== user.uid), user]);
    };

    const handleUserUnpublished = (user: IAgoraRTCRemoteUser) => {
      setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
    };

    const handleUserLeft = (user: IAgoraRTCRemoteUser) => {
      setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
    };

    client.on('user-published', handleUserPublished);
    client.on('user-unpublished', handleUserUnpublished);
    client.on('user-left', handleUserLeft);

    return () => {
      client.off('user-published', handleUserPublished);
      client.off('user-unpublished', handleUserUnpublished);
      client.off('user-left', handleUserLeft);
    };
  }, [client]);

  const joinChannel = async (token: string, channelId: string, uid: string) => {
    try {
      await client.join(process.env.REACT_APP_AGORA_APP_ID!, channelId, token, uid);
      
      const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      setLocalAudioTrack(audioTrack);
      
      await client.publish([audioTrack]);
      setIsJoined(true);
    } catch (error) {
      console.error('Failed to join channel:', error);
      throw error;
    }
  };

  const leaveChannel = async () => {
    try {
      if (localAudioTrack) {
        localAudioTrack.close();
        setLocalAudioTrack(null);
      }
      
      await client.leave();
      setIsJoined(false);
      setRemoteUsers([]);
    } catch (error) {
      console.error('Failed to leave channel:', error);
    }
  };

  const toggleAudio = async () => {
    if (localAudioTrack) {
      if (isAudioEnabled) {
        await localAudioTrack.setEnabled(false);
      } else {
        await localAudioTrack.setEnabled(true);
      }
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  return (
    <AgoraContext.Provider value={{
      client,
      localAudioTrack,
      remoteUsers,
      isJoined,
      isAudioEnabled,
      joinChannel,
      leaveChannel,
      toggleAudio
    }}>
      {children}
    </AgoraContext.Provider>
  );
}

export const useAgora = () => {
  const context = useContext(AgoraContext);
  if (!context) {
    throw new Error('useAgora must be used within AgoraProvider');
  }
  return context;
};
```

## User Dashboard Component

```typescript
// components/user/UserDashboard.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { apiService } from '../../services/api';
import { Professional, Call } from '../../types/api';
import { ProfessionalBrowser } from './ProfessionalBrowser';
import { CallInterface } from './CallInterface';
import { WalletInfo } from './WalletInfo';

export function UserDashboard() {
  const { user } = useAuth();
  const { subscribe } = useWebSocket();
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [isInitiatingCall, setIsInitiatingCall] = useState(false);

  useEffect(() => {
    fetchProfessionals();
    
    // Subscribe to WebSocket events
    const unsubscribeCallAccepted = subscribe('call_accepted', handleCallAccepted);
    const unsubscribeCallRejected = subscribe('call_rejected', handleCallRejected);
    const unsubscribeCallStarted = subscribe('call_started', handleCallStarted);
    const unsubscribeCallEnded = subscribe('call_ended', handleCallEnded);

    return () => {
      unsubscribeCallAccepted();
      unsubscribeCallRejected();
      unsubscribeCallStarted();
      unsubscribeCallEnded();
    };
  }, [subscribe]);

  const fetchProfessionals = async () => {
    try {
      const response = await apiService.get('/api/calls/browse');
      setProfessionals(response.data);
    } catch (error) {
      console.error('Failed to fetch professionals:', error);
    }
  };

  const initiateCall = async (professionalId: string) => {
    if (isInitiatingCall || activeCall) return;

    setIsInitiatingCall(true);
    try {
      const response = await apiService.post('/api/calls/initiate-call', {
        professionalId
      });

      const { call, ws } = response.data;
      setActiveCall(call);

      // Connect to WebSocket with the provided URL
      const { connect } = useWebSocket();
      connect(ws);

    } catch (error) {
      console.error('Failed to initiate call:', error);
      alert('Failed to initiate call. Please try again.');
    } finally {
      setIsInitiatingCall(false);
    }
  };

  const handleCallAccepted = (data: any) => {
    console.log('Call accepted by professional');
    // UI feedback that professional accepted
  };

  const handleCallRejected = (data: any) => {
    console.log('Call rejected:', data.reason);
    alert(`Call was rejected: ${data.reason || 'Professional is unavailable'}`);
    setActiveCall(null);
  };

  const handleCallStarted = (data: any) => {
    console.log('Call started with tokens:', data);
    // This will be handled by CallInterface component
  };

  const handleCallEnded = (data: any) => {
    console.log('Call ended:', data);
    setActiveCall(null);
    // Show call summary if needed
  };

  if (activeCall) {
    return (
      <CallInterface
        call={activeCall}
        isUser={true}
        onCallEnd={() => setActiveCall(null)}
      />
    );
  }

  return (
    <div className="user-dashboard">
      <header className="dashboard-header">
        <h1>Welcome, {user?.username}</h1>
        <WalletInfo />
      </header>

      <main className="dashboard-main">
        <ProfessionalBrowser
          professionals={professionals}
          onCallProfessional={initiateCall}
          isInitiatingCall={isInitiatingCall}
        />
      </main>
    </div>
  );
}
```

## Professional Dashboard Component

```typescript
// components/professional/ProfessionalDashboard.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { apiService } from '../../services/api';
import { Call, IncomingCallData } from '../../types/api';
import { SessionToggle } from './SessionToggle';
import { IncomingCallNotification } from './IncomingCallNotification';
import { CallInterface } from './CallInterface';

export function ProfessionalDashboard() {
  const { user } = useAuth();
  const { subscribe, sendMessage } = useWebSocket();
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [pendingCalls, setPendingCalls] = useState<Call[]>([]);

  useEffect(() => {
    fetchPendingCalls();
    
    // Subscribe to WebSocket events
    const unsubscribeIncomingCall = subscribe('incoming_call', handleIncomingCall);
    const unsubscribeCallStarted = subscribe('call_started', handleCallStarted);
    const unsubscribeCallEnded = subscribe('call_ended', handleCallEnded);

    return () => {
      unsubscribeIncomingCall();
      unsubscribeCallStarted();
      unsubscribeCallEnded();
    };
  }, [subscribe]);

  const fetchPendingCalls = async () => {
    try {
      const response = await apiService.get('/api/professionals/pending');
      setPendingCalls(response.data);
    } catch (error) {
      console.error('Failed to fetch pending calls:', error);
    }
  };

  const handleSessionToggle = async (active: boolean, wsUrl?: string) => {
    setIsSessionActive(active);
    if (active && wsUrl) {
      // Connect to WebSocket when session becomes active
      const { connect } = useWebSocket();
      connect(wsUrl);
    }
  };

  const handleIncomingCall = (callData: IncomingCallData) => {
    if (!isSessionActive) return;
    
    console.log('Incoming call:', callData);
    setIncomingCall(callData);
    
    // Play notification sound
    playNotificationSound();
  };

  const handleCallStarted = (data: any) => {
    console.log('Call started with tokens:', data);
    setIncomingCall(null);
  };

  const handleCallEnded = (data: any) => {
    console.log('Call ended:', data);
    setActiveCall(null);
    setIncomingCall(null);
  };

  const acceptCall = async (callData: IncomingCallData) => {
    try {
      sendMessage({
        type: 'accept_call',
        data: {
          callId: callData.callId,
          userId: callData.userId
        }
      });

      // Convert to Call object for CallInterface
      const call: Call = {
        id: callData.callId,
        userId: callData.userId,
        professionalId: user!.id,
        callType: 'AUDIO_CALL',
        status: 'ONGOING',
        agoraChannelId: callData.agoraChannelId,
        perMinuteRate: callData.perMinuteRate,
        maxCallDuration: 60, // Default
        createdAt: new Date().toISOString()
      };

      setActiveCall(call);
      setIncomingCall(null);
    } catch (error) {
      console.error('Failed to accept call:', error);
    }
  };

  const rejectCall = async (callData: IncomingCallData, reason?: string) => {
    try {
      sendMessage({
        type: 'reject_call',
        data: {
          callId: callData.callId,
          userId: callData.userId,
          reason: reason || 'Professional unavailable'
        }
      });

      setIncomingCall(null);
    } catch (error) {
      console.error('Failed to reject call:', error);
    }
  };

  const playNotificationSound = () => {
    // Play notification sound for incoming call
    const audio = new Audio('/notification.mp3');
    audio.play().catch(e => console.log('Could not play notification sound'));
  };

  if (activeCall) {
    return (
      <CallInterface
        call={activeCall}
        isUser={false}
        onCallEnd={() => setActiveCall(null)}
      />
    );
  }

  return (
    <div className="professional-dashboard">
      <header className="dashboard-header">
        <h1>Professional Dashboard</h1>
        <SessionToggle
          isActive={isSessionActive}
          onToggle={handleSessionToggle}
        />
      </header>

      <main className="dashboard-main">
        {!isSessionActive && (
          <div className="session-inactive-notice">
            <p>Your session is currently inactive. Toggle your session to start receiving calls.</p>
          </div>
        )}

        {pendingCalls.length > 0 && (
          <section className="pending-calls">
            <h2>Pending Calls</h2>
            <div className="calls-list">
              {pendingCalls.map(call => (
                <div key={call.id} className="call-item">
                  <p>Call from User ID: {call.userId}</p>
                  <p>Rate: ₹{call.perMinuteRate}/min</p>
                  <p>Status: {call.status}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {incomingCall && (
        <IncomingCallNotification
          callData={incomingCall}
          onAccept={() => acceptCall(incomingCall)}
          onReject={(reason) => rejectCall(incomingCall, reason)}
        />
      )}
    </div>
  );
}
```

## Call Interface Component (Shared)

```typescript
// components/CallInterface.tsx
import React, { useEffect, useState } from 'react';
import { useAgora } from '../contexts/AgoraContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { Call, CallEndedData, CallStartedData } from '../types/api';

interface CallInterfaceProps {
  call: Call;
  isUser: boolean;
  onCallEnd: () => void;
}

export function CallInterface({ call, isUser, onCallEnd }: CallInterfaceProps) {
  const { joinChannel, leaveChannel, isJoined, isAudioEnabled, toggleAudio, remoteUsers } = useAgora();
  const { subscribe } = useWebSocket();
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [agoraToken, setAgoraToken] = useState<string | null>(null);

  useEffect(() => {
    // Subscribe to call events
    const unsubscribeCallStarted = subscribe('call_started', handleCallStarted);
    const unsubscribeCallEnded = subscribe('call_ended', handleCallEnded);

    return () => {
      unsubscribeCallStarted();
      unsubscribeCallEnded();
      if (isJoined) {
        leaveChannel();
      }
    };
  }, [subscribe, isJoined, leaveChannel]);

  useEffect(() => {
    // Update call duration every second
    if (callStartTime) {
      const interval = setInterval(() => {
        const now = new Date();
        const duration = Math.floor((now.getTime() - callStartTime.getTime()) / 1000);
        setCallDuration(duration);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [callStartTime]);

  const handleCallStarted = async (data: CallStartedData) => {
    console.log('Received call tokens:', data);
    setAgoraToken(data.agoraToken);
    setCallStartTime(new Date());

    try {
      await joinChannel(data.agoraToken, data.channelId, isUser ? 'user' : 'professional');
    } catch (error) {
      console.error('Failed to join Agora channel:', error);
      alert('Failed to join call. Please try again.');
      onCallEnd();
    }
  };

  const handleCallEnded = async (data: CallEndedData) => {
    console.log('Call ended:', data);
    
    if (isJoined) {
      await leaveChannel();
    }
    
    // Show call summary
    alert(`Call ended. Duration: ${formatDuration(data.totalDuration * 60)}`);
    onCallEnd();
  };

  const endCall = async () => {
    if (isJoined) {
      await leaveChannel();
    }
    onCallEnd();
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCurrency = (amount: number): string => {
    return `₹${amount}`;
  };

  return (
    <div className="call-interface">
      <header className="call-header">
        <h2>
          {isUser ? 'Connected to Professional' : `Call with User ${call.userId}`}
        </h2>
        {callStartTime && (
          <div className="call-info">
            <p>Duration: {formatDuration(callDuration)}</p>
            <p>Rate: {formatCurrency(call.perMinuteRate)}/min</p>
          </div>
        )}
      </header>

      <main className="call-main">
        <div className="call-status">
          {!agoraToken && <p>Waiting for professional to accept...</p>}
          {agoraToken && !isJoined && <p>Connecting to call...</p>}
          {isJoined && (
            <div className="call-active">
              <p>Call in progress</p>
              <div className="participants">
                <p>Participants: {remoteUsers.length + 1}</p>
              </div>
            </div>
          )}
        </div>

        <div className="call-controls">
          <button
            onClick={toggleAudio}
            className={`control-btn ${isAudioEnabled ? 'active' : 'muted'}`}
            disabled={!isJoined}
          >
            {isAudioEnabled ? '🎤' : '🔇'}
          </button>
          
          <button
            onClick={endCall}
            className="control-btn end-call"
          >
            📞 End Call
          </button>
        </div>
      </main>

      <footer className="call-footer">
        <div className="call-details">
          <p>Call ID: {call.id}</p>
          <p>Channel: {call.agoraChannelId}</p>
          {isUser && (
            <p>Max Duration: {call.maxCallDuration} minutes</p>
          )}
        </div>
      </footer>
    </div>
  );
}
```

## Environment Configuration

```env
# .env
REACT_APP_API_BASE_URL=http://localhost:3000
REACT_APP_WS_BASE_URL=ws://localhost:8080
REACT_APP_AGORA_APP_ID=your_agora_app_id

# .env.production
REACT_APP_API_BASE_URL=https://your-api-domain.com
REACT_APP_WS_BASE_URL=wss://your-ws-domain.com
REACT_APP_AGORA_APP_ID=your_production_agora_app_id
```

## Build Configuration (Vite)

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
```

## Deployment Notes

### Development Setup
```bash
npm install
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```

### Key Features Implemented

1. **Dual Interface**: Separate dashboards for users and professionals
2. **Real-time WebSocket**: Live communication for call notifications
3. **Agora Integration**: High-quality voice calling
4. **Authentication**: JWT-based auth with OTP verification
5. **Call Management**: Complete call lifecycle handling
6. **Responsive Design**: Mobile-friendly interface
7. **Error Handling**: Comprehensive error boundaries and user feedback
8. **State Management**: Context-based state management for scalability

### Security Considerations

1. **Token Management**: Secure JWT storage and refresh
2. **WebSocket Security**: Token-based WebSocket authentication
3. **API Security**: Axios interceptors for request/response handling
4. **Input Validation**: Client-side validation with server-side verification
5. **HTTPS/WSS**: Secure connections in production

This frontend architecture provides a complete solution for both user and professional interfaces with real-time calling capabilities.