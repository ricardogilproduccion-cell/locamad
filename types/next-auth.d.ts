import type { RolUsuario } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      rol: RolUsuario;
    } & DefaultSession["user"];
  }

  interface User {
    rol: RolUsuario;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    rol?: RolUsuario;
  }
}