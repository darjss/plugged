import { isAdminUser } from "../../server/auth/guards";

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
 *
 * Does NOT delegate to `requireUser` — that helper redirects to
 * `/auth/sign-in` (the storefront phone-OTP flow), which is the wrong
 * destination for admin pages. We read `locals.user` directly and
 * redirect to `/dashboard/login` (the Google OAuth admin login) when
 * absent, so there's no double-redirect dance.
 */
export async function requireAdmin(context: RequireUserContext) {
  const user = context.locals.user;

  if (!user) {
    const next = `${context.url.pathname}${context.url.search}`;
    return context.redirect(`/dashboard/login?next=${encodeURIComponent(next)}`);
  }

  const isAdmin = await isAdminUser(user.id);

  if (isAdmin) {
    return user;
  }

  // Non-admin: redirect to the prerendered 403 page so the user gets a
  // grunge "access denied" flyer instead of a plain text 403. We use a
  // 302 because Astro's prerendered 403.astro is a static page and the
  // redirect preserves the user-facing UX while still signalling denial.
  // The `from` param is kept for diagnostics but the 403 page itself is
  // the denial message.
  return context.redirect(`/403?from=${encodeURIComponent(context.url.pathname)}`, 302);
}
