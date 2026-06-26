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
