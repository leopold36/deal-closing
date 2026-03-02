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

export function UserSwitcher() {
  const { currentUser, setCurrentUser, users } = useUser();

  if (!currentUser) return null;

  const initials = currentUser.name
    .split(" ")
    .map((n) => n[0])
    .join("");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-1.5 text-slate-300 hover:text-white hover:bg-white/10 h-7 px-2">
          <Avatar className="h-5 w-5">
            <AvatarFallback className="text-[9px] bg-slate-700 text-slate-300">{initials}</AvatarFallback>
          </Avatar>
          <span className="text-xs">{currentUser.name}</span>
          <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-400 px-1 py-0">
            {currentUser.role}
          </Badge>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Switch User</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {users.map((user) => (
          <DropdownMenuItem
            key={user.id}
            onClick={() => setCurrentUser(user)}
            className={user.id === currentUser.id ? "bg-accent" : ""}
          >
            <div className="flex flex-col">
              <span>{user.name}</span>
              <span className="text-xs text-muted-foreground">{user.email}</span>
            </div>
            <Badge variant="outline" className="ml-auto text-xs">
              {user.role}
            </Badge>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
