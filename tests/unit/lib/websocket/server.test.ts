import { WebSocketServerManager, wsServerManager } from '@/lib/websocket/server';
import logger from '@/lib/logger';

const mockWebSocketServer = jest.fn();
const mockOn = jest.fn();
const mockClose = jest.fn();

jest.mock('ws', () => {
  const actualWs = jest.requireActual('ws');
  const mockWS = jest.fn();
  return {
    ...actualWs,
    WebSocketServer: mockWS,
  };
});

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('WebSocket Server Manager', () => {
  let mockWss: any;
  let mockServer: any;
  let manager: WebSocketServerManager;

  beforeEach(() => {
    jest.clearAllMocks();
    mockWss = {
      on: jest.fn(),
      clients: new Set(),
      close: jest.fn(),
    };
    mockServer = {};
    const wsModule = require('ws');
    wsModule.WebSocketServer.mockImplementation(() => mockWss);
    manager = new WebSocketServerManager();
  });

  it('should initialize WebSocket server', () => {
    const wsModule = require('ws');
    const result = manager.initialize(mockServer, '/api/ws');
    expect(wsModule.WebSocketServer).toHaveBeenCalledWith({ server: mockServer, path: '/api/ws' });
    expect(mockWss.on).toHaveBeenCalledWith('connection', expect.any(Function));
    expect(result).toBe(mockWss);
  });

  it('should not reinitialize if already initialized', () => {
    const wsModule = require('ws');
    manager.initialize(mockServer);
    const callCount = wsModule.WebSocketServer.mock.calls.length;
    manager.initialize(mockServer);
    expect(wsModule.WebSocketServer.mock.calls.length).toBe(callCount);
  });

  it('should send message to specific session', () => {
    const mockWs = {
      readyState: 1, // WebSocket.OPEN = 1
      send: jest.fn(),
    };
    (manager as any).connections.set('session-123', mockWs);

    manager.sendToSession('session-123', { type: 'test', data: 'message' });
    expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({ type: 'test', data: 'message' }));
  });

  it('should not send to non-existent session', () => {
    const sendSpy = jest.spyOn(manager as any, 'send');
    manager.sendToSession('non-existent', { type: 'test' });
    expect(sendSpy).not.toHaveBeenCalled();
    sendSpy.mockRestore();
  });

  it('should handle connection without sessionId', () => {
    const mockWs = {
      close: jest.fn(),
      on: jest.fn(),
    };

    manager.initialize(mockServer);
    const connectionHandler = mockWss.on.mock.calls.find(
      (call: any[]) => call[0] === 'connection'
    )?.[1];

    if (connectionHandler) {
      // Create a URL without sessionId
      const req = { url: '/' };
      connectionHandler(mockWs, req);
      // Connection should be closed if no sessionId
      expect(mockWs.close).toHaveBeenCalledWith(1008, 'Session ID required');
    }
  });

  it('should handle message types', () => {
    const mockWs = {
      readyState: 1, // WebSocket.OPEN = 1
      send: jest.fn(),
      on: jest.fn(),
    };

    manager.initialize(mockServer);
    const connectionHandler = mockWss.on.mock.calls.find(
      (call: any[]) => call[0] === 'connection'
    )?.[1];

    if (connectionHandler) {
      connectionHandler(mockWs, { url: '/?sessionId=test-123' });

      const messageHandler = mockWs.on.mock.calls.find((call: any[]) => call[0] === 'message')?.[1];

      if (messageHandler) {
        messageHandler(Buffer.from(JSON.stringify({ type: 'ping' })));
        expect(mockWs.send).toHaveBeenCalled();
      }
    }
  });

  it('should broadcast to all connections', () => {
    const mockWs1 = { readyState: 1, send: jest.fn() }; // WebSocket.OPEN = 1
    const mockWs2 = { readyState: 1, send: jest.fn() }; // WebSocket.OPEN = 1
    (manager as any).connections.set('session-1', mockWs1);
    (manager as any).connections.set('session-2', mockWs2);

    const message = { type: 'broadcast', data: 'message' };
    manager.broadcast(message);
    // The send method checks readyState and stringifies the message
    expect(mockWs1.send).toHaveBeenCalledWith(JSON.stringify(message));
    expect(mockWs2.send).toHaveBeenCalledWith(JSON.stringify(message));
  });

  it('should close server', () => {
    (manager as any).wss = mockWss;
    manager.close();
    expect(mockWss.close).toHaveBeenCalled();
    expect((manager as any).wss).toBeNull();
    expect((manager as any).connections.size).toBe(0);
  });

  it('should export singleton instance', () => {
    expect(wsServerManager).toBeInstanceOf(WebSocketServerManager);
  });

  describe('Voice handlers', () => {
    let mockWs: any;
    let mockPrisma: any;
    let mockVoiceService: any;

    beforeEach(() => {
      mockWs = {
        readyState: 1, // WebSocket.OPEN = 1
        send: jest.fn(),
        on: jest.fn(),
        sessionId: 'session-123',
        userId: 'user-123',
        organizationId: 'org-123',
      };

      mockPrisma = {
        session: {
          findFirst: jest.fn(),
        },
      };

      mockVoiceService = {
        startVoiceSession: jest.fn().mockResolvedValue(undefined),
        stopVoiceSession: jest.fn().mockResolvedValue(undefined),
        processVoiceInput: jest.fn().mockResolvedValue({
          audio: 'base64audio',
          text: 'AI response',
          format: 'mp3',
        }),
      };

      jest.mock('@/lib/prisma', () => ({
        prisma: mockPrisma,
      }));

      jest.mock('@/services/learning-delivery/voice-service', () => ({
        voiceService: mockVoiceService,
      }));
    });

    it('should handle voice start event', async () => {
      manager.initialize(mockServer);
      const connectionHandler = mockWss.on.mock.calls.find(
        (call: any[]) => call[0] === 'connection'
      )?.[1];

      if (connectionHandler) {
        // Mock authenticated connection
        const req = { url: '/?sessionId=session-123&token=valid-token' };
        // Mock verifyToken to return valid user
        jest.doMock('@/lib/auth/jwt', () => ({
          verifyToken: jest.fn().mockReturnValue({
            userId: 'user-123',
            email: 'test@example.com',
            role: 'learner',
            organizationId: 'org-123',
          }),
        }));

        // Mock session lookup
        jest.doMock('@/lib/prisma', () => ({
          prisma: {
            session: {
              findFirst: jest.fn().mockResolvedValue({
                id: 'session-123',
                learnerId: 'learner-123',
                organizationId: 'org-123',
              }),
            },
          },
        }));

        connectionHandler(mockWs, req);

        const messageHandler = mockWs.on.mock.calls.find(
          (call: any[]) => call[0] === 'message'
        )?.[1];

        if (messageHandler) {
          await messageHandler(
            Buffer.from(
              JSON.stringify({
                event: 'session:voice:start',
                data: {},
              })
            )
          );

          // Should send voice started event
          expect(mockWs.send).toHaveBeenCalled();
        }
      }
    });
  });
});
