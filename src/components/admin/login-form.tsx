"use client";

import { useActionState, useState } from "react";
import { sendPasswordResetAction, signInAction } from "@/app/admin/actions";
import { inputClass } from "@/components/admin/editor/field";

export function LoginForm() {
  const [mode, setMode] = useState<"login" | "reset">("login");
  const [state, action, pending] = useActionState(signInAction, {});
  const [resetState, resetAction, resetPending] = useActionState(sendPasswordResetAction, {});

  if (mode === "reset") {
    return (
      <form action={resetAction} className="space-y-4">
        <label className="block text-body-sm font-medium">
          Email
          <input name="email" type="email" required autoComplete="email" className={`${inputClass} mt-1.5`} />
        </label>
        {resetState.message && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-body-sm text-emerald-800">{resetState.message}</p>}
        <button type="submit" disabled={resetPending} className="w-full rounded-xl bg-ink py-3 text-body-sm font-semibold text-white">
          {resetPending ? "Sending…" : "Send reset link"}
        </button>
        <button type="button" onClick={() => setMode("login")} className="text-body-sm text-muted underline">
          Back to sign in
        </button>
      </form>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <label className="block text-body-sm font-medium">
        Email
        <input name="email" type="email" required autoComplete="username" className={`${inputClass} mt-1.5`} />
      </label>
      <label className="block text-body-sm font-medium">
        Password
        <input name="password" type="password" required autoComplete="current-password" className={`${inputClass} mt-1.5`} />
      </label>
      {state.error && (
        <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-body-sm text-rose-800">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="w-full rounded-xl bg-ink py-3 text-body-sm font-semibold text-white disabled:opacity-60">
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <button type="button" onClick={() => setMode("reset")} className="text-body-sm text-muted underline">
        Forgot password?
      </button>
    </form>
  );
}
