import { compare, hash } from "bcryptjs";

const PASSWORD_ROUNDS = 12;

export function hashPassword(password: string) {
  return hash(password, PASSWORD_ROUNDS);
}

export function verifyPassword(password: string, passwordHash: string) {
  return compare(password, passwordHash);
}
