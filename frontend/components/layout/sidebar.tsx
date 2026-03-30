"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/constants";
import { Separator } from "@/components/ui/separator";

export function Sidebar() {
  const pathname = usePathname();

  const groups = NAV_ITEMS.reduce(
    (acc, item) => {
      const g = item.group ?? "Lainnya";
      if (!acc[g]) acc[g] = [];
      acc[g].push(item);
      return acc;
    },
    {} as Record<string, typeof NAV_ITEMS>,
  );

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-30">
      <div className="flex flex-col flex-grow bg-sidebar border-r border-sidebar-border overflow-y-auto">
        {/* Logo / Title */}
        <div className="flex items-center gap-3 px-4 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-sm">
            ID
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-sidebar-foreground">
              IDSS Piutang
            </span>
            <span className="text-xs text-muted-foreground">
              Decision Support System
            </span>
          </div>
        </div>

        <Separator />

        {/* Navigation */}
        <nav className="flex-1 px-3 py-5 space-y-6" aria-label="Navigasi utama">
          {Object.entries(groups).map(([groupName, items]) => (
            <div key={groupName}>
              <p className="px-3 mb-2 text-[0.65rem] font-semibold tracking-[0.1em] uppercase text-muted-foreground/70">
                {groupName}
              </p>
              <div className="space-y-0.5">
                {items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/" && pathname.startsWith(item.href));
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                      )}
                      aria-current={isActive ? "page" : undefined}
                    >
                      {/* Active indicator bar */}
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary" />
                      )}
                      <Icon className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        isActive ? "text-primary" : ""
                      )} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-sidebar-border space-y-2">
          <p className="text-xs text-muted-foreground text-center">
            Skripsi &copy; 2024
          </p>
          <div className="flex items-center justify-center gap-3 text-[11px] text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privasi
            </Link>
            <span aria-hidden="true">•</span>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Ketentuan
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
