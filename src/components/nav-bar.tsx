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
  { label: "Admin", href: "/admin" },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <header className="border-b bg-background">
      <div className="flex h-14 items-center px-6">
        <div className="flex items-center gap-1 mr-8">
          <span className="font-semibold text-lg">Deal Closing</span>
        </div>
        <nav className="flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "px-3 py-1.5 text-sm rounded-md transition-colors",
                pathname.startsWith(item.href)
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <NotificationBell />
          <UserSwitcher />
        </div>
      </div>
    </header>
  );
}
