import type { Metadata } from "next";
import { connection } from "next/server";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { authOptions } from "@/auth";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Iniciar sesión | LocaMad",
  description: "Acceso al catálogo de localizaciones de rodaje de LocaMad.",
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f2f3ef]" />}>
      <LoginContent />
    </Suspense>
  );
}

async function LoginContent() {
  await connection();
  const session = await getServerSession(authOptions);
  if (session) redirect("/");

  return (
    <main className="grid min-h-screen place-items-center bg-[#f2f3ef] px-5 py-10 text-[#20251f]">
      <div className="w-full max-w-[420px] border border-[#dfe2db] bg-white shadow-sm">
        <div className="border-b border-[#e1e4dd] px-7 py-6">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-lg bg-[#183d32] text-white">
              <span className="text-[15px] font-bold tracking-[0.04em]">LM</span>
            </div>
            <div>
              <p className="text-sm font-bold tracking-[0.08em]">LOCAMAD</p>
              <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-[#747b72]">Localizaciones de rodaje</p>
            </div>
          </div>
        </div>
        <div className="px-7 py-7">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#71806f]">Área de trabajo</p>
          <h1 className="mt-2 text-2xl font-semibold">Iniciar sesión</h1>
          <p className="mt-2 text-sm leading-6 text-[#737a71]">Accede al catálogo y a las herramientas de producción.</p>
          <div className="mt-6">
            <LoginForm />
          </div>
        </div>
      </div>
    </main>
  );
}