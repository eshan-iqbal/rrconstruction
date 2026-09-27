'use client';

import { useState, useEffect } from 'react';

export interface UserSession {
  user: {
    id: string;
    username: string;
    name: string;
    role: string;
  };
}

export interface AuthResponse<T = any> {
  data?: T;
  error?: {
    message: string;
  };
}

/**
 * Sign in using single account username or email
 */
export async function signInUsername(params: {
  username?: string;
  email?: string;
  password?: string;
}): Promise<AuthResponse<UserSession>> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: params.username || params.email,
        password: params.password,
      }),
    });

    const json = await res.json();
    if (!res.ok || json.error) {
      return {
        error: {
          message: json.error?.message || 'Invalid username or password.',
        },
      };
    }

    return { data: json.data };
  } catch (err: any) {
    return {
      error: {
        message: err?.message || 'Network error during sign in.',
      },
    };
  }
}

/**
 * Sign out current session
 */
export async function signOut(): Promise<AuthResponse> {
  try {
    const res = await fetch('/api/auth/logout', { method: 'POST' });
    if (!res.ok) {
      return { error: { message: 'Failed to sign out.' } };
    }
    return { data: { success: true } };
  } catch (err: any) {
    return { error: { message: err?.message || 'Error signing out.' } };
  }
}

/**
 * Change the admin account password
 */
export async function changePassword(params: {
  currentPassword?: string;
  newPassword?: string;
  revokeOtherSessions?: boolean;
}): Promise<AuthResponse> {
  try {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPassword: params.currentPassword,
        newPassword: params.newPassword,
      }),
    });

    const json = await res.json();
    if (!res.ok || json.error) {
      return {
        error: {
          message: json.error?.message || 'Failed to update password.',
        },
      };
    }

    return { data: json };
  } catch (err: any) {
    return {
      error: {
        message: err?.message || 'Network error updating password.',
      },
    };
  }
}

/**
 * React hook to access current active JWT session
 */
export function useSession(): {
  data: UserSession | null;
  isPending: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
} {
  const [data, setData] = useState<UserSession | null>(null);
  const [isPending, setIsPending] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSession = async () => {
    try {
      const res = await fetch('/api/auth/session', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (res.ok) {
        const json = await res.json();
        setData(json.data || null);
      } else {
        setData(null);
      }
    } catch (err: any) {
      setError(err);
      setData(null);
    } finally {
      setIsPending(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  return {
    data,
    isPending,
    error,
    refetch: fetchSession,
  };
}

export const signIn = {
  username: signInUsername,
  email: signInUsername,
};

export const authClient = {
  signIn,
  signOut,
  useSession,
  changePassword,
};
