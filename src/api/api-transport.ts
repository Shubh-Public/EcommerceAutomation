import { test, type APIRequestContext, type APIResponse } from '@playwright/test';

/**
 * Every automationexercise.com API call returns HTTP 200 with a
 * `text/html` content type. The real outcome is the `responseCode` field in
 * the JSON body, e.g. `{"responseCode": 404, "message": "User not found!"}`.
 */
export interface ApiEnvelope {
  readonly operation: string;
  readonly responseCode: number;
  readonly body: Readonly<Record<string, unknown>>;
}

export class ApiContractError extends Error {
  override readonly name = 'ApiContractError';
}

export type FormFields = Readonly<Record<string, string>>;
type WriteMethod = 'POST' | 'PUT' | 'DELETE';

const BODY_PREVIEW_LENGTH = 300;

/** Transport only: sends requests and decodes the envelope. No business rules. */
export class ApiTransport {
  private readonly request: APIRequestContext;

  constructor(request: APIRequestContext) {
    this.request = request;
  }

  async get(path: string, params: FormFields = {}): Promise<ApiEnvelope> {
    return reportedCall(`GET ${path}`, params, () =>
      this.request.get(path, { params: { ...params } }),
    );
  }

  async send(method: WriteMethod, path: string, form: FormFields = {}): Promise<ApiEnvelope> {
    return reportedCall(`${method} ${path}`, form, () =>
      this.request.fetch(path, { method, form: { ...form } }),
    );
  }
}

/**
 * Wraps a call in a report step with the request fields and raw response
 * attached, so failures in Allure and the HTML report show the exchange.
 * Must run inside a test or test-scoped fixture (uses test.info()).
 */
async function reportedCall(
  operation: string,
  fields: FormFields,
  send: () => Promise<APIResponse>,
): Promise<ApiEnvelope> {
  return test.step(
    operation,
    async () => {
      const info = test.info();
      if (Object.keys(fields).length > 0) {
        await info.attach(`${operation} request`, {
          body: JSON.stringify(maskSecrets(fields), null, 2),
          contentType: 'application/json',
        });
      }
      const response = await send();
      await info.attach(`${operation} response (HTTP ${response.status()})`, {
        body: await response.text(),
        contentType: 'text/plain',
      });
      return decodeEnvelope(response, operation);
    },
    { box: true },
  );
}

const SECRET_FIELD = /password|token|secret/i;

function maskSecrets(fields: FormFields): FormFields {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, SECRET_FIELD.test(key) ? '***' : value]),
  );
}

/** Throws unless the envelope carries the expected business response code. */
export function expectResponseCode(envelope: ApiEnvelope, expected: number): void {
  if (envelope.responseCode !== expected) {
    throw new ApiContractError(
      `${envelope.operation}: expected responseCode ${expected}, received ${envelope.responseCode}. ` +
        `Body: ${preview(JSON.stringify(envelope.body))}`,
    );
  }
}

async function decodeEnvelope(response: APIResponse, operation: string): Promise<ApiEnvelope> {
  const text = await response.text();
  const context = `${operation} -> HTTP ${response.status()} ${response.url()}`;

  if (response.status() >= 500) {
    throw new ApiContractError(
      `${context}: server-side failure (site or CDN outage, not a contract change). Body: ${preview(text)}`,
    );
  }
  if (!response.ok()) {
    throw new ApiContractError(`${context}: unexpected HTTP status. Body: ${preview(text)}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new ApiContractError(`${context}: body is not JSON. Body: ${preview(text)}`, {
      cause: error,
    });
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new ApiContractError(`${context}: body is not a JSON object. Body: ${preview(text)}`);
  }
  const body = parsed as Record<string, unknown>;
  if (typeof body['responseCode'] !== 'number') {
    throw new ApiContractError(
      `${context}: body has no numeric responseCode. Body: ${preview(text)}`,
    );
  }
  return { operation, responseCode: body['responseCode'], body };
}

function preview(text: string): string {
  return text.length > BODY_PREVIEW_LENGTH ? `${text.slice(0, BODY_PREVIEW_LENGTH)}…` : text;
}
