import { createAuthClient } from "better-auth/solid";

export const authClient = createAuthClient({
  basePath: "/api/auth",
});
