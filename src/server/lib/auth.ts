import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { phoneNumber } from "better-auth/plugins/phone-number";
import { env } from "cloudflare:workers";
import { getDb } from "../db";
import * as schema from "../db/schema";
import { sendSmsAndWait } from "../integrations/sms";

export function getAuth() {
  return betterAuth({
    basePath: "/api/auth",
    baseURL: env.BETTER_AUTH_URL || undefined,
    database: drizzleAdapter(getDb(), {
      provider: "sqlite",
      schema,
    }),
    emailAndPassword: {
      enabled: false,
    },
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID || "",
        clientSecret: env.GOOGLE_CLIENT_SECRET || "",
      },
    },
    plugins: [
      phoneNumber({
        allowedAttempts: 5,
        expiresIn: 300,
        otpLength: 4,
        phoneNumberValidator: (phone) => /^\+976[6-9]\d{7}$/.test(phone),
        sendOTP: async ({ phoneNumber, code }) => {
          const result = await sendSmsAndWait(env, {
            message: `Tanii nevtreh kod ${code}`,
            phoneNumbers: [phoneNumber],
          });

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

export type Auth = ReturnType<typeof getAuth>;
