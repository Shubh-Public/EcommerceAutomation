import dotenv from 'dotenv';

dotenv.config({ quiet: true });

export interface FrameworkEnv {
  readonly baseUrl: string;
  readonly testTimeoutMs: number;
  readonly expectTimeoutMs: number;
  readonly workers: number | undefined;
  readonly retries: number;
  readonly blockThirdPartyAds: boolean;
}

function readUrl(name: string, fallback: string): string {
  const raw = process.env[name]?.trim() || fallback;
  try {
    return new URL(raw).origin;
  } catch {
    throw new Error(`Environment variable ${name} must be an absolute URL, received "${raw}".`);
  }
}

function readInt(name: string, fallback: number): number;
function readInt(name: string, fallback: undefined): number | undefined;
function readInt(name: string, fallback: number | undefined): number | undefined {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(
      `Environment variable ${name} must be a non-negative integer, received "${raw}".`,
    );
  }
  return value;
}

function readBool(name: string, fallback: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return fallback;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  throw new Error(`Environment variable ${name} must be "true" or "false", received "${raw}".`);
}

export const env: FrameworkEnv = Object.freeze({
  baseUrl: readUrl('BASE_URL', 'https://automationexercise.com'),
  testTimeoutMs: readInt('TEST_TIMEOUT_MS', 60_000),
  expectTimeoutMs: readInt('EXPECT_TIMEOUT_MS', 10_000),
  workers: readInt('WORKERS', undefined),
  retries: readInt('RETRIES', 0),
  blockThirdPartyAds: readBool('BLOCK_THIRD_PARTY_ADS', true),
});
