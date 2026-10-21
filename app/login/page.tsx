"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const input = "rounded border border-line bg-white px-3 py-2";

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const locked = useRef(false); // blocks a second submit even before React re-renders
  const signUp = mode === "up";
  const mismatch = signUp && confirm.length > 0 && confirm !== password;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (locked.current) return;
    const email = String(new FormData(e.currentTarget).get("email")).trim();
    if (signUp && password !== confirm) return setMsg("The passwords don’t match. Retype the same password in both fields.");
    locked.current = true; setBusy(true); setMsg("");
    const supabase = createClient();
    const { data, error } = signUp
      ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${location.origin}/login` } })
      : await supabase.auth.signInWithPassword({ email, password });
    // Only an error unlocks the button; on success it stays disabled while the page navigates.
    if (error) { locked.current = false; setBusy(false); return setMsg(error.message); }
    if (!data.session) { setSent(true); return setMsg("Check your email to confirm your account, then sign in."); }
    router.push("/"); router.refresh();
  }

  function switchMode() {
    setMode(signUp ? "in" : "up"); setConfirm(""); setMsg(""); setShow(false);
    locked.current = false; setBusy(false); setSent(false);
  }

  return (
    <main className="mx-auto grid min-h-screen max-w-md content-center gap-6 px-6">
      <h1 className="font-display text-4xl font-bold tracking-tight">Job Tracker</h1>
      <p className="text-slate-600">Every application, its stage, and what to do next.</p>
      <form onSubmit={submit} className="grid gap-3">
        <input name="email" type="email" required placeholder="Email" autoComplete="email" className={input} />
        <input value={password} onChange={(e) => setPassword(e.target.value)} type={show ? "text" : "password"} required
          minLength={signUp ? 8 : undefined} placeholder={signUp ? "Password (8+ characters)" : "Password"}
          autoComplete={signUp ? "new-password" : "current-password"} className={input} />
        {signUp && (
          <input value={confirm} onChange={(e) => setConfirm(e.target.value)} type={show ? "text" : "password"} required
            placeholder="Retype password" autoComplete="new-password" aria-invalid={mismatch} className={input} />
        )}
        {mismatch && <p role="alert" className="text-sm text-rose-700">The passwords don’t match.</p>}
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Show password
        </label>
        <button disabled={busy || mismatch} className="rounded bg-accent px-3 py-2 font-medium text-white disabled:opacity-60">
          {sent ? "Check your email" : busy ? "Please wait…" : signUp ? "Create account" : "Sign in"}
        </button>
        {msg && <p role="alert" className="text-sm text-rose-700">{msg}</p>}
      </form>
      <button onClick={switchMode} className="justify-self-start text-sm text-accent underline">
        {signUp ? "Have an account? Sign in" : "New here? Create an account"}
      </button>
    </main>
  );
}
