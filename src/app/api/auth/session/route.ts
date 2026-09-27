import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAuthToken } from '@/lib/auth/jwt';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;

  if (!token) {
    return NextResponse.json({ data: null });
  }

  const payload = await verifyAuthToken(token);
  if (!payload) {
    return NextResponse.json({ data: null });
  }

  return NextResponse.json({
    data: {
      user: {
        id: payload.userId,
        username: payload.username,
        name: payload.name || payload.username,
        role: payload.role || 'OWNER',
      },
    },
  });
}
