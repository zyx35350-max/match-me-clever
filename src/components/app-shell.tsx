import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  Archive,
  BriefcaseBusiness,
  FilePlus2,
  Heart,
  Home,
  LayoutDashboard,
  ListChecks,
  Sparkles,
  Target,
  Upload,
  UserRound,
  LogOut,
  Zap,
} from "lucide-react";

import { useWorkspace } from "@/lib/store";

const nav = [
  { to: "/", label: "首页", en: "Dashboard", icon: LayoutDashboard, group: "核心工作台" },
  { to: "/matching", label: "岗位匹配", en: "Matching", icon: Target, group: "核心工作台" },
  { to: "/today", label: "今日推荐", en: "Today", icon: Zap, group: "核心工作台" },
  { to: "/saved", label: "已收藏", en: "Saved", icon: Heart, group: "求职管理" },
  { to: "/activity", label: "求职记录", en: "Activity", icon: ListChecks, group: "求职管理" },
  { to: "/import", label: "导入岗位", en: "Import", icon: Upload, group: "求职管理" },
  { to: "/hidden", label: "已隐藏", en: "Hidden", icon: Archive, group: "求职管理" },
  { to: "/profile", label: "我的资料", en: "Profile", icon: UserRound, group: "个人" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading, profileLoading, profileComplete, signOut } = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);

  useEffect(() => {
    if (loading || profileLoading) return;
    if (!user) {
      void navigate({ to: "/auth", replace: true });
    } else if (!profileComplete && location.pathname !== "/onboarding") {
      void navigate({ to: "/onboarding", replace: true });
    }
  }, [loading, profileLoading, user, profileComplete, location.pathname, navigate]);

  if (loading || profileLoading || !user || !profileComplete) {
    return <div className="grid min-h-screen place-items-center bg-white text-sm font-semibold text-ink/45">正在连接你的 Solstice 工作台…</div>;
  }

  return (
    <div className="app-shell min-h-screen text-ink">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] border-r border-ink/8 bg-white px-4 py-5 lg:flex lg:flex-col">
        <Link to="/" className="mb-7 flex items-center gap-3 rounded-2xl px-2 py-1.5">
          <div className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-ink text-cream shadow-sm">
            <Sparkles className="size-4" />
            <span className="absolute -right-1 -top-1 size-5 rounded-full bg-ochre blur-[2px]" />
          </div>
          <div className="leading-none">
            <div className="font-display text-[18px] font-extrabold tracking-tight">Solstice</div>
            <div className="mt-1 text-[9px] font-bold tracking-[0.2em] text-ink/45 uppercase">AI Job OS</div>
          </div>
        </Link>

        <nav className="space-y-4">
          {(["核心工作台", "求职管理", "个人"] as const).map((group) => (
            <div key={group}>
              <div className="mb-1.5 px-2 text-[9px] font-bold tracking-[0.2em] text-ink/30">{group}</div>
              <div className="space-y-0.5">
                {nav.filter((item) => item.group === group).map((item) => {
                  const Icon = item.icon;
                  const active = item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                        active
                          ? "bg-ochre/12 text-ink shadow-[0_4px_14px_rgba(230,170,0,0.08)]"
                          : "text-ink/58 hover:bg-ochre/7 hover:text-ink"
                      }`}
                    >
                      {active ? <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full bg-ochre" /> : null}
                      <Icon className={`size-4 ${active ? "text-ochre" : "text-ink/35 group-hover:text-ochre"}`} />
                      <span className="min-w-0">
                        <span className="block text-[13px] font-semibold">{item.label}</span>
                        <span className={`block text-[9px] tracking-wide ${active ? "text-ink/45" : "text-ink/30"}`}>{item.en}</span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-auto">
          <div className="grain mb-4 overflow-hidden rounded-2xl border border-ochre/20 bg-gradient-to-br from-ochre/16 via-white to-ochre/5 p-3">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-bold text-ink/65">
              <Sparkles className="size-3.5 text-ochre" />
              AI Career Space
            </div>
            <p className="text-[11px] leading-relaxed text-ink/50">让岗位、能力与职业方向在一个工作台里连接起来。</p>
          </div>
        </div>
      </aside>

      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-30 border-b border-ink/8 bg-white/95 backdrop-blur-xl">
          <div className="mx-auto flex min-h-16 max-w-[1380px] items-center gap-3 px-4 sm:px-6">
            <Link to="/" className="flex items-center gap-2 lg:hidden">
              <div className="grid size-8 place-items-center rounded-lg bg-ink text-cream"><Sparkles className="size-4" /></div>
              <span className="font-display font-extrabold">Solstice</span>
            </Link>
            <div className="hidden lg:block">
              <div className="text-[10px] font-bold tracking-[0.2em] text-ink/35 uppercase">AI Job Search Workspace</div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="relative">
              <button
                type="button"
                onClick={() => setAccountOpen((open) => !open)}
                aria-label="打开账号菜单"
                title="账号"
                className="grid size-9 place-items-center rounded-full border border-ochre/35 bg-ochre/16 text-xs font-bold shadow-sm transition hover:-translate-y-0.5 hover:bg-ochre/25"
              >
                S
              </button>
              {accountOpen ? (
                <div className="absolute right-0 top-11 w-56 rounded-2xl border border-ink/10 bg-white p-2 shadow-2xl shadow-ink/10">
                  <div className="border-b border-ink/8 px-3 py-2">
                    <div className="text-[9px] font-bold tracking-[0.18em] text-ink/30 uppercase">ACCOUNT</div>
                    <div className="mt-1 truncate text-xs font-semibold text-ink/65">{user.email ?? "已登录"}</div>
                  </div>
                  <Link to="/profile" onClick={() => setAccountOpen(false)} className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold hover:bg-ochre/8">
                    <UserRound className="size-3.5 text-ochre" /> 我的资料
                  </Link>
                  <button type="button" onClick={() => void signOut()} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold text-ink/55 hover:bg-ink/5">
                    <LogOut className="size-3.5" /> 退出登录
                  </button>
                </div>
              ) : null}
            </div>
            </div>
          </div>
        </header>

        <main className="app-content mx-auto max-w-[1380px] px-4 py-6 sm:px-6 lg:py-8">{children}</main>

        <nav className="fixed inset-x-3 bottom-3 z-50 flex overflow-x-auto rounded-2xl border border-ink/10 bg-white/90 p-1.5 shadow-2xl shadow-ink/10 backdrop-blur-xl lg:hidden">
          {nav.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const active = item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
            return (
              <Link key={item.to} to={item.to} className={`flex min-w-[72px] flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-[10px] font-semibold ${active ? "bg-ink text-cream" : "text-ink/50"}`}>
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <div className="mb-1 text-[10px] font-bold tracking-[0.22em] text-ochre uppercase">{eyebrow}</div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">{title}</h1>
        {description ? <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-ink/50">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
