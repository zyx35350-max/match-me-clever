import { Link, useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  Archive,
  BriefcaseBusiness,
  Compass,
  FilePlus2,
  Heart,
  Home,
  LayoutDashboard,
  ListChecks,
  Sparkles,
  Target,
  Upload,
  UserRound,
  Zap,
} from "lucide-react";

import avatar from "@/assets/avatar.jpg";
import { useWorkspace } from "@/lib/store";

const nav = [
  { to: "/", label: "首页", en: "Dashboard", icon: LayoutDashboard },
  { to: "/matching", label: "岗位匹配", en: "Matching", icon: Target },
  { to: "/today", label: "今日推荐", en: "Today", icon: Zap },
  { to: "/saved", label: "已收藏", en: "Saved", icon: Heart },
  { to: "/activity", label: "求职记录", en: "Activity", icon: ListChecks },
  { to: "/directions", label: "职业方向", en: "Directions", icon: Compass },
  { to: "/import", label: "导入岗位", en: "Import", icon: Upload },
  { to: "/hidden", label: "已隐藏", en: "Hidden", icon: Archive },
  { to: "/profile", label: "我的资料", en: "Profile", icon: UserRound },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { profile } = useWorkspace();
  const location = useLocation();

  return (
    <div className="app-shell min-h-screen text-ink">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] border-r border-ink/10 bg-[#fbfaf6]/92 px-4 py-5 backdrop-blur-xl lg:flex lg:flex-col">
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

        <div className="mb-3 px-2 text-[9px] font-bold tracking-[0.22em] text-ink/35 uppercase">Workspace</div>
        <nav className="space-y-1">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all ${active
                  ? "bg-ink text-cream shadow-[0_8px_24px_rgba(25,25,20,0.10)]"
                  : "text-ink/65 hover:bg-ochre/10 hover:text-ink"}`}
              >
                {active ? <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-ochre" /> : null}
                <Icon className={`size-4 ${active ? "text-ochre-soft" : "text-ink/45 group-hover:text-ochre"}`} />
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold">{item.label}</span>
                  <span className={`block text-[9px] tracking-wide ${active ? "text-cream/55" : "text-ink/35"}`}>{item.en}</span>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto">
          <div className="mb-4 overflow-hidden rounded-2xl border border-ochre/20 bg-gradient-to-br from-ochre/20 via-cream to-ink/5 p-3">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-bold text-ink/65">
              <Sparkles className="size-3.5 text-ochre" />
              AI Career Space
            </div>
            <p className="text-[11px] leading-relaxed text-ink/50">让岗位、能力与职业方向在一个工作台里连接起来。</p>
          </div>
          <Link to="/profile" className="flex items-center gap-3 rounded-2xl border border-ink/8 bg-white/70 p-2.5 hover:bg-white">
            <img src={avatar} alt="" width={816} height={816} className="size-9 rounded-xl object-cover" />
            <div className="min-w-0">
              <div className="truncate text-xs font-bold">{profile.name}</div>
              <div className="truncate text-[10px] text-ink/45">{profile.headline}</div>
            </div>
          </Link>
        </div>
      </aside>

      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-30 border-b border-ink/8 bg-[#fbfaf6]/80 backdrop-blur-xl">
          <div className="mx-auto flex min-h-16 max-w-[1380px] items-center gap-3 px-4 sm:px-6">
            <Link to="/" className="flex items-center gap-2 lg:hidden">
              <div className="grid size-8 place-items-center rounded-lg bg-ink text-cream"><Sparkles className="size-4" /></div>
              <span className="font-display font-extrabold">Solstice</span>
            </Link>
            <div className="hidden lg:block">
              <div className="text-[10px] font-bold tracking-[0.2em] text-ink/35 uppercase">AI Job Search Workspace</div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="hidden rounded-full border border-ink/10 bg-white/70 px-3 py-2 text-xs text-ink/45 sm:block">⌘ K · 快速搜索</div>
              <div className="grid size-9 place-items-center rounded-full bg-ochre/20 text-xs font-bold">S</div>
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
