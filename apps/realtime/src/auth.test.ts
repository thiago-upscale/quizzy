import { describe, expect, it } from "vitest";
import { isValidHostToken, makeHostToken } from "./auth.js";

const SECRET = "test-secret-with-at-least-32-characters-long";
const SESSION_ID = "session-abc-123";

describe("isValidHostToken", () => {
  it("accepts a token generated for the same sessionId and secret", () => {
    const token = makeHostToken(SESSION_ID, SECRET);
    expect(isValidHostToken(SESSION_ID, token, SECRET)).toBe(true);
  });

  it("rejects an empty token", () => {
    expect(isValidHostToken(SESSION_ID, "", SECRET)).toBe(false);
  });

  it("rejects undefined token", () => {
    expect(isValidHostToken(SESSION_ID, undefined, SECRET)).toBe(false);
  });

  it("rejects a token generated with a different sessionId", () => {
    const token = makeHostToken("other-session", SECRET);
    expect(isValidHostToken(SESSION_ID, token, SECRET)).toBe(false);
  });

  it("rejects a token generated with a different secret", () => {
    const token = makeHostToken(
      SESSION_ID,
      "completely-different-secret-string",
    );
    expect(isValidHostToken(SESSION_ID, token, SECRET)).toBe(false);
  });

  it("rejects a tampered token (single char change)", () => {
    const token = makeHostToken(SESSION_ID, SECRET);
    const tampered = token.slice(0, -1) + (token.endsWith("a") ? "b" : "a");
    expect(isValidHostToken(SESSION_ID, tampered, SECRET)).toBe(false);
  });

  it("rejects an arbitrarily crafted string", () => {
    expect(isValidHostToken(SESSION_ID, "not-a-real-token", SECRET)).toBe(
      false,
    );
  });
});
