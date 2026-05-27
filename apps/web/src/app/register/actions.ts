"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { organizations, users } from "@/db/schema";
import { hashPassword } from "@/auth/password";

export type RegisterState = {
  error?: string;
};

export async function registerCreator(
  _previousState: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const name = String(formData.get("name") ?? "").trim();
  const company = String(formData.get("company") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name || !company || !email || !password) {
    return { error: "Preencha todos os campos." };
  }

  if (password.length < 8) {
    return { error: "A senha precisa ter pelo menos 8 caracteres." };
  }

  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser) {
    return { error: "Ja existe uma conta com esse email." };
  }

  const passwordHash = await hashPassword(password);

  await db.transaction(async (tx) => {
    const [organization] = await tx
      .insert(organizations)
      .values({
        name: company,
      })
      .returning({ id: organizations.id });

    if (!organization) {
      throw new Error("Nao foi possivel criar a organizacao.");
    }

    await tx.insert(users).values({
      organizationId: organization.id,
      email,
      name,
      passwordHash,
      role: "owner",
    });
  });

  redirect("/login?registered=1");
}
