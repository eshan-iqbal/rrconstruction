import { NextResponse } from 'next/server';
import { verifyAdminCredentials } from '@/lib/auth/admin-auth';
import { signAuthToken } from '@/lib/auth/jwt';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = (body.username || body.email || '').trim();
    const password = body.password || '';

    if (!username || !password) {
      return NextResponse.json(
        { error: { message: 'Username and password are required.' } },
        { status: 400 }
      );
    }

    const admin = await verifyAdminCredentials(username, password);
    if (!admin) {
      return NextResponse.json(
        { error: { message: 'Invalid username or password.' } },
        { status: 401 }
      );
    }

    const token = await signAuthToken({
      userId: admin.id,
      username: admin.username,
      role: admin.role,
      name: admin.name,
    });

    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          id: admin.id,
          username: admin.username,
          name: admin.name,
          role: admin.role,
        },
      },
    });

    // Set HTTP-only JWT Cookie
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json(
      { error: { message: err?.message || 'Server error during login.' } },
      { status: 500 }
    );
  }
}
