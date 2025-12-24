import { NextRequest } from 'next/server';
import { WebSocketServer } from 'ws';
import { Server } from 'http';

// WebSocket server instance (will be initialized on first request)
let wss: WebSocketServer | null = null;

/**
 * Initialize WebSocket server
 */
function initializeWebSocketServer(server: Server) {
  if (wss) {
    return wss;
  }

  wss = new WebSocketServer({ server, path: '/api/ws' });

  wss.on('connection', (ws, req) => {
    // Extract session ID from query params or headers
    const url = new URL(req.url || '', 'http://localhost');
    const sessionId = url.searchParams.get('sessionId');

    if (!sessionId) {
      ws.close(1008, 'Session ID required');
      return;
    }

    // Store session ID on WebSocket
    (ws as any).sessionId = sessionId;

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        await handleMessage(ws, sessionId, data);
      } catch (error) {
        ws.send(
          JSON.stringify({
            type: 'error',
            message: 'Invalid message format',
          })
        );
      }
    });

    ws.on('close', () => {
      // Cleanup
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    // Send connection confirmation
    ws.send(
      JSON.stringify({
        type: 'connected',
        sessionId,
      })
    );
  });

  return wss;
}

/**
 * Handle incoming WebSocket message
 */
async function handleMessage(ws: any, sessionId: string, data: any) {
  switch (data.type) {
    case 'message':
      // Handle chat message
      ws.send(
        JSON.stringify({
          type: 'message',
          content: 'Message received',
          timestamp: new Date().toISOString(),
        })
      );
      break;

    case 'progress':
      // Handle progress update
      ws.send(
        JSON.stringify({
          type: 'progress_updated',
          success: true,
        })
      );
      break;

    case 'navigate':
      // Handle narrative navigation
      ws.send(
        JSON.stringify({
          type: 'navigation',
          nodeId: data.nodeId,
        })
      );
      break;

    default:
      ws.send(
        JSON.stringify({
          type: 'error',
          message: `Unknown message type: ${data.type}`,
        })
      );
  }
}

/**
 * WebSocket API route handler
 * Note: This is a placeholder - actual WebSocket implementation
 * would need to be set up at the server level
 */
export async function GET(request: NextRequest) {
  return new Response('WebSocket endpoint - use ws:// protocol', {
    status: 200,
  });
}
