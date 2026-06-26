import { createAuthClient } from "better-auth/solid";
import { phoneNumberClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  basePath: "/api/auth",
  plugins: [phoneNumberClient()],
});
