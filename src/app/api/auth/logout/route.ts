import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import logger from '@/lib/logger';

/**
 * POST /api/auth/logout
 * Logout user (invalidate token)
 *
 * Note: Since we're using stateless JWT, logout is mainly client-side (remove token).
 * This endpoint verifies the token was valid and logs the logout event.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify token is valid (authenticate will throw if invalid)
    const user = await authenticate(request);

    // Log logout event (optional - for analytics)
    logger.info('User logged out', {
      userId: user.id,
      email: user.email,
    });

    // Return success
    // Client should remove token from storage
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    // If token is invalid, still return success (client can clear token anyway)
    if (error instanceof Error && error.message.includes('token')) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    logger.error('Error during logout', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
