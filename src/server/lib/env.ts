import { env as cfEnv } from "cloudflare:workers";
import { createEnv } from "@t3-oss/env-core";
import * as v from "valibot";

export const env = createEnv({
  server: {
    GOOGLE_CLIENT_ID: v.string(),
    GOOGLE_CLIENT_SECRET: v.string(),
    BETTER_AUTH_URL: v.optional(v.string()),
    SMS_GATEWAY_BASE_URL: v.optional(v.string()),
    SMS_GATEWAY_LOGIN: v.string(),
    SMS_GATEWAY_PASSWORD: v.string(),
    QPAY_URL: v.optional(v.string()),
    QPAY_USERNAME: v.optional(v.string()),
    QPAY_PASSWORD: v.optional(v.string()),
    QPAY_CALLBACK_URL: v.optional(v.string()),
    QPAY_INVOICE_CODE: v.optional(v.string()),
    POSTHOG_KEY: v.optional(v.string()),
    POSTHOG_HOST: v.optional(v.string()),
    POSTHOG_PROJECT_ID: v.optional(v.string()),
    AI_SEARCH_INDEX_ID: v.optional(v.string()),
  },
  runtimeEnv: cfEnv as unknown as Record<string, string | undefined>,
  emptyStringAsUndefined: true,
});
