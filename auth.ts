import { compare } from "bcryptjs";
import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthOptions } from "next-auth";
import { prisma } from "@/lib/prisma";

const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;

if (process.env.NODE_ENV === "production" && !secret) {
  throw new Error("Configura NEXTAUTH_SECRET antes de iniciar LocaMad en producción.");
}

export const authOptions: NextAuthOptions = {
  secret,
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  providers: [
    CredentialsProvider({
      name: "Credenciales",
      credentials: {
        email: { label: "Correo electrónico", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const user = await prisma.usuario.findUnique({ where: { email } });
        if (!user?.password) return null;

        const validPassword = await compare(password, user.password);
        if (!validPassword) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.nombre,
          rol: user.rol,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.rol = user.rol;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.rol = token.rol ?? "INVITADO";
      }
      return session;
    },
  },
};