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
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const roleColors: Record<string, { bg: string; text: string; border: string; avatar: string }> = {
  entry: { bg: "bg-blue-500/20", text: "text-blue-300", border: "border-blue-400/50", avatar: "bg-blue-600 text-blue-100" },
  approver: { bg: "bg-amber-500/20", text: "text-amber-300", border: "border-amber-400/50", avatar: "bg-amber-600 text-amber-100" },
  admin: { bg: "bg-emerald-500/20", text: "text-emerald-300", border: "border-emerald-400/50", avatar: "bg-emerald-600 text-emerald-100" },
};

const roleLabels: Record<string, string> = {
  entry: "Data Entry",
  approver: "Portfolio Manager",
  admin: "Admin",
};

export function UserSwitcher() {
  const { currentUser, setCurrentUser, users } = useUser();

  if (!currentUser) return null;

  const initials = currentUser.name
    .split(" ")
    .map((n) => n[0])
    .join("");

  const colors = roleColors[currentUser.role] || roleColors.entry;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className={`flex items-center gap-2 h-8 px-2.5 rounded-md ${colors.bg} hover:opacity-90 transition-opacity`}>
          <Avatar className="h-5 w-5">
            <AvatarFallback className={`text-[9px] font-bold ${colors.avatar}`}>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-start leading-none">
            <span className="text-xs font-medium text-white">{currentUser.name}</span>
            <span className={`text-[10px] ${colors.text}`}>{roleLabels[currentUser.role]}</span>
          </div>
          <Badge variant="outline" className={`text-[10px] ${colors.border} ${colors.text} px-1.5 py-0 ml-1`}>
            {roleLabels[currentUser.role]}
          </Badge>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Switch User</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {users.map((user) => {
          const userColors = roleColors[user.role] || roleColors.entry;
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
              <Badge variant="outline" className={`ml-auto text-xs ${user.role === "approver" ? "border-amber-300 text-amber-700" : user.role === "admin" ? "border-emerald-300 text-emerald-700" : "border-blue-300 text-blue-700"}`}>
                {roleLabels[user.role]}
              </Badge>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
