import { env as cfEnv } from "cloudflare:workers";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { phoneNumber } from "better-auth/plugins/phone-number";
import { MONGOLIAN_PHONE_REGEX } from "../../lib/utils";
import { db } from "../db";
import * as schema from "../db/schema";
import { env } from "./env";
import { sendSmsAndWait } from "../integrations/sms";

function createAuth() {
  return betterAuth({
    basePath: "/api/auth",
    baseURL: env.BETTER_AUTH_URL || undefined,
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema,
    }),
    secondaryStorage: {
      get: (key) => cfEnv.PLUGGED_SESSION.get(key),
      set: (key, value, ttl) =>
        cfEnv.PLUGGED_SESSION.put(key, value, ttl ? { expirationTtl: ttl } : undefined),
      delete: (key) => cfEnv.PLUGGED_SESSION.delete(key),
    },
    session: {
      storeSessionInDatabase: true,
    },
    emailAndPassword: {
      enabled: false,
    },
    socialProviders: {
      // t3-env guarantees these are non-empty required strings; no `|| ""`
      // fallback needed (the previous fallback papered over the real
      // invariant and hid a misconfigured deploy).
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
    },
    plugins: [
      phoneNumber({
        allowedAttempts: 5,
        expiresIn: 300,
        otpLength: 4,
        phoneNumberValidator: (phone) => MONGOLIAN_PHONE_REGEX.test(phone),
        sendOTP: async ({ phoneNumber, code }) => {
          const result = await sendSmsAndWait(
            {
              SMS_GATEWAY_BASE_URL: env.SMS_GATEWAY_BASE_URL,
              SMS_GATEWAY_LOGIN: env.SMS_GATEWAY_LOGIN,
              SMS_GATEWAY_PASSWORD: env.SMS_GATEWAY_PASSWORD,
            },
            {
              message: `Tanii nevtreh kod ${code}`,
              phoneNumbers: [phoneNumber],
            },
          );

          if (result.state === "Failed") {
            throw new Error(result.recipients[0]?.error ?? "SMS failed");
          }
        },
        signUpOnVerification: {
          getTempEmail: (phone) => `${phone.replace(/^\+/, "")}@phone.plugged.local`,
          getTempName: (phone) => phone,
        },
      }),
    ],
  });
}

type AuthInstance = ReturnType<typeof createAuth>;

let _auth: AuthInstance | null = null;

export function getAuth(): AuthInstance {
  if (!_auth) {
    _auth = createAuth();
  }

  return _auth;
}

export type Auth = AuthInstance;
