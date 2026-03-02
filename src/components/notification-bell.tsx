"use client";

import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useUser } from "@/lib/user-context";
import { cn } from "@/lib/utils";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function NotificationBell() {
  const { currentUser } = useUser();
  const { data: notifications = [] } = useSWR(
    currentUser ? `/api/notifications?userId=${currentUser.id}` : null,
    fetcher,
    { refreshInterval: 5000 }
  );

  const unreadCount = notifications.filter((n: { read: boolean }) => !n.read).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-7 w-7 text-slate-400 hover:text-white hover:bg-white/10">
          <Bell className="h-3.5 w-3.5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-red-500 text-[9px] text-white flex items-center justify-center font-medium">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Notifications</h4>
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notifications</p>
          ) : (
            notifications.map((n: { id: string; message: string; read: boolean; createdAt: string }) => (
              <div
                key={n.id}
                className={cn(
                  "p-2 rounded text-sm",
                  n.read ? "text-muted-foreground" : "bg-accent"
                )}
              >
                {n.message}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
