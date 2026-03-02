"use client";

import { useUser } from "@/lib/user-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const roleConfig: Record<string, { label: string; badge: string; avatar: string; dropdownBadge: string }> = {
  entry: {
    label: "Data Entry",
    badge: "bg-blue-500 text-white",
    avatar: "bg-blue-600 text-white",
    dropdownBadge: "border-blue-300 text-blue-700 bg-blue-50",
  },
  approver: {
    label: "Approver / Portfolio Manager",
    badge: "bg-amber-500 text-white",
    avatar: "bg-amber-600 text-white",
    dropdownBadge: "border-amber-300 text-amber-700 bg-amber-50",
  },
  admin: {
    label: "Admin",
    badge: "bg-emerald-500 text-white",
    avatar: "bg-emerald-600 text-white",
    dropdownBadge: "border-emerald-300 text-emerald-700 bg-emerald-50",
  },
};

export function UserSwitcher() {
  const { currentUser, setCurrentUser, users } = useUser();

  if (!currentUser) return null;

  const initials = currentUser.name
    .split(" ")
    .map((n) => n[0])
    .join("");

  const config = roleConfig[currentUser.role] || roleConfig.entry;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 h-8 px-2.5 rounded-md bg-slate-800 hover:bg-slate-700 transition-colors outline-none">
          <Avatar className="h-5 w-5">
            <AvatarFallback className={`text-[9px] font-bold ${config.avatar}`}>{initials}</AvatarFallback>
          </Avatar>
          <span className="text-xs font-medium text-slate-200">{currentUser.name}</span>
          <Badge className={`text-[10px] font-semibold px-1.5 py-0 ${config.badge} border-0`}>
            {config.label}
          </Badge>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Switch User</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {users.map((user) => {
          const userConfig = roleConfig[user.role] || roleConfig.entry;
          return (
            <DropdownMenuItem
              key={user.id}
              onClick={() => setCurrentUser(user)}
              className={user.id === currentUser.id ? "bg-accent" : ""}
            >
              <div className="flex flex-col">
                <span>{user.name}</span>
                <span className="text-xs text-muted-foreground">{user.email}</span>
              </div>
              <Badge variant="outline" className={`ml-auto text-[10px] ${userConfig.dropdownBadge}`}>
                {userConfig.label}
              </Badge>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
