type Runtime = import("@astrojs/cloudflare").Runtime<Env>;
type Auth = import("./server/lib/auth").Auth;
type SessionResult = NonNullable<Awaited<ReturnType<Auth["api"]["getSession"]>>>;

declare namespace App {
  interface Locals extends Runtime {
    session: SessionResult["session"] | null;
    user: SessionResult["user"] | null;
  }
}

/// <reference types="astro/client" />

declare module "astro:middleware" {
  type MiddlewareContext = import("astro").APIContext & { isPrerendered?: boolean };
  type MiddlewareHandler = (
    context: MiddlewareContext,
    next: () => Promise<Response>,
  ) => Response | Promise<Response>;
  export const defineMiddleware: (handler: MiddlewareHandler) => MiddlewareHandler;
}
