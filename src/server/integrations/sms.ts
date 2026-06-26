import Client, {
  type Message,
  type MessageState,
} from "android-sms-gateway";
import ky from "ky";

type SmsEnv = {
  SMS_GATEWAY_BASE_URL?: string;
  SMS_GATEWAY_LOGIN?: string;
  SMS_GATEWAY_PASSWORD?: string;
};

type HttpClient = {
  get<T>(url: string, headers?: Record<string, string>): Promise<T>;
  post<T>(url: string, body: unknown, headers?: Record<string, string>): Promise<T>;
  put<T>(url: string, body: unknown, headers?: Record<string, string>): Promise<T>;
  patch<T>(url: string, body: unknown, headers?: Record<string, string>): Promise<T>;
  delete<T>(url: string, headers?: Record<string, string>): Promise<T>;
};

function createHttpClient(): HttpClient {
  const client = ky.create({ throwHttpErrors: false });

  const handleResponse = async <T>(response: Response): Promise<T> => {
    if (response.status === 204) return null as T;

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`SMS gateway HTTP ${response.status}: ${text}`);
    }

    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      return (await response.json()) as T;
    }

    return (await response.text()) as T;
  };

  return {
    async get<T>(url, headers) {
      return handleResponse<T>(await client.get(url, { headers }));
    },
    async post<T>(url, body, headers) {
      return handleResponse<T>(await client.post(url, { headers, json: body }));
    },
    async put<T>(url, body, headers) {
      return handleResponse<T>(await client.put(url, { headers, json: body }));
    },
    async patch<T>(url, body, headers) {
      return handleResponse<T>(await client.patch(url, { headers, json: body }));
    },
    async delete<T>(url, headers) {
      return handleResponse<T>(await client.delete(url, { headers }));
    },
  };
}

export function createSmsClient(env: SmsEnv) {
  return new Client(
    env.SMS_GATEWAY_LOGIN ?? "",
    env.SMS_GATEWAY_PASSWORD ?? "",
    createHttpClient(),
    env.SMS_GATEWAY_BASE_URL,
  );
}

export async function sendSmsAndWait(
  env: SmsEnv,
  message: Message,
  options?: {
    maxAttempts?: number;
    intervalMs?: number;
    skipPhoneValidation?: boolean;
  },
): Promise<MessageState> {
  const client = createSmsClient(env);
  const { maxAttempts = 10, intervalMs = 1000, skipPhoneValidation } = options ?? {};
  const result = await client.send(message, { skipPhoneValidation });

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const state = await client.getState(result.id);
    if (state.state !== "Pending") return state;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return client.getState(result.id);
}
