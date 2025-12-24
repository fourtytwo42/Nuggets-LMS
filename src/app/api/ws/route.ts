import { NextRequest } from 'next/server';

/**
 * WebSocket API route handler
 * Note: WebSocket connections are handled by the custom server (server.ts)
 * This route is kept for documentation purposes
 */
export async function GET(request: NextRequest) {
  return new Response(
    'WebSocket endpoint - use ws:// protocol. Connect to ws://host/api/ws?sessionId=<id>&token=<token>',
    {
      status: 200,
    }
  );
}
