import { WebSocketServer, WebSocket } from 'ws';
import logger from '@/lib/logger';

export interface WSMessage {
  type: string;
  data?: any;
  sessionId?: string;
}

/**
 * WebSocket server manager
 */
export class WebSocketServerManager {
  private wss: WebSocketServer | null = null;
  private connections: Map<string, WebSocket> = new Map();

  /**
   * Initialize WebSocket server
   */
  initialize(server: any, path: string = '/api/ws') {
    if (this.wss) {
      return this.wss;
    }

    this.wss = new WebSocketServer({ server, path });

    this.wss.on('connection', (ws: WebSocket, req) => {
      this.handleConnection(ws, req);
    });

    logger.info('WebSocket server initialized', { path });
    return this.wss;
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket, req: any) {
    const url = new URL(req.url || '', 'http://localhost');
    const sessionId = url.searchParams.get('sessionId');

    if (!sessionId) {
      ws.close(1008, 'Session ID required');
      return;
    }

    // Store connection
    this.connections.set(sessionId, ws);
    (ws as any).sessionId = sessionId;

    ws.on('message', (message: Buffer) => {
      this.handleMessage(ws, sessionId, message);
    });

    ws.on('close', () => {
      this.connections.delete(sessionId);
      logger.info('WebSocket connection closed', { sessionId });
    });

    ws.on('error', (error) => {
      logger.error('WebSocket error', {
        error: error.message,
        sessionId,
      });
    });

    // Send connection confirmation
    this.send(ws, {
      type: 'connected',
      data: { sessionId },
    });

    logger.info('WebSocket connection established', { sessionId });
  }

  /**
   * Handle incoming message
   */
  private async handleMessage(ws: WebSocket, sessionId: string, message: Buffer) {
    try {
      const data = JSON.parse(message.toString()) as WSMessage;

      switch (data.type) {
        case 'message':
          await this.handleChatMessage(ws, sessionId, data);
          break;

        case 'progress':
          await this.handleProgressUpdate(ws, sessionId, data);
          break;

        case 'navigate':
          await this.handleNavigation(ws, sessionId, data);
          break;

        case 'ping':
          this.send(ws, { type: 'pong' });
          break;

        default:
          this.send(ws, {
            type: 'error',
            data: { message: `Unknown message type: ${data.type}` },
          });
      }
    } catch (error) {
      logger.error('Error handling WebSocket message', {
        error: error instanceof Error ? error.message : String(error),
        sessionId,
      });
      this.send(ws, {
        type: 'error',
        data: { message: 'Invalid message format' },
      });
    }
  }

  /**
   * Handle chat message
   */
  private async handleChatMessage(ws: WebSocket, sessionId: string, data: WSMessage) {
    // This would integrate with AI tutor service
    this.send(ws, {
      type: 'message',
      data: {
        content: 'Message received',
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Handle progress update
   */
  private async handleProgressUpdate(ws: WebSocket, sessionId: string, data: WSMessage) {
    // This would integrate with progress tracker service
    this.send(ws, {
      type: 'progress_updated',
      data: { success: true },
    });
  }

  /**
   * Handle narrative navigation
   */
  private async handleNavigation(ws: WebSocket, sessionId: string, data: WSMessage) {
    // This would integrate with session service
    this.send(ws, {
      type: 'navigation',
      data: { nodeId: data.data?.nodeId },
    });
  }

  /**
   * Send message to WebSocket
   */
  send(ws: WebSocket, message: WSMessage) {
    // WebSocket.OPEN = 1
    if (ws.readyState === 1) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Send message to specific session
   */
  sendToSession(sessionId: string, message: WSMessage) {
    const ws = this.connections.get(sessionId);
    if (ws) {
      this.send(ws, message);
    }
  }

  /**
   * Broadcast message to all connections
   */
  broadcast(message: WSMessage) {
    this.connections.forEach((ws) => {
      this.send(ws, message);
    });
  }

  /**
   * Close WebSocket server
   */
  close() {
    if (this.wss) {
      this.wss.close();
      this.wss = null;
      this.connections.clear();
      logger.info('WebSocket server closed');
    }
  }
}

// Singleton instance
export const wsServerManager = new WebSocketServerManager();
