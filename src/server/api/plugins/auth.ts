import { Elysia } from "elysia";
import { isAdminUser } from "../../auth/guards";
import { getAuth } from "../../lib/auth";

type AuthSessionResult = {
  session: {
    id: string;
    expiresAt: Date;
    token: string;
    userId: string;
  } | null;
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    phoneNumber: string | null;
  } | null;
};

export const authPlugin = new Elysia({ name: "auth" })
  .derive({ as: "global" }, async ({ request }) => {
    const authSession = (await getAuth().api.getSession({
      headers: request.headers,
    })) as AuthSessionResult | null;

    return {
      isAdmin: authSession?.user ? await isAdminUser(authSession.user.id) : false,
      session: authSession?.session ?? null,
      user: authSession?.user ?? null,
    };
  })
  .macro({
    requireAuth: {
      async beforeHandle({ status, user }) {
        if (!user) {
          return status(401, {
            error: { code: "unauthorized", message: "Unauthorized" },
          });
        }
      },
    },
    requireAdmin: {
      async beforeHandle({ isAdmin, status, user }) {
        if (!user) {
          return status(401, {
            error: { code: "unauthorized", message: "Unauthorized" },
          });
        }

        if (!isAdmin) {
          return status(403, {
            error: { code: "forbidden", message: "Forbidden" },
          });
        }
      },
    },
  });
