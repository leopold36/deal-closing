"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { UserSwitcher } from "./user-switcher";
import { NotificationBell } from "./notification-bell";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

const navItems = [
  { label: "Deals", href: "/deals" },
  { label: "My Tasks", href: "/my-tasks" },
  { label: "Admin", href: "/admin" },
];

const devItems = [
  { label: "Snowflake Integration", href: "/snowflake" },
  { label: "Snowflake Data", href: "/snowflake-data" },
  { label: "Database Schema", href: "/schema" },
];

export function NavBar() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/login") return null;

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800">
      <div className="flex h-10 items-center px-4">
        <Link href="/deals" className="flex items-center gap-2 mr-6 hover:opacity-80 transition-opacity">
          <span className="text-sm font-bold tracking-wide">LGT</span>
          <span className="text-slate-500">|</span>
          <span className="font-semibold text-sm tracking-tight">Deal Closing</span>
        </Link>
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
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 text-xs rounded transition-colors outline-none",
                devItems.some((d) => pathname.startsWith(d.href))
                  ? "bg-white/15 text-white font-medium"
                  : "text-slate-400 hover:text-white hover:bg-white/10"
              )}
            >
              Developer
              <ChevronDown className="h-3 w-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {devItems.map((item) => (
                <DropdownMenuItem key={item.href} asChild>
                  <Link href={item.href} className={cn(
                    pathname.startsWith(item.href) && "bg-accent"
                  )}>
                    {item.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <NotificationBell />
          <UserSwitcher />
          <span className="text-slate-700 mx-1">|</span>
          <button
            onClick={handleSignOut}
            className="text-[11px] text-slate-500 hover:text-white transition-colors whitespace-nowrap"
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
