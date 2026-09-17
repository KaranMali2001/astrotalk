import { WebSocketConnection } from '../types';
import { logger } from '../utils';

export class ConnectionManager {
  private connections: Map<string, WebSocketConnection> = new Map();

  addConnection(connection: WebSocketConnection): void {
    this.connections.set(connection.userId, connection);
    logger.info(`Connection added for ${connection.role} user: ${connection.userId}`);
    
    // If professional, broadcast their online status
    if (connection.role === 'PROFESSIONAL') {
      this.broadcastProfessionalStatus(connection.userId, true);
    }
  }

  removeConnection(userId: string): void {
    const connection = this.connections.get(userId);
    if (connection) {
      // If professional, broadcast offline status
      if (connection.role === 'PROFESSIONAL') {
        this.broadcastProfessionalStatus(userId, false);
      }
      
      this.connections.delete(userId);
      logger.info(`Connection removed for user: ${userId}`);
    }
  }

  findConnection(userId: string, role?: "USER" | "PROFESSIONAL"): WebSocketConnection | undefined {
    const connection = this.connections.get(userId);
    if (connection && role && connection.role !== role) {
      return undefined;
    }
    return connection;
  }

  getConnectionsByChannel(channelId: string): WebSocketConnection[] {
    return Array.from(this.connections.values()).filter(
      conn => conn.agoraRoomId === channelId
    );
  }

  updateConnectionChannel(userId: string, channelId: string, callId?: string): void {
    const connection = this.connections.get(userId);
    if (connection) {
      connection.agoraRoomId = channelId;
      if (callId) {
        connection.roomId = callId;
      }
      logger.info(`Updated connection channel for ${connection.role} ${userId}: ${channelId}`);
    }
  }

  getConnectionsByCall(userId: string, professionalId: string): WebSocketConnection[] {
    const connections: WebSocketConnection[] = [];
    const userConn = this.findConnection(userId, 'USER');
    const profConn = this.findConnection(professionalId, 'PROFESSIONAL');
    if (userConn) connections.push(userConn);
    if (profConn) connections.push(profConn);
    return connections;
  }

  broadcastProfessionalStatus(professionalId: string, isOnline: boolean): void {
    // This could be extended to notify relevant users about professional online status
    logger.info(`Professional ${professionalId} is now ${isOnline ? 'online' : 'offline'}`);
    
    // Here you could implement logic to notify users who have shown interest in this professional
    // or broadcast to a specific room/channel if needed
  }

  getAllConnections(): WebSocketConnection[] {
    return Array.from(this.connections.values());
  }

  getConnectionsCount(): number {
    return this.connections.size;
  }

  getProfessionalConnections(): WebSocketConnection[] {
    return Array.from(this.connections.values()).filter(
      conn => conn.role === 'PROFESSIONAL'
    );
  }

  getUserConnections(): WebSocketConnection[] {
    return Array.from(this.connections.values()).filter(
      conn => conn.role === 'USER'
    );
  }
}

export const connectionManager = new ConnectionManager();