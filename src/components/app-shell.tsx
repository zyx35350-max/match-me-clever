import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import avatar from "@/assets/avatar.jpg";
import { useWorkspace } from "@/lib/store";

const primaryNav = [
  { to: "/", label: "Dashboard" },
  { to: "/matching", label: "Matching" },
  { to: "/today", label: "Today" },
  { to: "/saved", label: "Saved" },
  { to: "/activity", label: "Activity" },
] as const;

const secondaryNav = [
  { to: "/profile", label: "Profile" },
  { to: "/directions", label: "Directions" },
  { to: "/hidden", label: "Hidden" },
  { to: "/import", label: "Import Job" },
] as const;

function navClass(active = false) {
  return active
    ? "rounded-full bg-ink px-3 py-2 text-sm font-semibold text-cream"
    : "rounded-full px-3 py-2 text-sm font-medium text-ink/70 transition-colors hover:bg-sand hover:text-ink";
}

export function AppShell({ children }: { children: ReactNode }) {
  const { profile } = useWorkspace();

  return (
    <div className="min-h-screen bg-cream text-ink">
      <header className="sticky top-0 z-20 border-b border-ink/10 bg-cream/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-[1200px] items-center gap-5 px-5">
          <Link to="/" className="flex shrink-0 items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-full bg-ochre">
              <span className="font-display text-lg leading-none font-extrabold text-cream">S</span>
            </div>
            <div className="hidden leading-none sm:block">
              <div className="font-display text-[18px] font-extrabold tracking-tight">Solstice</div>
              <div className="mt-1 text-[9px] font-semibold tracking-[0.23em] text-azure uppercase">
                AI Job Search
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-0.5 md:flex">
            {primaryNav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === "/" }}
                className="rounded-full px-3 py-2 text-sm font-medium text-ink/70 transition-colors hover:bg-sand hover:text-ink"
                activeProps={{ className: navClass(true) }}
              >
                {item.label}
              </Link>
            ))}

            <details className="relative ml-1">
              <summary className="cursor-pointer list-none rounded-full px-3 py-2 text-sm font-medium text-ink/60 transition-colors hover:bg-sand hover:text-ink">
                More
              </summary>
              <div className="absolute right-0 mt-2 w-44 rounded-2xl border border-ink/10 bg-card p-1.5 shadow-lg shadow-ink/5">
                {secondaryNav.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="block rounded-xl px-3 py-2.5 text-sm font-medium text-ink/70 hover:bg-sand hover:text-ink"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </details>
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right leading-tight sm:block">
              <div className="text-sm font-semibold">{profile.name}</div>
              <div className="text-[11px] text-ink/45">{profile.headline}</div>
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

        <nav className="flex items-center gap-1 overflow-x-auto border-t border-ink/10 px-4 py-2 md:hidden">
          {primaryNav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className="shrink-0 rounded-full px-3 py-1.5 text-xs font-medium text-ink/65"
              activeProps={{ className: "shrink-0 rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-cream" }}
            >
              {item.label}
            </Link>
          ))}
          <details className="relative shrink-0">
            <summary className="cursor-pointer list-none rounded-full px-3 py-1.5 text-xs font-medium text-ink/65 hover:bg-sand">
              More
            </summary>
            <div className="absolute right-0 z-30 mt-2 w-40 rounded-2xl border border-ink/10 bg-card p-1.5 shadow-lg shadow-ink/5">
              {secondaryNav.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="block rounded-xl px-3 py-2.5 text-xs font-medium text-ink/70 hover:bg-sand"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </details>
        </nav>
      </header>

      <main className="mx-auto max-w-[1200px] px-5 py-7 md:py-8">{children}</main>
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
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <div className="mb-1.5 text-[10px] font-semibold tracking-[0.25em] text-azure uppercase">
          {eyebrow}
        </div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">{title}</h1>
        {description ? <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-ink/55">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
