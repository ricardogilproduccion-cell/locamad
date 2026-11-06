"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { LoaderCircle, LogIn } from "lucide-react";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const enviar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setPending(true);

    try {
      const resultado = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: "/",
      });

      if (!resultado || resultado.error) {
        setError("Correo o contraseña incorrectos.");
        return;
      }

      window.location.assign(resultado.url || "/");
    } catch {
      setError("No se pudo iniciar sesión. Inténtalo de nuevo.");
    } finally {
      setPending(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={enviar}>
      <label className="flex flex-col gap-1.5 text-xs font-medium text-[#50594f]" htmlFor="login-email">
        Correo electrónico
        <input
          autoComplete="username"
          className="h-11 border border-[#dfe3db] bg-white px-3 text-sm font-normal text-[#20251f] outline-none placeholder:text-[#92988f] focus:border-[#718a72]"
          id="login-email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="nombre@locamad.es"
          required
          type="email"
          value={email}
        />
      </label>
      <label className="flex flex-col gap-1.5 text-xs font-medium text-[#50594f]" htmlFor="login-password">
        Contraseña
        <input
          autoComplete="current-password"
          className="h-11 border border-[#dfe3db] bg-white px-3 text-sm font-normal text-[#20251f] outline-none placeholder:text-[#92988f] focus:border-[#718a72]"
          id="login-password"
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Introduce tu contraseña"
          required
          type="password"
          value={password}
        />
      </label>
      {error && <p className="text-xs text-[#9b422d]" role="alert">{error}</p>}
      <button
        className="flex h-11 w-full items-center justify-center gap-2 bg-[#1769aa] text-sm font-semibold text-white transition-colors hover:bg-[#12558b] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? <LoaderCircle className="animate-spin" size={17} /> : <LogIn size={17} />}
        {pending ? "Validando..." : "Acceder"}
      </button>
    </form>
  );
}