import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import avatar from "@/assets/avatar.jpg";
import { useWorkspace } from "@/lib/store";

const navItems = [
  { to: "/", label: "Dashboard" },
  { to: "/profile", label: "Profile" },
  { to: "/directions", label: "Directions" },
  { to: "/matching", label: "Matching" },
  { to: "/today", label: "Today" },
  { to: "/saved", label: "Saved" },
  { to: "/activity", label: "Activity" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { profile } = useWorkspace();

  return (
    <div className="min-h-screen bg-cream text-ink">
      <header className="sticky top-0 z-20 border-b border-ink/10 bg-cream/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-8 px-5">
          <Link to="/" className="flex items-end gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-ochre">
              <span className="font-display text-lg leading-none font-extrabold text-cream">S</span>
            </div>
            <div className="leading-none">
              <div className="font-display text-[19px] font-extrabold tracking-tight">Solstice</div>
              <div className="text-[10px] tracking-[0.25em] text-azure uppercase">AI Job Search</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 text-sm font-medium md:flex">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === "/" }}
                className="rounded-full px-3 py-2 transition-colors hover:bg-sand"
                activeProps={{ className: "bg-ink text-cream hover:bg-ink" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right leading-tight sm:block">
              <div className="text-sm font-semibold">{profile.name}</div>
              <div className="text-[11px] text-ink/50">{profile.headline}</div>
            </div>
            <img
              src={avatar}
              alt=""
              width={816}
              height={816}
              className="size-9 rounded-full object-cover outline-1 -outline-offset-1 outline-ink/10"
            />
          </div>
        </div>
        <nav className="flex items-center gap-1 overflow-x-auto border-t border-ink/10 px-4 py-2 text-sm font-medium md:hidden">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className="rounded-full px-3 py-1.5 whitespace-nowrap"
              activeProps={{ className: "bg-ink text-cream" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-[1200px] px-5 py-8">{children}</main>
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
      <div>
        <div className="mb-2 text-[11px] font-semibold tracking-[0.3em] text-azure uppercase">
          {eyebrow}
        </div>
        <h1 className="font-display text-3xl font-extrabold">{title}</h1>
        {description ? <p className="mt-2 max-w-xl text-sm text-ink/60">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
