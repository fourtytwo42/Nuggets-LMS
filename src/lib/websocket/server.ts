import { WebSocketServer, WebSocket } from 'ws';
import { verifyToken } from '@/lib/auth/jwt';
import { prisma } from '@/lib/prisma';
import { sessionService } from '@/services/learning-delivery/session-service';
import { aiTutorService } from '@/services/learning-delivery/ai-tutor';
import { progressTrackerService } from '@/services/learning-delivery/progress-tracker';
import { voiceService } from '@/services/learning-delivery/voice-service';
import logger from '@/lib/logger';

export interface WSMessage {
  event: string;
  data?: any;
  sessionId?: string;
}

interface AuthenticatedWebSocket extends WebSocket {
  sessionId?: string;
  userId?: string;
  organizationId?: string;
}

/**
 * WebSocket server manager
 */
export class WebSocketServerManager {
  private wss: WebSocketServer | null = null;
  private connections: Map<string, AuthenticatedWebSocket> = new Map();

  /**
   * Initialize WebSocket server
   */
  initialize(server: any, path: string = '/api/ws') {
    if (this.wss) {
      return this.wss;
    }

    this.wss = new WebSocketServer({ server, path });

    this.wss.on('connection', (ws: WebSocket, req) => {
      this.handleConnection(ws as AuthenticatedWebSocket, req);
    });

    logger.info('WebSocket server initialized', { path });
    return this.wss;
  }

