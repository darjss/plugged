import { treaty } from "@elysiajs/eden";
import type { App } from "../server/api/app";

export const api = treaty<App>("/api");
