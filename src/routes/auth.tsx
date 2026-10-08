import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, LockKeyhole, Mail, Sparkles } from "lucide-react";

import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "登录 / 注册 — Solstice" },
      { name: "description", content: "登录你的 Solstice AI 求职工作台。" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading, profileComplete, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (loading || !user) return;
    void navigate({ to: profileComplete ? "/" : "/onboarding", replace: true });
  }, [loading, user, profileComplete, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setBusy(true);

    const result =
      mode === "login" ? await signIn(email.trim(), password) : await signUp(email.trim(), password);

    setBusy(false);

    if (result.error) {
      setMessage(result.error);
      return;
    }

    if (mode === "signup" && result.needsConfirmation) {
      setMessage("注册成功。请先打开邮箱里的验证邮件，验证完成后再回来登录。");
      setMode("login");
      setPassword("");
      return;
    }

    void navigate({ to: "/onboarding", replace: true });
  };

  return (
    <main className="min-h-screen bg-white px-4 py-8 text-ink sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center">
        <div className="grid w-full overflow-hidden rounded-[2rem] border border-ink/10 bg-white shadow-[0_25px_90px_rgba(38,31,8,0.10)] lg:grid-cols-[1.05fr_0.95fr]">
          <section className="yellow-grain relative overflow-hidden p-7 sm:p-10 lg:p-12">
            <div className="absolute -right-14 -top-16 size-48 rounded-full bg-ochre/20 blur-3xl" />
            <div className="relative">
              <div className="mb-10 flex items-center gap-3">
                <div className="grid size-11 place-items-center rounded-xl bg-ink text-cream">
                  <Sparkles className="size-4" />
                </div>
                <div>
                  <div className="font-display text-xl font-extrabold">Solstice</div>
                  <div className="text-[9px] font-bold tracking-[0.22em] text-ink/40 uppercase">AI Job OS</div>
                </div>
              </div>
              <div className="max-w-md">
                <div className="text-[10px] font-bold tracking-[0.24em] text-ochre uppercase">YOUR NEXT MOVE</div>
                <h1 className="mt-3 font-display text-4xl font-extrabold leading-[1.02] sm:text-5xl">
                  让你的职业道路，<span className="underline decoration-ochre decoration-4 underline-offset-4">更清晰。</span>
                </h1>
                <p className="mt-5 max-w-lg text-sm leading-7 text-ink/60">
                  Solstice 是你的 AI 求职工作台：把你的经历、能力、偏好和职业方向连接起来，帮你找到更适合的岗位，解释为什么匹配，并持续记录你的求职选择。
                </p>
              </div>
              <div className="mt-10 grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
                {[
                  ["01", "建立你的职业画像"],
                  ["02", "AI 理解真实岗位"],
                  ["03", "找到真正适合你的机会"],
                ].map(([n, label]) => (
                  <div key={n} className="rounded-xl border border-ink/8 bg-white/70 px-3 py-2.5 text-xs font-semibold">
                    <span className="mr-2 text-ochre">{n}</span>{label}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="flex items-center p-7 sm:p-10 lg:p-12">
            <div className="mx-auto w-full max-w-md">
              <div className="mb-7 flex rounded-xl border border-ink/8 bg-ink/[0.025] p-1">
                <button type="button" onClick={() => { setMode("signup"); setMessage(""); }} className={tabClass(mode === "signup")}>
                  注册
                </button>
                <button type="button" onClick={() => { setMode("login"); setMessage(""); }} className={tabClass(mode === "login")}>
                  登录
                </button>
              </div>

              <h2 className="font-display text-2xl font-extrabold">{mode === "signup" ? "创建你的 Solstice 账号" : "欢迎回来"}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink/50">
                {mode === "signup" ? "先用邮箱和密码创建账号，下一步再填写你的职业资料。" : "登录后，你的职业资料和求职状态会在不同设备间保持一致。"}
              </p>

              <form onSubmit={submit} className="mt-7 space-y-4">
                <label className="block">
                  <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-ink/50"><Mail className="size-3.5 text-ochre" />邮箱</span>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={fieldClass} autoComplete="email" />
                </label>
                <label className="block">
                  <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-ink/50"><LockKeyhole className="size-3.5 text-ochre" />密码</span>
                  <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="至少 6 位" className={fieldClass} autoComplete={mode === "signup" ? "new-password" : "current-password"} />
                </label>

                {message ? <div className="rounded-xl border border-ochre/25 bg-ochre/8 px-3 py-2.5 text-xs font-semibold leading-relaxed text-ink/70">{message}</div> : null}

                <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3.5 text-sm font-extrabold text-cream shadow-sm transition hover:-translate-y-0.5 hover:bg-ink/90 disabled:cursor-wait disabled:opacity-50">
                  {busy ? "处理中…" : mode === "signup" ? "创建账号并继续" : "登录 Solstice"}
                  <ArrowRight className="size-4 text-ochre" />
                </button>
              </form>

              <p className="mt-6 text-center text-[11px] leading-relaxed text-ink/35">
                只需要邮箱和密码，不需要绑定手机号。你的职业资料由你自己控制。
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function tabClass(active: boolean) {
  return "flex-1 rounded-lg px-3 py-2 text-xs font-extrabold transition " +
    (active ? "bg-white text-ink shadow-sm" : "text-ink/40 hover:text-ink");
}

const fieldClass = "w-full rounded-xl border border-ink/10 bg-white px-3.5 py-3 text-sm font-semibold text-ink outline-none transition focus:border-ochre focus:ring-2 focus:ring-ochre/15";
