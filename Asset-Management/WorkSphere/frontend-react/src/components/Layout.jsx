import { useMemo, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Menu, LogOut, Shield, X } from "lucide-react";

import { navigationItems } from "../app/routeConfig";
import { clearSession, getStoredUser } from "../services/auth";
import { Button } from "./Button";

export function Layout({ title, subtitle, children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const user = getStoredUser();
  const navigate = useNavigate();
  const location = useLocation();

  const visibleNavItems = useMemo(
    () => navigationItems.filter((item) => item.roles.includes(user?.role)),
    [user?.role],
  );

  const handleLogout = () => {
    clearSession();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,_rgba(63,99,255,0.12),_transparent_26%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.10),_transparent_24%),linear-gradient(180deg,#f8fbff_0%,#eef3fb_100%)] text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px]">
        <aside className="hidden w-64 shrink-0 border-r border-slate-200/80 bg-slate-950/95 px-5 py-6 text-slate-100 xl:block 2xl:w-72">
          <Brand />
          <NavList items={visibleNavItems} currentPath={location.pathname} />
        </aside>

        {menuOpen && (
          <div className="fixed inset-0 z-40 bg-slate-950/45 xl:hidden" onClick={() => setMenuOpen(false)}>
            <aside
              className="h-full w-[86vw] max-w-xs overflow-y-auto bg-slate-950 px-4 py-5 text-slate-100 shadow-2xl sm:px-5 sm:py-6"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-5 flex items-center justify-between">
                <Brand compact />
                <Button variant="ghost" className="h-10 w-10 p-0 text-slate-100 hover:bg-white/10" onClick={() => setMenuOpen(false)} aria-label="Close menu">
                  <X size={18} />
                </Button>
              </div>
              <NavList items={visibleNavItems} currentPath={location.pathname} onNavigate={() => setMenuOpen(false)} />
            </aside>
          </div>
        )}

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur">
            <div className="flex flex-col gap-4 px-3 py-3 sm:px-4 md:px-6 xl:flex-row xl:items-center xl:justify-between xl:px-8 xl:py-4">
              <div className="flex min-w-0 items-start gap-3 sm:items-center">
                <Button variant="secondary" className="h-10 w-10 shrink-0 p-0 xl:hidden" onClick={() => setMenuOpen(true)} aria-label="Open menu">
                  <Menu size={18} />
                </Button>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-700 sm:text-xs sm:tracking-[0.24em]">
                    <Shield size={14} /> WorkSphere
                  </div>
                  <h1 className="break-words font-display text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl md:text-3xl">{title}</h1>
                  {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <div className="hidden text-right sm:block">
                  <div className="text-sm font-semibold text-slate-900">{user?.user_name || "User"}</div>
                  <div className="text-xs text-slate-500">{user?.role || ""}</div>
                </div>
                <Button variant="secondary" onClick={handleLogout} className="shrink-0">
                  <LogOut size={16} />
                  <span>Logout</span>
                </Button>
              </div>
            </div>
          </header>

          <div className="min-w-0 flex-1 px-3 py-4 sm:px-4 md:px-6 md:py-6 xl:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

function Brand({ compact = false }) {
  return (
    <Link to="/dashboard" className="flex min-w-0 items-center gap-3">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 via-cyan-400 to-ink-500 font-display text-base font-bold text-white shadow-glow sm:h-12 sm:w-12 sm:text-lg">
        WS
      </div>
      {!compact && (
        <div className="min-w-0">
          <div className="font-display text-xl font-semibold">WorkSphere</div>
          <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Asset Management</div>
        </div>
      )}
    </Link>
  );
}

function NavList({ items, currentPath, onNavigate }) {
  return (
    <nav className="mt-8 space-y-1">
      {items.map((item) => {
        const active = currentPath === item.path || (item.path === "/assets" && currentPath.startsWith("/assets"));
        return (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            className={`block rounded-2xl px-4 py-3 text-sm font-semibold transition ${
              active
                ? "bg-white/10 text-white ring-1 ring-white/10"
                : "text-slate-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}
