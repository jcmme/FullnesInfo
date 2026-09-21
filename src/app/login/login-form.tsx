"use client";

import { useActionState } from "react";
import { signIn } from "@/app/actions/auth";

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, undefined);
  return (
    <form action={action} className="card space-y-4 p-5">
      <div>
        <label htmlFor="email" className="label">
          Correo
        </label>
        <input id="email" name="email" type="email" autoComplete="email" required className="field" />
      </div>
      <div>
        <label htmlFor="password" className="label">
          Contraseña
        </label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="field" />
      </div>
      {state?.error && (
        <p role="alert" className="footnote font-semibold text-bad">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn btn-primary btn-lg w-full">
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
