import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer, apiKey } from "better-auth/plugins";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "../db/schema";
import {
  sendEmail,
  verificationEmailHtml,
  resetPasswordEmailHtml,
} from "../email";
import type { CloudflareEnv } from "~/lib/middleware/types";

export function createAuth(env: CloudflareEnv) {
  return betterAuth({
    database: drizzleAdapter(drizzle(env.DB, { schema }), {
      provider: "sqlite",
    }),
    basePath: "/api/auth",
    secret: env.AUTH_SECRET,
    baseURL: env.APP_URL,
    trustedOrigins: [env.APP_URL],
    plugins: [
      bearer(),
      apiKey({
        defaultPrefix: "sk",
        enableMetadata: true,
        apiKeyHeaders: ["x-api-key", "authorization"],
        permissions: {
          defaultPermissions: {
            skills: ["publish", "read"],
          },
        },
      }),
    ],
    user: {
      modelName: "users",
      fields: {
        name: "displayName",
        image: "avatarUrl",
      },
      additionalFields: {
        username: {
          type: "string",
          required: true,
          unique: true,
          input: true,
        },
      },
    },
    session: {
      modelName: "sessions",
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // 1 day
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5, // 5 minutes
      },
    },
    account: {
      modelName: "accounts",
    },
    verification: {
      modelName: "verifications",
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      sendResetPassword: async ({ user, url, token }) => {
        await sendEmail(
          {
            to: user.email,
            subject: "Reset your password for SKVault",
            html: resetPasswordEmailHtml(url),
            idempotencyKey: `password-reset-${user.id}-${token}`,
          },
          env.RESEND_API_KEY,
        );
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendVerificationEmail: async ({ user, url, token }) => {
        await sendEmail(
          {
            to: user.email,
            subject: "Verify your email for SKVault",
            html: verificationEmailHtml(url),
            idempotencyKey: `email-verify-${user.id}-${token}`,
          },
          env.RESEND_API_KEY,
        );
      },
    },
    socialProviders: {
      github: {
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
        mapProfileToUser: (profile) => {
          return {
            username: (profile.login as string).toLowerCase(),
          };
        },
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
export type Session = Auth["$Infer"]["Session"];
