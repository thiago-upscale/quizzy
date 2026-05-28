import type { AuthOptions } from "next-auth";
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { eq, or } from "drizzle-orm";
import { db } from "@/db/client";
import { organizations, users } from "@/db/schema";
import { env } from "@/env";
import { getDefaultAvatarForName } from "@/lib/account";
import { verifyPassword } from "./password";

async function ensureGoogleUser(params: {
  email: string;
  name: string;
  googleId: string;
}) {
  const normalizedEmail = params.email.trim().toLowerCase();

  const [existingUser] = await db
    .select({
      id: users.id,
      organizationId: users.organizationId,
      email: users.email,
      name: users.name,
      company: users.company,
      avatar: users.avatar,
      role: users.role,
    })
    .from(users)
    .where(
      or(eq(users.email, normalizedEmail), eq(users.googleId, params.googleId)),
    )
    .limit(1);

  if (existingUser) {
    await db
      .update(users)
      .set({
        googleId: params.googleId,
        lastLoginAt: new Date(),
      })
      .where(eq(users.id, existingUser.id));

    return {
      ...existingUser,
      avatar: existingUser.avatar ?? getDefaultAvatarForName(existingUser.name),
      company: existingUser.company ?? existingUser.name,
    };
  }

  const companyName = `${params.name.split(" ")[0] ?? "Equipe"} Quizzy`;

  return db.transaction(async (tx) => {
    const [organization] = await tx
      .insert(organizations)
      .values({
        name: companyName,
      })
      .returning({
        id: organizations.id,
      });

    if (!organization) {
      throw new Error("Nao foi possivel criar a organizacao do Google.");
    }

    const [user] = await tx
      .insert(users)
      .values({
        organizationId: organization.id,
        email: normalizedEmail,
        name: params.name,
        company: companyName,
        avatar: getDefaultAvatarForName(params.name),
        googleId: params.googleId,
        role: "owner",
        lastLoginAt: new Date(),
      })
      .returning({
        id: users.id,
        organizationId: users.organizationId,
        email: users.email,
        name: users.name,
        company: users.company,
        avatar: users.avatar,
        role: users.role,
      });

    if (!user) {
      throw new Error("Nao foi possivel criar o usuario do Google.");
    }

    return user;
  });
}

export const authOptions: AuthOptions = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "Email e senha",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;

        if (!email || !password) {
          return null;
        }

        const [user] = await db
          .select({
            id: users.id,
            organizationId: users.organizationId,
            email: users.email,
            name: users.name,
            company: users.company,
            avatar: users.avatar,
            role: users.role,
            passwordHash: users.passwordHash,
          })
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (!user?.passwordHash) {
          return null;
        }

        const isValid = await verifyPassword(password, user.passwordHash);

        if (!isValid) {
          return null;
        }

        await db
          .update(users)
          .set({
            lastLoginAt: new Date(),
          })
          .where(eq(users.id, user.id));

        return {
          avatar: user.avatar ?? getDefaultAvatarForName(user.name),
          company: user.company ?? "",
          id: user.id,
          email: user.email,
          name: user.name,
          organizationId: user.organizationId,
          role: user.role,
        };
      },
    }),
    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google") {
        return true;
      }

      if (
        !profile?.email ||
        !profile.sub ||
        typeof profile.name !== "string" ||
        profile.name.length === 0
      ) {
        return false;
      }

      await ensureGoogleUser({
        email: profile.email,
        name: profile.name,
        googleId: profile.sub,
      });

      return true;
    },
    async jwt({ token, user, account, profile }) {
      if (user) {
        token.avatar = user.avatar;
        token.company = user.company;
        token.userId = user.id;
        token.organizationId = user.organizationId;
        token.role = user.role;
      }

      if (account?.provider === "google" && profile?.email) {
        const dbUser = await ensureGoogleUser({
          email: profile.email,
          name: typeof profile.name === "string" ? profile.name : "Usuário",
          googleId: profile.sub ?? "",
        });

        token.userId = dbUser.id;
        token.organizationId = dbUser.organizationId;
        token.role = dbUser.role;
        token.company = dbUser.company;
        token.avatar = dbUser.avatar;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.avatar = token.avatar ?? null;
        session.user.company = token.company ?? null;
        session.user.id = token.userId ?? "";
        session.user.organizationId = token.organizationId ?? "";
        session.user.role = token.role ?? "owner";
      }

      return session;
    },
  },
  secret: env.NEXTAUTH_SECRET,
};

export const nextAuthHandler = NextAuth(authOptions);
