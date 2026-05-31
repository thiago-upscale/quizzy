import Link from "next/link";
import { eq } from "drizzle-orm";
import { requireAuthSession } from "@/auth/session";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { env } from "@/env";
import {
  MetricCard,
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
    throw new Error("Usuario nao encontrado.");
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
          <div className="mt-4 grid gap-5 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#0f766e]">
                Conta
              </p>
              <h1 className="mt-3 text-4xl font-semibold">
                Perfil e seguranca do criador
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[#61708c]">
                Ajuste identidade, acesso e recuperacao em uma area pensada para
                deixar a operacao pronta para o beta.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <MetricCard
                helper="Nome e empresa atualizados no espaco de criador."
                label="Perfil"
                value="Pronto"
              />
              <MetricCard
                accent={user.passwordHash ? "teal" : "amber"}
                helper={
                  user.passwordHash
                    ? "Senha local ativa e pronta para ser trocada."
                    : "Conta ainda depende da ativacao do fluxo social."
                }
                label="Seguranca"
                value={user.passwordHash ? "Ativa" : "Parcial"}
              />
              <MetricCard
                accent={hasGoogle ? "teal" : "amber"}
                helper={
                  hasGoogle
                    ? "Credenciais presentes para liberar o provider no login."
                    : "A integracao entra no ar quando as credenciais forem adicionadas."
                }
                label="Google"
                value={hasGoogle ? "Configurado" : "Pendente"}
              />
            </div>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <SurfaceCard>
            <SectionHeading
              eyebrow="Perfil"
              helper="Nome e empresa orientam seu espaco de criador e aparecem como referencia operacional nas areas autenticadas."
              title="Identidade principal"
            />

            <div className="mt-6">
              <ProfileForm
                initialCompany={user.company ?? ""}
                initialName={user.name}
              />
            </div>
          </SurfaceCard>

          <div className="grid gap-4">
            <SurfaceCard>
              <SectionHeading
                eyebrow="Seguranca"
                helper={`Email atual: ${user.email}`}
                title="Senha e recuperacao"
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
                    Esta conta ainda nao usa senha local. O acesso por senha
                    pode ser introduzido depois da ativacao do Google, se isso
                    fizer sentido para a operacao.
                  </StatusAlert>
                </div>
              )}
            </SurfaceCard>

            <SurfaceCard>
              <SectionHeading
                eyebrow="Login social"
                helper="A integracao com Google deve comunicar estado real de prontidao, sem parecer um controle morto."
                title="Google"
              />
              <div className="mt-6">
                <StatusAlert tone={hasGoogle ? "success" : "info"}>
                  {hasGoogle
                    ? "O provider Google esta configurado e pronto para aparecer no login."
                    : "O provider Google ja esta preparado no produto e entra no ar assim que as credenciais forem adicionadas."}
                </StatusAlert>
              </div>
            </SurfaceCard>
          </div>
        </section>
      </div>
    </main>
  );
}
