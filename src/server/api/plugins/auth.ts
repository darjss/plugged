import { Elysia } from "elysia";
import { isAdminUser } from "../../auth/guards";
import { getAuth } from "../../lib/auth";

export const authPlugin = new Elysia({ name: "auth" })
  .derive(async ({ request }) => {
    const authSession = await getAuth().api.getSession({
      headers: request.headers,
    });

    return {
      authSession,
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
            error: "Unauthorized",
            ok: false,
          });
        }
      },
    },
    requireAdmin: {
      async beforeHandle({ isAdmin, status, user }) {
        if (!user) {
          return status(401, {
            error: "Unauthorized",
            ok: false,
          });
        }

        if (!isAdmin) {
          return status(403, {
            error: "Forbidden",
            ok: false,
          });
        }
      },
    },
  });
