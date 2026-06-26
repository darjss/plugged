import { isAdminUser } from "../../server/auth/guards";
import { requireUser } from "./require-user";

type RequireUserContext = {
  locals: App.Locals;
  redirect: (path: string, status?: 300 | 301 | 302 | 303 | 304 | 307 | 308) => Response;
  url: URL;
};

/**
 * Astro server-side guard for `/dashboard/*` routes.
 *
 * - Unauthenticated → redirect to the Google OAuth login page
 *   (`/dashboard/login`), preserving the intended destination.
 * - Authenticated but not an admin (DB `isAdmin` column) → 403.
 * - Authenticated admin → returns the user record.
 *
 * The `isAdmin` check is DB-based (see `src/server/auth/guards.ts`) per the
 * prefactor work in #2 — no role table, just a boolean column on `user`.
 */
export async function requireAdmin(context: RequireUserContext) {
  const user = requireUser(context);

  if (user instanceof Response) {
    // Rewrite the auth redirect target to the admin Google login page.
    const next = `${context.url.pathname}${context.url.search}`;
    return context.redirect(`/dashboard/login?next=${encodeURIComponent(next)}`);
  }

  const isAdmin = await isAdminUser(user.id);

  if (isAdmin) {
    return user;
  }

  return new Response("Forbidden", { status: 403 });
}
