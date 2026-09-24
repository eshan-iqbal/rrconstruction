import { betterAuth } from 'better-auth';
import { username } from 'better-auth/plugins';
import { dash } from '@better-auth/infra';
import { pool } from '@/lib/db/postgres';

export const auth = betterAuth({
  database: pool,
  secret: process.env.BETTER_AUTH_SECRET || process.env.BETTER_AUTH_API_KEY || 'ba_bjkguujq88b37kiluyp5h9wp653yaxtd',
  baseURL: process.env.BETTER_AUTH_URL || 'https://gaspingly-untrembling-meghann.ngrok-free.dev',
  basePath: '/api/auth',
  trustedOrigins: [
    'https://gaspingly-untrembling-meghann.ngrok-free.dev',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ],
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    username(),
    dash({
      apiKey: process.env.BETTER_AUTH_API_KEY || 'ba_bjkguujq88b37kiluyp5h9wp653yaxtd',
    }),
  ],
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'OWNER',
        input: true,
      },
    },
  },
});

