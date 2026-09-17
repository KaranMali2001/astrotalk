import { env } from '@/config/env';
import logger from '@/utils/logger';
import axios, { AxiosError, AxiosInstance } from 'axios';
const wsServerUrl = env.WS_SERVER_URL;
/**
 * Payload for notifying WebSocket server about call end
 */
export interface NotifyCallEndedPayload {
  channelId: string;
  callId: string;
  userId: string;
  professionalId: string;
  reason: string;
  totalDuration: number;
}

/**
 * Create axios instance with interceptors for WebSocket server communication
 */
const createWebSocketAxiosInstance = (): AxiosInstance => {
  const axiosInstance = axios.create({
    baseURL: wsServerUrl,
    timeout: 10000, // 10 second timeout for WebSocket notifications
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor: Automatically add x-internal-secret header
  axiosInstance.interceptors.request.use(
    config => {
      config.headers['x-internal-secret'] = env.JWT_INTERNAL_SECRET;
      return config;
    },
    error => {
      logger.error('WebSocket service request interceptor error', { error });
      return Promise.reject(error);
    }
  );

  // Response interceptor: Centralized error logging
  axiosInstance.interceptors.response.use(
    response => {
      // Success - no action needed, just pass through
      return response;
    },
    (error: AxiosError) => {
      // Log error details for debugging
      logger.error('WebSocket service response error', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
      });
      return Promise.reject(error);
    }
  );

  return axiosInstance;
};

// Create axios instance once at module load
const wsAxiosInstance = createWebSocketAxiosInstance();

export const notifyCallEnded = async (payload: NotifyCallEndedPayload): Promise<void> => {
  try {
    await wsAxiosInstance.post('/internal/notify-call-ended', payload);
    logger.info('WebSocket notification sent for call end', {
      callId: payload.callId,
      channelId: payload.channelId,
    });
  } catch (error) {
    // Log error but don't throw - WebSocket notification is non-blocking
    // The call is already processed in the database, so we don't want to fail the request
    logger.error('Failed to send WebSocket notification for call end', {
      error,
      callId: payload.callId,
      channelId: payload.channelId,
    });
  }
};

// Export as websocketService for backward compatibility
export const websocketService = {
  notifyCallEnded,
};
