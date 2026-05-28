import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      avatar?: string | null;
      company?: string | null;
      id: string;
      organizationId: string;
      role: string;
    };
  }

  interface User {
    avatar?: string | null;
    company?: string | null;
    id: string;
    organizationId: string;
    role: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    avatar?: string | null;
    company?: string | null;
    userId?: string;
    organizationId?: string;
    role?: string;
  }
}
