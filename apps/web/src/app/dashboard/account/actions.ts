"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { requireAuthSession } from "@/auth/session";
import { hashPassword, verifyPassword } from "@/auth/password";
import {
  generatePasswordResetToken,
  hashPasswordResetToken,
} from "@/auth/password-reset";
import { db } from "@/db/client";
import { passwordResetTokens, users } from "@/db/schema";
import { env } from "@/env";
import { isValidAccountAvatar } from "@/lib/account";
import { logger } from "@/lib/logger";

export type AccountActionState = {
  message?: string;
  previewUrl?: string;
  status: "idle" | "success" | "error";
};

const initialState: AccountActionState = { status: "idle" };

function sanitizeCompany(company: string) {
  const value = company.trim();
  return value.length > 0 ? value : null;
}

async function buildPasswordResetPreview(email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  const fallbackToken = crypto.randomUUID().replaceAll("-", "");
  const fallbackUrl = `${env.NEXTAUTH_URL}/reset-password?token=${fallbackToken}`;

  if (!user?.passwordHash) {
    logger.info(
      {
        email: normalizedEmail,
        reason: "user_missing_or_no_local_password",
      },
      "password_reset.request_ignored",
    );

    return fallbackUrl;
  }

  const { expiresAt, rawToken, tokenHash } = generatePasswordResetToken();
  const previewUrl = `${env.NEXTAUTH_URL}/reset-password?token=${rawToken}`;

  await db.insert(passwordResetTokens).values({
    expiresAt,
    tokenHash,
    userId: user.id,
  });

  logger.info(
    {
      email: normalizedEmail,
      expiresAt: expiresAt.toISOString(),
      previewUrl,
      userId: user.id,
    },
    "password_reset.link_generated",
  );

  return previewUrl;
}

export async function updateAccountProfile(
  _previousState: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const session = await requireAuthSession();
  const name = String(formData.get("name") ?? "").trim();
  const company = String(formData.get("company") ?? "").trim();
  const avatar = String(formData.get("avatar") ?? "").trim();

  if (name.length < 2) {
    return {
      message: "Informe um nome com pelo menos 2 caracteres.",
      status: "error",
    };
  }

  if (!isValidAccountAvatar(avatar)) {
    return {
      message: "Selecione um avatar valido.",
      status: "error",
    };
  }

  await db
    .update(users)
    .set({
      avatar,
      company: sanitizeCompany(company),
      name,
    })
    .where(eq(users.id, session.user.id));

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/account");

  return {
    message: "Perfil atualizado com sucesso.",
    status: "success",
  };
}

export async function changeAccountPassword(
  _previousState: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const session = await requireAuthSession();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const nextPassword = String(formData.get("nextPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!currentPassword || !nextPassword || !confirmPassword) {
    return {
      message: "Preencha todos os campos de senha.",
      status: "error",
    };
  }

  if (nextPassword.length < 8) {
    return {
      message: "A nova senha precisa ter pelo menos 8 caracteres.",
      status: "error",
    };
  }

  if (nextPassword !== confirmPassword) {
    return {
      message: "A confirmacao da nova senha nao confere.",
      status: "error",
    };
  }

  const [user] = await db
    .select({
      id: users.id,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user?.passwordHash) {
    return {
      message:
        "Esta conta nao usa senha local agora. Ative isso depois do Google, se quiser.",
      status: "error",
    };
  }

  const isValid = await verifyPassword(currentPassword, user.passwordHash);

  if (!isValid) {
    return {
      message: "A senha atual esta incorreta.",
      status: "error",
    };
  }

  const passwordHash = await hashPassword(nextPassword);

  await db
    .update(users)
    .set({
      passwordHash,
    })
    .where(eq(users.id, user.id));

  logger.info(
    {
      userId: user.id,
    },
    "account.password_changed",
  );

  return {
    message: "Senha atualizada com sucesso.",
    status: "success",
  };
}

export async function requestPasswordReset(
  _previousState: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!email) {
    return {
      message: "Informe o email da conta.",
      status: "error",
    };
  }

  const previewUrl = await buildPasswordResetPreview(email);

  return {
    message:
      "Se o email existir, geramos um link de recuperacao para uso interno no beta.",
    previewUrl,
    status: "success",
  };
}

export async function resetPasswordWithToken(
  _previousState: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const token = String(formData.get("token") ?? "").trim();
  const nextPassword = String(formData.get("nextPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!token || !nextPassword || !confirmPassword) {
    return {
      message: "Preencha todos os campos para redefinir a senha.",
      status: "error",
    };
  }

  if (nextPassword.length < 8) {
    return {
      message: "A nova senha precisa ter pelo menos 8 caracteres.",
      status: "error",
    };
  }

  if (nextPassword !== confirmPassword) {
    return {
      message: "A confirmacao da nova senha nao confere.",
      status: "error",
    };
  }

  const tokenHash = hashPasswordResetToken(token);
  const now = new Date();

  const [resetToken] = await db
    .select({
      expiresAt: passwordResetTokens.expiresAt,
      id: passwordResetTokens.id,
      userId: passwordResetTokens.userId,
      usedAt: passwordResetTokens.usedAt,
    })
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        isNull(passwordResetTokens.usedAt),
      ),
    )
    .limit(1);

  if (
    !resetToken ||
    resetToken.usedAt !== null ||
    resetToken.expiresAt.getTime() < now.getTime()
  ) {
    logger.warn(
      {
        tokenHash,
      },
      "password_reset.invalid_token_attempt",
    );

    return {
      message: "Esse link de recuperacao esta invalido ou expirou.",
      status: "error",
    };
  }

  const passwordHash = await hashPassword(nextPassword);

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({
        passwordHash,
      })
      .where(eq(users.id, resetToken.userId));

    await tx
      .update(passwordResetTokens)
      .set({
        usedAt: new Date(),
      })
      .where(eq(passwordResetTokens.id, resetToken.id));

    await tx
      .update(passwordResetTokens)
      .set({
        usedAt: new Date(),
      })
      .where(
        and(
          eq(passwordResetTokens.userId, resetToken.userId),
          isNull(passwordResetTokens.usedAt),
        ),
      );
  });

  logger.info(
    {
      userId: resetToken.userId,
    },
    "password_reset.completed",
  );

  revalidatePath("/login");

  return {
    message: "Senha redefinida com sucesso. Agora voce ja pode entrar.",
    status: "success",
  };
}

export { initialState as accountInitialState };
