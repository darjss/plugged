import { env } from "cloudflare:workers";
import ky, { HTTPError } from "ky";
import { env as appEnv } from "../lib/env";

const QPAY_TOKEN_KV_KEY = "qpay:token";
const DEFAULT_TOKEN_TTL_SECONDS = 60 * 60;

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

interface PaymentUrl {
  name: string;
  description: string;
  logo: string;
  link: string;
}

export interface QpayInvoiceResponse {
  invoice_id: string;
  qr_text: string;
  qr_image: string;
  qPay_shortUrl: string;
  urls: PaymentUrl[];
}

interface PaymentRow {
  payment_id: string;
  payment_status: string;
  payment_amount: string;
  payment_currency: string;
}

interface PaymentCheckResponse {
  count: number;
  paid_amount: number;
  rows: PaymentRow[];
}

export interface QpayInvoiceResult {
  invoiceId: string;
  qrText: string;
  qrImage: string;
  shortUrl: string;
}

export interface QpayInvoiceStatus {
  paid: boolean;
  paymentStatus: string | null;
}

const resolveTokenTtl = (expiresIn: number): number => {
  // QPay returns expires_in as an absolute unix timestamp (seconds).
  // Fall back to treating it as a relative duration if it looks relative.
  const now = Math.floor(Date.now() / 1000);
  const ttl = expiresIn > now ? expiresIn - now : expiresIn;
  return Math.max(ttl - 60, 60);
};

const requireCredentials = (): { username: string; password: string } => {
  const username = appEnv.QPAY_USERNAME?.trim();
  const password = appEnv.QPAY_PASSWORD?.trim();
  if (!username || !password) {
    throw new Error("QPay credentials are missing or empty");
  }
  return { password, username };
};

const requireBaseUrl = (): string => {
  const url = appEnv.QPAY_URL;
  if (!url) throw new Error("QPAY_URL is not configured");
  return url.endsWith("/") ? url : `${url}/`;
};

/**
 * Get a cached QPay access token from KV, or request a new one.
 * Pass `forceRefresh` to bypass the cache (used after a 401).
 */
export const getAccessToken = async (opts?: { forceRefresh?: boolean }): Promise<string> => {
  if (!opts?.forceRefresh) {
    const cached = await env.CACHE.get(QPAY_TOKEN_KV_KEY);
    if (cached) return cached;
  }

  const { username, password } = requireCredentials();
  const baseUrl = requireBaseUrl();
  const credentials = btoa(`${username}:${password}`);

  const tokenResponse = await ky
    .post(`${baseUrl}auth/token`, {
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
    })
    .json<TokenResponse>();

  const expirationTtl = resolveTokenTtl(tokenResponse.expires_in ?? DEFAULT_TOKEN_TTL_SECONDS);
  await env.CACHE.put(QPAY_TOKEN_KV_KEY, tokenResponse.access_token, { expirationTtl });

  return tokenResponse.access_token;
};

const clearAccessToken = async (): Promise<void> => {
  await env.CACHE.delete(QPAY_TOKEN_KV_KEY);
};

const qpayClient = ky.create({
  hooks: {
    beforeRequest: [
      async ({ request }) => {
        const token = await getAccessToken();
        request.headers.set("Authorization", `Bearer ${token}`);
      },
    ],
    afterResponse: [
      async ({ request, options, response }) => {
        if (response.status !== 401) return response;
        if (request.headers.get("x-qpay-retried") === "1") return response;

        await clearAccessToken();
        const refreshedToken = await getAccessToken({ forceRefresh: true });

        const retryRequest = new Request(request);
        retryRequest.headers.set("Authorization", `Bearer ${refreshedToken}`);
        retryRequest.headers.set("x-qpay-retried", "1");

        return ky(retryRequest, options);
      },
    ],
  },
});

const describeHttpError = async (error: HTTPError, context: string): Promise<string> => {
  const body = await error.response.text().catch(() => "");
  return `QPay ${context} failed (${error.response.status}): ${body.slice(0, 300)}`;
};

/**
 * Create a QPay invoice for a payment. Returns QR data to display inline.
 */
export const createQpayInvoice = async (
  amount: number,
  paymentNumber: string,
): Promise<QpayInvoiceResult> => {
  if (!appEnv.QPAY_INVOICE_CODE) throw new Error("QPAY_INVOICE_CODE is not configured");
  if (!appEnv.QPAY_CALLBACK_URL) throw new Error("QPAY_CALLBACK_URL is not configured");

  const callbackUrl = new URL(appEnv.QPAY_CALLBACK_URL);
  callbackUrl.searchParams.set("id", paymentNumber);

  try {
    const response = await qpayClient
      .post(`${requireBaseUrl()}invoice`, {
        json: {
          invoice_code: appEnv.QPAY_INVOICE_CODE,
          sender_invoice_no: paymentNumber,
          invoice_receiver_code: "terminal",
          invoice_description: paymentNumber,
          sender_branch_code: "SALBAR1",
          amount,
          callback_url: callbackUrl.toString(),
        },
      })
      .json<QpayInvoiceResponse>();

    return {
      invoiceId: response.invoice_id,
      qrImage: response.qr_image,
      qrText: response.qr_text,
      shortUrl: response.qPay_shortUrl,
    };
  } catch (error) {
    if (error instanceof HTTPError) {
      throw new Error(await describeHttpError(error, "invoice create"));
    }
    throw error;
  }
};

/**
 * Check whether a QPay invoice has been paid. QPay's API uses POST /payment/check.
 */
export const checkQpayInvoice = async (invoiceId: string): Promise<QpayInvoiceStatus> => {
  try {
    const response = await qpayClient
      .post(`${requireBaseUrl()}payment/check`, {
        json: {
          object_type: "INVOICE",
          object_id: invoiceId,
          offset: {
            page_number: 1,
            page_limit: 100,
          },
        },
      })
      .json<PaymentCheckResponse>();

    const latestPayment = response.rows[0];
    if (!latestPayment) {
      return { paid: false, paymentStatus: null };
    }

    return {
      paid: latestPayment.payment_status === "PAID",
      paymentStatus: latestPayment.payment_status,
    };
  } catch (error) {
    if (error instanceof HTTPError) {
      throw new Error(await describeHttpError(error, "invoice check"));
    }
    throw error;
  }
};
