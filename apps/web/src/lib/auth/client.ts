import { createAuthClient } from "better-auth/react";
import { apiKeyClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  basePath: "/api/auth",
  plugins: [apiKeyClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
