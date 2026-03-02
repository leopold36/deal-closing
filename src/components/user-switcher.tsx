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
        <Button variant="ghost" className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <span className="text-sm">{currentUser.name}</span>
          <Badge variant="outline" className="text-xs">
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