  /**
   * Handle new WebSocket connection
   */
  private async handleConnection(ws: AuthenticatedWebSocket, req: any) {
    try {
      const url = new URL(req.url || '', 'http://localhost');
      const sessionId = url.searchParams.get('sessionId');
      const token = url.searchParams.get('token');

      if (!sessionId) {
        ws.close(1008, 'Session ID required');
        return;
      }

      if (!token) {
        ws.close(1008, 'Authentication token required');
        return;
      }

      // Verify token
      let user;
      try {
        user = verifyToken(token);
      } catch (error) {
        ws.close(1008, 'Invalid authentication token');
        return;
      }

      // Verify session exists and belongs to user
      const learner = await prisma.learner.findFirst({
        where: {
          userId: user.userId,
          organizationId: user.organizationId,
        },
      });

      if (!learner) {
        ws.close(1008, 'Learner profile not found');
        return;
      }

      const session = await prisma.session.findFirst({
        where: {
          id: sessionId,
          learnerId: learner.id,
          organizationId: user.organizationId,
        },
      });

      if (!session) {
        ws.close(1008, 'Session not found or access denied');
        return;
      }

      // Store connection metadata
      ws.sessionId = sessionId;
      ws.userId = user.userId;
      ws.organizationId = user.organizationId;
      this.connections.set(sessionId, ws);

      ws.on('message', (message: Buffer) => {
        this.handleMessage(ws, message);
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

      // Send connection confirmation with session data
      const sessionData = await sessionService.getSession(sessionId, user.organizationId);

      // Get current node details if available
      let currentNode = null;
      if (sessionData?.currentNodeId) {
        const node = await prisma.narrativeNode.findUnique({
          where: { id: sessionData.currentNodeId },
          include: {
            nugget: true,
          },
        });
        if (node) {
          currentNode = {
            id: node.id,
            nugget: node.nugget,
            choices: node.choices,
          };
        }
      }

      this.send(ws, {
        event: 'session:joined',
        data: {
          sessionId,
          currentNode,
        },
      });

      logger.info('WebSocket connection established', {
        sessionId,
        userId: user.userId,
        organizationId: user.organizationId,
      });
    } catch (error) {
      logger.error('Error establishing WebSocket connection', {
        error: error instanceof Error ? error.message : String(error),
      });
      ws.close(1011, 'Internal server error');
    }
  }

  /**
   * Handle incoming message
   */
  private async handleMessage(ws: AuthenticatedWebSocket, message: Buffer) {
    try {
      const data = JSON.parse(message.toString()) as WSMessage;

      if (!data.event) {
        this.send(ws, {
          event: 'error',
          data: { message: 'Missing event type' },
        });
        return;
      }

      switch (data.event) {
        case 'session:message':
          await this.handleChatMessage(ws, data);
          break;

        case 'session:choice':
          await this.handleChoice(ws, data);
          break;

        case 'session:voice:start':
          await this.handleVoiceStart(ws, data);
          break;

        case 'session:voice:data':
          await this.handleVoiceData(ws, data);
          break;

        case 'session:voice:stop':
        case 'session:voice:stopped':
          await this.handleVoiceStop(ws, data);
          break;

        case 'ping':
          this.send(ws, { event: 'pong' });
          break;

        default:
          this.send(ws, {
            event: 'error',
            data: { message: `Unknown event type: ${data.event}` },
          });
      }
    } catch (error) {
      logger.error('Error handling WebSocket message', {
        error: error instanceof Error ? error.message : String(error),
        sessionId: ws.sessionId,
      });
      this.send(ws, {
        event: 'error',
        data: { message: 'Invalid message format' },
      });
    }
  }

  /**
   * Handle chat message
   */
  private async handleChatMessage(ws: AuthenticatedWebSocket, data: WSMessage) {
    try {
      if (!ws.sessionId || !data.data?.content) {
        this.send(ws, {
          event: 'error',
          data: { message: 'Invalid message data' },
        });
        return;
      }

      // Get session
      const session = await prisma.session.findFirst({
        where: {
          id: ws.sessionId!,
          organizationId: ws.organizationId!,
        },
        include: {
          currentNode: {
            include: {
              nugget: true,
            },
          },
        },
      });

      if (!session) {
        this.send(ws, {
          event: 'error',
          data: { message: 'Session not found' },
        });
        return;
      }

      // Store user message
      const userMessage = await prisma.message.create({
        data: {
          sessionId: session.id,
          role: 'user',
          content: data.data.content,
        },
      });

      // Get conversation history
      const conversationHistory = await prisma.message.findMany({
        where: { sessionId: session.id },
        orderBy: { createdAt: 'asc' },
        take: 50,
      });

      const tutorMessages = conversationHistory.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: msg.createdAt,
      }));

      // Generate AI tutor response
      const aiResponse = await aiTutorService.generateResponse(
        session,
        data.data.content,
        tutorMessages
      );

      // Store AI response
      const assistantMessage = await prisma.message.create({
        data: {
          sessionId: session.id,
          role: 'assistant',
          content: aiResponse,
        },
      });

      // Update session last activity
      await prisma.session.update({
        where: { id: session.id },
        data: { lastActivity: new Date() },
      });

      // Send response to client
      this.send(ws, {
        event: 'session:message',
        data: {
          id: assistantMessage.id,
          role: assistantMessage.role,
          content: assistantMessage.content,
          createdAt: assistantMessage.createdAt,
        },
      });
    } catch (error) {
      logger.error('Error handling chat message', {
        error: error instanceof Error ? error.message : String(error),
        sessionId: ws.sessionId,
      });
      this.send(ws, {
        event: 'error',
        data: { message: 'Failed to process message' },
      });
    }
  }

  /**
   * Handle narrative choice
   */
  private async handleChoice(ws: AuthenticatedWebSocket, data: WSMessage) {
    try {
      if (!ws.sessionId || !data.data?.choiceId) {
        this.send(ws, {
          event: 'error',
          data: { message: 'Invalid choice data' },
        });
        return;
      }

      const session = await prisma.session.findFirst({
        where: {
          id: ws.sessionId,
          organizationId: ws.organizationId,
        },
        include: {
          currentNode: true,
        },
      });

      if (!session || !session.currentNode) {
        this.send(ws, {
          event: 'error',
          data: { message: 'Session or current node not found' },
        });
        return;
      }

      // Find the chosen next node
      const currentChoices = session.currentNode.choices as any[];
      const chosen = currentChoices.find((choice) => choice.id === data.data.choiceId);

      if (!chosen || !chosen.nextNodeId) {
        this.send(ws, {
          event: 'error',
          data: { message: 'Invalid choice or next node not found' },
        });
        return;
      }

      // Update session's current node
      await sessionService.updateCurrentNode(ws.sessionId, chosen.nextNodeId, data.data.choiceId);

      // Get updated session with new current node
      const updatedSession = await sessionService.getSession(ws.sessionId!, ws.organizationId!);

      // Get current node details
      let currentNode = null;
      if (updatedSession?.currentNodeId) {
        const node = await prisma.narrativeNode.findUnique({
          where: { id: updatedSession.currentNodeId },
          include: {
            nugget: true,
          },
        });
        if (node) {
          currentNode = {
            id: node.id,
            nugget: node.nugget,
            choices: node.choices,
          };
        }
      }

      // Send node update to client
      this.send(ws, {
        event: 'session:node:updated',
        data: {
          nodeId: chosen.nextNodeId,
          node: currentNode,
        },
      });
    } catch (error) {
      logger.error('Error handling choice', {
        error: error instanceof Error ? error.message : String(error),
        sessionId: ws.sessionId,
      });
      this.send(ws, {
        event: 'error',
        data: { message: 'Failed to process choice' },
      });
    }
  }

  /**
   * Handle voice start
   */
  private async handleVoiceStart(ws: AuthenticatedWebSocket, data: WSMessage) {
    try {
      if (!ws.sessionId) {
        this.send(ws, {
          event: 'error',
          data: { message: 'Session ID not found' },
        });
        return;
      }

      // Start voice session
      await voiceService.startVoiceSession(ws.sessionId);

      this.send(ws, {
        event: 'session:voice:started',
        data: { sessionId: ws.sessionId },
      });

      logger.info('Voice session started', { sessionId: ws.sessionId });
    } catch (error) {
      logger.error('Error starting voice session', {
        error: error instanceof Error ? error.message : String(error),
        sessionId: ws.sessionId,
      });
      this.send(ws, {
        event: 'error',
        data: { message: 'Failed to start voice session' },
      });
    }
  }

  /**
   * Handle voice data
   */
  private async handleVoiceData(ws: AuthenticatedWebSocket, data: WSMessage) {
    try {
      if (!ws.sessionId || !data.data?.audio) {
        this.send(ws, {
          event: 'error',
          data: { message: 'Invalid voice data' },
        });
        return;
      }

      // Get session
      const session = await prisma.session.findFirst({
        where: {
          id: ws.sessionId!,
          organizationId: ws.organizationId!,
        },
      });

      if (!session) {
        this.send(ws, {
          event: 'error',
          data: { message: 'Session not found' },
        });
        return;
      }

      // Process voice input and get voice response
      const voiceResponse = await voiceService.processVoiceInput(
        session,
        {
          audio: data.data.audio,
          format: data.data.format || 'webm',
        },
        []
      );

      // Send voice response to client
      this.send(ws, {
        event: 'session:voice:response',
        data: {
          audio: voiceResponse.audio,
          text: voiceResponse.text,
          format: voiceResponse.format,
        },
      });

      // Also send as a regular message for chat history
      this.send(ws, {
        event: 'session:message',
        data: {
          role: 'assistant',
          content: voiceResponse.text,
          audio: voiceResponse.audio,
        },
      });
    } catch (error) {
      logger.error('Error handling voice data', {
        error: error instanceof Error ? error.message : String(error),
        sessionId: ws.sessionId,
      });
      this.send(ws, {
        event: 'error',
        data: { message: 'Failed to process voice data' },
      });
    }
  }

  /**
   * Handle voice stop
   */
  private async handleVoiceStop(ws: AuthenticatedWebSocket, data: WSMessage) {
    try {
      if (!ws.sessionId) {
        this.send(ws, {
          event: 'error',
          data: { message: 'Session ID not found' },
        });
        return;
      }

      // Stop voice session
      await voiceService.stopVoiceSession(ws.sessionId);

      this.send(ws, {
        event: 'session:voice:stopped',
        data: { sessionId: ws.sessionId },
      });

      logger.info('Voice session stopped', { sessionId: ws.sessionId });
    } catch (error) {
      logger.error('Error stopping voice session', {
        error: error instanceof Error ? error.message : String(error),
        sessionId: ws.sessionId,
      });
      this.send(ws, {
        event: 'error',
        data: { message: 'Failed to stop voice session' },
      });
    }
  }

  /**
   * Send message to WebSocket
   */
  send(ws: AuthenticatedWebSocket, message: WSMessage) {
    if (ws.readyState === WebSocket.OPEN) {
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
   * Notify session progress update
   */
  async notifyProgressUpdate(sessionId: string, learnerId: string) {
    try {
      const progress = await progressTrackerService.getProgress(learnerId);
      this.sendToSession(sessionId, {
        event: 'session:progress:updated',
        data: {
          concepts: progress.recentProgress.map((p) => ({
            concept: p.concept,
            masteryLevel: p.mastery,
          })),
          knowledgeGaps: progress.knowledgeGaps,
        },
      });
    } catch (error) {
      logger.error('Error notifying progress update', {
        error: error instanceof Error ? error.message : String(error),
        sessionId,
      });
    }
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
