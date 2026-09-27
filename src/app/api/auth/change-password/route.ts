import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAuthToken } from '@/lib/auth/jwt';
import { changeAdminPassword } from '@/lib/auth/admin-auth';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json(
        { error: { message: 'Unauthorized. Please sign in.' } },
        { status: 401 }
      );
    }

    const payload = await verifyAuthToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: { message: 'Session expired. Please sign in again.' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: { message: 'Current password and new password are required.' } },
        { status: 400 }
      );
    }

    const result = await changeAdminPassword(payload.userId, currentPassword, newPassword);
    if (!result.success) {
      return NextResponse.json(
        { error: { message: result.error || 'Failed to change password.' } },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully.',
    });
  } catch (err: any) {
    console.error('Change password error:', err);
    return NextResponse.json(
      { error: { message: err?.message || 'Server error while updating password.' } },
      { status: 500 }
    );
  }
}
