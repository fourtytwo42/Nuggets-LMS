import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);

    // Return user without password hash
    const { passwordHash: _, ...userWithoutPassword } = user;

    return NextResponse.json(userWithoutPassword, { status: 200 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
