import type { APIRoute } from "astro";
import { app } from "../../server/api/app";
import { getAuth } from "../../server/lib/auth";

export const prerender = false;

function stripApiPrefix(request: Request) {
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/^\/api(?=\/|$)/, "");

  url.pathname = pathname.length > 0 ? pathname : "/";

  return new Request(url, request);
}

export const ALL: APIRoute = async ({ request }) => {
  const pathname = new URL(request.url).pathname;

  if (pathname === "/api/auth" || pathname.startsWith("/api/auth/")) {
    return getAuth().handler(request);
  }

  return app.handle(stripApiPrefix(request));
};
