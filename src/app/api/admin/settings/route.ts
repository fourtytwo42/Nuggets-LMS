import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { requireAdmin } from '@/lib/auth/middleware';
import { SettingsService } from '@/services/admin/settings-service';
import logger from '@/lib/logger';

/**
 * GET /api/admin/settings
 * Get system settings
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);
    requireAdmin(user.role);

    const settingsService = new SettingsService();
    const settings = await settingsService.getSettings();

    return NextResponse.json(settings, { status: 200 });
  } catch (error: any) {
    logger.error('Error getting settings', {
      error: error instanceof Error ? error.message : String(error),
    });

    if (error.message?.includes('Unauthorized') || error.message?.includes('Access denied')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/settings
 * Update system settings
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await authenticate(request);
    requireAdmin(user.role);

    const body = await request.json();
    const settingsService = new SettingsService();
    const updatedSettings = await settingsService.updateSettings(body);

    return NextResponse.json(
      {
        success: true,
        settings: updatedSettings,
      },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error('Error updating settings', {
      error: error instanceof Error ? error.message : String(error),
    });

    if (error.message?.includes('Unauthorized') || error.message?.includes('Access denied')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    if (error.message?.includes('Invalid settings')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
