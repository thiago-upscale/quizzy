import Link from "next/link";
import { eq } from "drizzle-orm";
import { requireAuthSession } from "@/auth/session";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { env } from "@/env";
import {
  PasswordChangeForm,
  PasswordResetRequestInline,
  ProfileForm,
} from "./account-forms";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await requireAuthSession();
  const hasGoogle = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

  const [user] = await db
    .select({
      company: users.company,
      email: users.email,
      name: users.name,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user) {
    throw new Error("Usuario nao encontrado.");
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#f7fafc_0%,_#eef7ff_100%)] px-6 py-8 text-[#132238]">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <Link
            className="text-sm font-semibold text-[#0f766e]"
            href="/dashboard"
          >
            Voltar ao dashboard
          </Link>
          <p className="mt-4 text-sm font-semibold uppercase tracking-[0.24em] text-[#0f766e]">
            Conta
          </p>
          <h1 className="mt-3 text-4xl font-semibold">
            Perfil e seguranca do criador
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#61708c]">
            Atualize seus dados, troque sua senha e deixe o acesso pronto para o
            beta.
          </p>
        </header>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-[1.75rem] border border-[#dae4f0] bg-white p-6 shadow-[0_18px_70px_rgba(15,23,42,0.06)]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#61708c]">
              Perfil
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-[#132238]">
              Dados basicos
            </h2>
            <p className="mt-3 text-sm leading-7 text-[#61708c]">
              Nome e empresa para identificar seu espaco de criador.
            </p>

            <div className="mt-6">
              <ProfileForm
                initialCompany={user.company ?? ""}
                initialName={user.name}
              />
            </div>
          </article>

          <div className="grid gap-4">
            <article className="rounded-[1.75rem] border border-[#dae4f0] bg-white p-6 shadow-[0_18px_70px_rgba(15,23,42,0.06)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#61708c]">
                Seguranca
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-[#132238]">
                Senha e recuperacao
              </h2>
              <p className="mt-3 text-sm leading-7 text-[#61708c]">
                Email atual: <span className="font-semibold">{user.email}</span>
              </p>

              {user.passwordHash ? (
                <div className="mt-6 space-y-6">
                  <PasswordChangeForm />
                  <div className="border-t border-[#e2e8f0] pt-6">
                    <PasswordResetRequestInline email={user.email} />
                  </div>
                </div>
              ) : (
                <p className="mt-6 rounded-2xl bg-[#f8fbff] px-4 py-3 text-sm leading-7 text-[#61708c]">
                  Esta conta ainda nao usa senha local. O acesso por senha pode
                  ser introduzido depois da ativacao do Google, se necessario.
                </p>
              )}
            </article>

            <article className="rounded-[1.75rem] border border-[#dae4f0] bg-white p-6 shadow-[0_18px_70px_rgba(15,23,42,0.06)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#61708c]">
                Login social
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-[#132238]">
                Google
              </h2>
              <p className="mt-3 text-sm leading-7 text-[#61708c]">
                {hasGoogle
                  ? "O provider Google esta configurado e pronto para aparecer no login."
                  : "O provider Google ja esta preparado no produto e entra no ar assim que as credenciais forem adicionadas."}
              </p>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
