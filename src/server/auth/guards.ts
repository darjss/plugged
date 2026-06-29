import { eq } from "drizzle-orm";
import { db } from "../db";
import { user } from "../db/schema";

export async function isAdminUser(userId: string) {
  const row = await db
    .select({ isAdmin: user.isAdmin })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  return row[0]?.isAdmin ?? false;
}

type RouteGuardContext = {
  locals: App.Locals;
  redirect: (path: string, status?: 300 | 301 | 302 | 303 | 304 | 307 | 308) => Response;
  url: URL;
};

export function requireUser(context: RouteGuardContext) {
  if (context.locals.user) {
    return context.locals.user;
  }
  const next = `${context.url.pathname}${context.url.search}`;
  return context.redirect(`/auth/sign-in?next=${encodeURIComponent(next)}`);
}

// Admin guard for `/dashboard/*`. Does NOT delegate to `requireUser` — that
// helper redirects to `/auth/sign-in` (the storefront phone-OTP flow), which
// is the wrong destination for admin pages. We read `locals.user` directly
// and redirect to `/dashboard/login` (the Google OAuth admin login) when
// absent, so there's no double-redirect dance.
export async function requireAdmin(context: RouteGuardContext) {
  const user = context.locals.user;

  if (!user) {
    const next = `${context.url.pathname}${context.url.search}`;
    return context.redirect(`/dashboard/login?next=${encodeURIComponent(next)}`);
  }

  if (await isAdminUser(user.id)) {
    return user;
  }

  // Non-admin: redirect to the prerendered 403 page so the user gets a
  // grunge "access denied" flyer instead of a plain text 403.
  return context.redirect(`/403?from=${encodeURIComponent(context.url.pathname)}`, 302);
}
