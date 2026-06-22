import { createHmac, timingSafeEqual } from "node:crypto";

export function makeHostToken(sessionId: string, secret: string): string {
  const hourWindow = Math.floor(Date.now() / 3_600_000);
  return createHmac("sha256", secret)
    .update(`host:${sessionId}:${hourWindow}`)
    .digest("hex");
}

export function isValidHostToken(
  sessionId: string,
  token: string | undefined,
  secret: string,
): boolean {
  if (!token) return false;
  const hourWindow = Math.floor(Date.now() / 3_600_000);
  for (const w of [hourWindow, hourWindow - 1]) {
    const expected = createHmac("sha256", secret)
      .update(`host:${sessionId}:${w}`)
      .digest("hex");
    const expectedBuf = Buffer.from(expected);
    const tokenBuf = Buffer.from(token);
    if (
      expectedBuf.length === tokenBuf.length &&
      timingSafeEqual(expectedBuf, tokenBuf)
    ) {
      return true;
    }
  }
  return false;
}
