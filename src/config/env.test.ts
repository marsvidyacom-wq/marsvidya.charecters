import { afterEach, describe, expect, it, vi } from "vitest";
import { getServerEnv, publicEnv } from "./env";

const productionEnv = {
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://user:pass@localhost:5432/marsvidya",
  AUTH_SECRET: "test-auth-secret-at-least-32-characters",
  AUTH_GOOGLE_ID: "google-client-id",
  AUTH_GOOGLE_SECRET: "google-client-secret",
  AI_API_KEY: "test-openai-key",
  SARVAM_API: "test-sarvam-key",
};

describe("environment configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("accepts_empty_optional_provider_configuration_in_development", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("AUTH_SECRET", "");
    vi.stubEnv("AUTH_GOOGLE_ID", "");
    vi.stubEnv("AUTH_GOOGLE_SECRET", "");
    vi.stubEnv("AI_API_KEY", "");
    vi.stubEnv("SARVAM_API", "");

    const result = getServerEnv();

    expect(result.NODE_ENV).toBe("development");
    expect(result.AI_PROVIDER).toBe("openai");
    expect(result.AI_API_KEY).toBeUndefined();
  });

  it("rejects_missing_required_production_configuration", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("AUTH_SECRET", "");
    vi.stubEnv("AUTH_GOOGLE_ID", "");
    vi.stubEnv("AUTH_GOOGLE_SECRET", "");
    vi.stubEnv("AI_API_KEY", "");
    vi.stubEnv("SARVAM_API", "");

    expect(() => getServerEnv()).toThrow(/production configuration/i);
  });

  it("requires the Sarvam key for production voice routes", () => {
    for (const [key, value] of Object.entries(productionEnv)) {
      vi.stubEnv(key, value);
    }
    vi.stubEnv("SARVAM_API", "");

    expect(() => getServerEnv()).toThrow(/SARVAM_API/);
  });

  it("accepts_complete_production_configuration", () => {
    for (const [key, value] of Object.entries(productionEnv)) {
      vi.stubEnv(key, value);
    }

    expect(getServerEnv().DATABASE_URL).toBe(productionEnv.DATABASE_URL);
  });

  it("never_exposes_server_secrets_through_public_env", () => {
    expect(publicEnv).toEqual({ appUrl: "http://localhost:3000" });
    expect(JSON.stringify(publicEnv)).not.toMatch(/secret|api[_-]?key|database/i);
  });
});
