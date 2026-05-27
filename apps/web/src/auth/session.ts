import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth-options";

export function getAuthSession() {
  return getServerSession(authOptions);
}

export async function requireAuthSession() {
  const session = await getAuthSession();

  if (!session?.user?.id || !session.user.organizationId) {
    redirect("/login");
  }

  return session;
}
