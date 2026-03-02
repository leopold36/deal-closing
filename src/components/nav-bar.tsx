"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserSwitcher } from "./user-switcher";
import { NotificationBell } from "./notification-bell";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Deals", href: "/deals" },
  { label: "My Tasks", href: "/my-tasks" },
  { label: "Snowflake Integration", href: "/snowflake" },
  { label: "Database Schema", href: "/schema" },
  { label: "Admin", href: "/admin" },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800">
      <div className="flex h-10 items-center px-4">
        <div className="flex items-center gap-2 mr-6">
          <div className="h-5 w-5 rounded bg-blue-500 flex items-center justify-center">
            <span className="text-[10px] font-bold text-white">DC</span>
          </div>
          <span className="font-semibold text-sm tracking-tight">Deal Closing</span>
        </div>
        <nav className="flex items-center gap-0.5">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "px-2.5 py-1 text-xs rounded transition-colors",
                pathname.startsWith(item.href)
                  ? "bg-white/15 text-white font-medium"
                  : "text-slate-400 hover:text-white hover:bg-white/10"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <NotificationBell />
          <UserSwitcher />
        </div>
      </div>
    </header>
  );
}
