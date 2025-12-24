import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/auth/auth-service';
import { registerSchema } from '@/lib/validation/auth';
import { AuthenticationError } from '@/lib/auth/errors';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validationResult = registerSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const authService = new AuthService();
    const result = await authService.register(validationResult.data);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
