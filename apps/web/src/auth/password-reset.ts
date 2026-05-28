import { createHash, randomBytes } from "node:crypto";

const PASSWORD_RESET_EXPIRATION_MS = 60 * 60 * 1000;

export function generatePasswordResetToken() {
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashPasswordResetToken(rawToken);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRATION_MS);

  return {
    expiresAt,
    rawToken,
    tokenHash,
  };
}

export function hashPasswordResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
