import { WebSocketServerManager, wsServerManager } from '@/lib/websocket/server';
import { WebSocketServer, WebSocket } from 'ws';
import logger from '@/lib/logger';

jest.mock('ws');
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
    (WebSocketServer as jest.Mock).mockImplementation(() => mockWss);
    manager = new WebSocketServerManager();
  });

  it('should initialize WebSocket server', () => {
    const result = manager.initialize(mockServer, '/api/ws');
    expect(WebSocketServer).toHaveBeenCalledWith({ server: mockServer, path: '/api/ws' });
    expect(mockWss.on).toHaveBeenCalledWith('connection', expect.any(Function));
    expect(result).toBe(mockWss);
  });

  it('should not reinitialize if already initialized', () => {
    manager.initialize(mockServer);
    const callCount = (WebSocketServer as jest.Mock).mock.calls.length;
    manager.initialize(mockServer);
    expect((WebSocketServer as jest.Mock).mock.calls.length).toBe(callCount);
  });

  it('should send message to specific session', () => {
    const mockWs = {
      readyState: WebSocket.OPEN,
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

  it('should broadcast to all connections', () => {
    const mockWs1 = { readyState: WebSocket.OPEN, send: jest.fn() };
    const mockWs2 = { readyState: WebSocket.OPEN, send: jest.fn() };
    (manager as any).connections.set('session-1', mockWs1);
    (manager as any).connections.set('session-2', mockWs2);

    manager.broadcast({ type: 'broadcast', data: 'message' });
    expect(mockWs1.send).toHaveBeenCalled();
    expect(mockWs2.send).toHaveBeenCalled();
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
});
