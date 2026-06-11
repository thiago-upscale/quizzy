import Link from "next/link";
import { eq } from "drizzle-orm";
import { requireAuthSession } from "@/auth/session";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { env } from "@/env";
import {
  SectionHeading,
  StatusAlert,
  SurfaceCard,
} from "@/components/phase-one-ui";
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
    throw new Error("Usuário não encontrado.");
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#f7fafc_0%,_#eef7ff_100%)] px-6 py-8 text-[#132238]">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <Link
            className="text-sm font-semibold text-[#0f766e]"
            href="/dashboard"
          >
            Voltar ao dashboard
          </Link>
          <div className="mt-4">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#0f766e]">
              Conta
            </p>
            <h1 className="mt-3 text-4xl font-semibold">
              Perfil e segurança do criador
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#61708c]">
              Ajuste identidade, acesso e recuperação — tudo em um lugar.
            </p>
          </div>
        </header>

        <div className="grid gap-4">
          <SurfaceCard>
            <SectionHeading
              eyebrow="Perfil"
              helper="Nome e empresa orientam seu espaço de criador e aparecem como referência operacional nas áreas autenticadas."
              title="Identidade principal"
            />
            <div className="mt-6">
              <ProfileForm
                initialCompany={user.company ?? ""}
                initialName={user.name}
              />
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <SectionHeading
              eyebrow="Segurança"
              helper={`Email atual: ${user.email}`}
              title="Senha e recuperação"
            />
            {user.passwordHash ? (
              <div className="mt-6 space-y-6">
                <PasswordChangeForm />
                <div className="border-t border-[var(--quizzy-border)] pt-6">
                  <PasswordResetRequestInline email={user.email} />
                </div>
              </div>
            ) : (
              <div className="mt-6">
                <StatusAlert tone="warning">
                  Esta conta ainda não usa senha local. O acesso por senha
                  pode ser introduzido depois da ativação do Google, se isso
                  fizer sentido para a operação.
                </StatusAlert>
              </div>
            )}
          </SurfaceCard>

          <SurfaceCard>
            <SectionHeading
              eyebrow="Login social"
              helper="Estado real de prontidão do provider Google."
              title="Google"
            />
            <div className="mt-6">
              <StatusAlert tone={hasGoogle ? "success" : "info"}>
                {hasGoogle
                  ? "O provider Google está configurado e pronto para aparecer no login."
                  : "O provider Google já está preparado no produto e entra no ar assim que as credenciais forem adicionadas."}
              </StatusAlert>
            </div>
          </SurfaceCard>
        </div>
      </div>
    </main>
  );
}
