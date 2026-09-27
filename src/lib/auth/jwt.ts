import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET =
  process.env.JWT_SECRET ||
  process.env.BETTER_AUTH_SECRET ||
  'rrconstruction_super_secure_contractor_jwt_secret_key_2026_99x';

const secretKey = new TextEncoder().encode(JWT_SECRET);

export interface AuthTokenPayload {
  userId: string;
  username: string;
  role: string;
  name?: string;
}

/**
 * Sign a new JWT session token valid for 30 days.
 */
export async function signAuthToken(payload: AuthTokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secretKey);
}

/**
 * Verify and decode an incoming JWT session token.
 * Returns decoded payload or null if invalid/expired.
 */
export async function verifyAuthToken(token: string): Promise<AuthTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return {
      userId: (payload.userId || payload.sub) as string,
      username: (payload.username as string) || 'admin',
      role: (payload.role as string) || 'OWNER',
      name: (payload.name as string) || 'RR Construction',
    };
  } catch {
    return null;
  }
}
