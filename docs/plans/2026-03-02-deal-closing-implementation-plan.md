# Deal Closing Approval Workflow — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a deal closing workflow prototype with AI-powered data extraction, two-stage approval flow, full audit trail, and a Snowflake integration documentation view.

**Architecture:** Monolithic Next.js 15 (App Router) with Claude Agent SDK (TypeScript) running in API routes. SQLite via Drizzle ORM for persistence. Local filesystem for document uploads.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, Drizzle ORM, better-sqlite3, @anthropic-ai/claude-agent-sdk, zod, SWR

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- Create: `components.json` (shadcn config)
- Create: `.env.local`
- Create: `.gitignore`

**Step 1: Initialize Next.js project**

```bash
cd "/Users/leopoldhaex/LEHA/LGT/AI - Application/Deal Closing"
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --turbopack --use-npm
```

Accept defaults. This creates the full Next.js scaffold.

**Step 2: Install core dependencies**

```bash
npm install drizzle-orm better-sqlite3 @anthropic-ai/claude-agent-sdk zod uuid swr
npm install -D drizzle-kit @types/better-sqlite3 @types/uuid
```

**Step 3: Install shadcn/ui**

```bash
npx shadcn@latest init -d
```

Then add the components we need:

```bash
npx shadcn@latest add button card input label select textarea badge dialog popover tabs table toast dropdown-menu separator scroll-area sheet avatar alert
```

**Step 4: Create .env.local**

```env
ANTHROPIC_API_KEY=your-api-key-here
DATABASE_URL=sqlite.db
```

**Step 5: Create uploads directory**

```bash
mkdir -p uploads
echo "uploads/*" >> .gitignore
echo "!uploads/.gitkeep" >> .gitignore
touch uploads/.gitkeep
```

**Step 6: Initialize git and commit**

```bash
git init
git add -A
git commit -m "chore: scaffold Next.js project with dependencies"
```

---

## Task 2: Database Schema & Drizzle Setup

**Files:**
- Create: `src/db/schema.ts`
- Create: `src/db/index.ts`
- Create: `drizzle.config.ts`
- Create: `src/db/seed.ts`

**Step 1: Create Drizzle config**

Create `drizzle.config.ts`:

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: "./sqlite.db",
  },
});
```

**Step 2: Create database schema**

Create `src/db/schema.ts`:

```typescript
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role", { enum: ["entry", "approver", "admin"] }).notNull(),
});

export const deals = sqliteTable("deals", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  counterparty: text("counterparty"),
  equityTicker: text("equity_ticker"),
  investmentAmount: real("investment_amount"),
  dealDate: text("deal_date"),
  settlementDate: text("settlement_date"),
  notes: text("notes"),
  status: text("status", {
    enum: ["entry", "pending_approval", "approved", "rejected"],
  })
    .notNull()
    .default("entry"),
  createdBy: text("created_by").references(() => users.id),
  assignedApprover: text("assigned_approver").references(() => users.id),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const documents = sqliteTable("documents", {
  id: text("id").primaryKey(),
  dealId: text("deal_id").references(() => deals.id),
  filename: text("filename").notNull(),
  filepath: text("filepath").notNull(),
  mimeType: text("mime_type"),
  uploadedBy: text("uploaded_by").references(() => users.id),
  uploadedAt: text("uploaded_at").notNull(),
});

export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey(),
  dealId: text("deal_id").references(() => deals.id),
  userId: text("user_id").references(() => users.id),
  action: text("action", {
    enum: [
      "CREATED",
      "FIELD_UPDATED",
      "AGENT_EXTRACTED",
      "SUBMITTED",
      "APPROVED",
      "REJECTED",
    ],
  }).notNull(),
  fieldName: text("field_name"),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  source: text("source", { enum: ["manual", "agent"] }),
  documentId: text("document_id").references(() => documents.id),
  documentPage: integer("document_page"),
  comment: text("comment"),
  timestamp: text("timestamp").notNull(),
});

export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  dealId: text("deal_id").references(() => deals.id),
  message: text("message").notNull(),
  read: integer("read", { mode: "boolean" }).default(false),
  createdAt: text("created_at").notNull(),
});

export const chatMessages = sqliteTable("chat_messages", {
  id: text("id").primaryKey(),
  dealId: text("deal_id").references(() => deals.id),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  timestamp: text("timestamp").notNull(),
});
```

**Step 3: Create database connection**

Create `src/db/index.ts`:

```typescript
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const sqlite = new Database("./sqlite.db");
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
```

**Step 4: Create seed script**

Create `src/db/seed.ts`:

```typescript
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { v4 as uuid } from "uuid";
import * as schema from "./schema";

const sqlite = new Database("./sqlite.db");
const db = drizzle(sqlite, { schema });

async function seed() {
  // Clear existing data
  db.delete(schema.chatMessages).run();
  db.delete(schema.notifications).run();
  db.delete(schema.auditLogs).run();
  db.delete(schema.documents).run();
  db.delete(schema.deals).run();
  db.delete(schema.users).run();

  // Create dummy users
  const users = [
    {
      id: uuid(),
      name: "John Smith",
      email: "john.smith@lgt.com",
      role: "entry" as const,
    },
    {
      id: uuid(),
      name: "Maria Jones",
      email: "maria.jones@lgt.com",
      role: "approver" as const,
    },
    {
      id: uuid(),
      name: "Admin User",
      email: "admin@lgt.com",
      role: "admin" as const,
    },
  ];

  for (const user of users) {
    db.insert(schema.users).values(user).run();
  }

  console.log("Seed complete. Created users:", users.map((u) => u.email));
}

seed();
```

**Step 5: Generate migration and run seed**

```bash
npx drizzle-kit generate
npx drizzle-kit push
npx tsx src/db/seed.ts
```

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add database schema and seed data"
```

---

## Task 3: User Context & Impersonation

**Files:**
- Create: `src/lib/user-context.tsx`
- Create: `src/app/api/users/route.ts`
- Create: `src/app/api/auth/impersonate/route.ts`
- Create: `src/components/user-switcher.tsx`

**Step 1: Create user context provider**

Create `src/lib/user-context.tsx`:

```typescript
"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type User = {
  id: string;
  name: string;
  email: string;
  role: "entry" | "approver" | "admin";
};

type UserContextType = {
  currentUser: User | null;
  setCurrentUser: (user: User) => void;
  users: User[];
  loading: boolean;
};

const UserContext = createContext<UserContextType>({
  currentUser: null,
  setCurrentUser: () => {},
  users: [],
  loading: true,
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUserState] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => {
        setUsers(data);
        // Restore from localStorage or default to first user
        const savedId = localStorage.getItem("currentUserId");
        const saved = data.find((u: User) => u.id === savedId);
        setCurrentUserState(saved || data[0] || null);
        setLoading(false);
      });
  }, []);

  const setCurrentUser = (user: User) => {
    setCurrentUserState(user);
    localStorage.setItem("currentUserId", user.id);
  };

  return (
    <UserContext.Provider value={{ currentUser, setCurrentUser, users, loading }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
```

**Step 2: Create users API route**

Create `src/app/api/users/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";

export async function GET() {
  const allUsers = db.select().from(users).all();
  return NextResponse.json(allUsers);
}
```

**Step 3: Create user switcher component**

Create `src/components/user-switcher.tsx`:

```typescript
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
```

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add user context, impersonation, and user switcher"
```

---

## Task 4: App Layout & Navigation Shell

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/components/nav-bar.tsx`
- Create: `src/components/notification-bell.tsx`
- Create: `src/app/deals/page.tsx` (placeholder)
- Create: `src/app/my-tasks/page.tsx` (placeholder)
- Create: `src/app/snowflake/page.tsx` (placeholder)
- Create: `src/app/admin/page.tsx` (placeholder)

**Step 1: Create the navigation bar**

Create `src/components/nav-bar.tsx`:

```typescript
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
```

**Step 2: Create notification bell (placeholder)**

Create `src/components/notification-bell.tsx`:

```typescript
"use client";

import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useUser } from "@/lib/user-context";
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
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center">
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
```

Add missing import to notification-bell.tsx:
```typescript
import { cn } from "@/lib/utils";
```

**Step 3: Update root layout**

Modify `src/app/layout.tsx` to wrap with UserProvider and NavBar:

```typescript
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/lib/user-context";
import { NavBar } from "@/components/nav-bar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Deal Closing",
  description: "Deal closing approval workflow",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <UserProvider>
          <div className="min-h-screen flex flex-col">
            <NavBar />
            <main className="flex-1">{children}</main>
          </div>
        </UserProvider>
      </body>
    </html>
  );
}
```

**Step 4: Create placeholder pages**

Create `src/app/deals/page.tsx`:

```typescript
export default function DealsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Deals</h1>
      <p className="text-muted-foreground mt-1">All deals and their current status.</p>
    </div>
  );
}
```

Create `src/app/my-tasks/page.tsx`:

```typescript
export default function MyTasksPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">My Tasks</h1>
      <p className="text-muted-foreground mt-1">Deals assigned to you.</p>
    </div>
  );
}
```

Create `src/app/snowflake/page.tsx`:

```typescript
export default function SnowflakePage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Snowflake Integration</h1>
      <p className="text-muted-foreground mt-1">Data warehouse integration documentation.</p>
    </div>
  );
}
```

Create `src/app/admin/page.tsx`:

```typescript
export default function AdminPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Admin</h1>
      <p className="text-muted-foreground mt-1">User management and settings.</p>
    </div>
  );
}
```

**Step 5: Redirect root to /deals**

Modify `src/app/page.tsx`:

```typescript
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/deals");
}
```

**Step 6: Install lucide-react (icons)**

```bash
npm install lucide-react
```

**Step 7: Verify the app runs**

```bash
npm run dev
```

Open http://localhost:3000 — should see the nav bar, user switcher, and Deals placeholder page.

**Step 8: Commit**

```bash
git add -A
git commit -m "feat: add app layout, navigation, and placeholder pages"
```

---

## Task 5: Deals API & List View

**Files:**
- Create: `src/app/api/deals/route.ts`
- Modify: `src/app/deals/page.tsx`
- Create: `src/components/deals-list.tsx`
- Create: `src/components/create-deal-dialog.tsx`
- Create: `src/lib/types.ts`

**Step 1: Create shared types**

Create `src/lib/types.ts`:

```typescript
export type DealStatus = "entry" | "pending_approval" | "approved" | "rejected";

export type Deal = {
  id: string;
  name: string;
  counterparty: string | null;
  equityTicker: string | null;
  investmentAmount: number | null;
  dealDate: string | null;
  settlementDate: string | null;
  notes: string | null;
  status: DealStatus;
  createdBy: string | null;
  assignedApprover: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AuditLog = {
  id: string;
  dealId: string;
  userId: string;
  action: string;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  source: "manual" | "agent" | null;
  documentId: string | null;
  documentPage: number | null;
  comment: string | null;
  timestamp: string;
  userName?: string;
  userEmail?: string;
};

export type ChatMessage = {
  id: string;
  dealId: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
};

export type Notification = {
  id: string;
  userId: string;
  dealId: string;
  message: string;
  read: boolean;
  createdAt: string;
};

export const DEAL_FIELDS = [
  { key: "name", label: "Deal Name", type: "text" },
  { key: "counterparty", label: "Counterparty", type: "text" },
  { key: "equityTicker", label: "Equity Ticker", type: "text" },
  { key: "investmentAmount", label: "Investment Amount", type: "currency" },
  { key: "dealDate", label: "Deal Date", type: "date" },
  { key: "settlementDate", label: "Settlement Date", type: "date" },
  { key: "notes", label: "Notes", type: "textarea" },
] as const;

export type DealFieldKey = (typeof DEAL_FIELDS)[number]["key"];
```

**Step 2: Create deals API route**

Create `src/app/api/deals/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { db } from "@/db";
import { deals, auditLogs } from "@/db/schema";
import { v4 as uuid } from "uuid";
import { desc } from "drizzle-orm";

export async function GET() {
  const allDeals = db.select().from(deals).orderBy(desc(deals.createdAt)).all();
  return NextResponse.json(allDeals);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { name, userId } = body;

  const now = new Date().toISOString();
  const dealId = uuid();

  db.insert(deals)
    .values({
      id: dealId,
      name,
      status: "entry",
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  db.insert(auditLogs)
    .values({
      id: uuid(),
      dealId,
      userId,
      action: "CREATED",
      source: "manual",
      timestamp: now,
    })
    .run();

  const deal = db.select().from(deals).where(({ id }, { eq }) => eq(id, dealId)).get();
  return NextResponse.json(deal, { status: 201 });
}
```

Note: The `where` clause above uses Drizzle's callback form. Alternative approach:

```typescript
import { eq } from "drizzle-orm";
// ...
const deal = db.select().from(deals).where(eq(deals.id, dealId)).get();
```

Use the `eq` import approach as it is cleaner.

**Step 3: Create deals list component**

Create `src/components/deals-list.tsx`:

```typescript
"use client";

import Link from "next/link";
import useSWR from "swr";
import { Deal } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const statusColors: Record<string, string> = {
  entry: "bg-blue-100 text-blue-800",
  pending_approval: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

const statusLabels: Record<string, string> = {
  entry: "Entry",
  pending_approval: "Pending Approval",
  approved: "Approved",
  rejected: "Rejected",
};

export function DealsList() {
  const { data: deals = [], isLoading } = useSWR<Deal[]>("/api/deals", fetcher);

  if (isLoading) {
    return <p className="text-muted-foreground">Loading deals...</p>;
  }

  if (deals.length === 0) {
    return (
      <p className="text-muted-foreground">
        No deals yet. Create your first deal to get started.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Deal Name</TableHead>
          <TableHead>Counterparty</TableHead>
          <TableHead>Ticker</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Updated</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {deals.map((deal) => (
          <TableRow key={deal.id} className="cursor-pointer hover:bg-accent/50">
            <TableCell>
              <Link
                href={`/deals/${deal.id}`}
                className="font-medium text-primary hover:underline"
              >
                {deal.name}
              </Link>
            </TableCell>
            <TableCell>{deal.counterparty || "—"}</TableCell>
            <TableCell>{deal.equityTicker || "—"}</TableCell>
            <TableCell>
              {deal.investmentAmount
                ? `$${deal.investmentAmount.toLocaleString()}`
                : "—"}
            </TableCell>
            <TableCell>
              <Badge className={statusColors[deal.status]} variant="secondary">
                {statusLabels[deal.status]}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {new Date(deal.updatedAt).toLocaleDateString()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

**Step 4: Create deal dialog**

Create `src/components/create-deal-dialog.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useUser } from "@/lib/user-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { mutate } from "swr";

export function CreateDealDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const { currentUser } = useUser();

  const handleCreate = async () => {
    if (!name.trim() || !currentUser) return;

    await fetch("/api/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), userId: currentUser.id }),
    });

    setName("");
    setOpen(false);
    mutate("/api/deals");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Deal
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Deal</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div>
            <Label htmlFor="dealName">Deal Name</Label>
            <Input
              id="dealName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Acme Corp Acquisition"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>
          <Button onClick={handleCreate} className="w-full">
            Create Deal
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 5: Update deals page**

Modify `src/app/deals/page.tsx`:

```typescript
import { DealsList } from "@/components/deals-list";
import { CreateDealDialog } from "@/components/create-deal-dialog";

export default function DealsPage() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Deals</h1>
          <p className="text-muted-foreground mt-1">
            All deals and their current status.
          </p>
        </div>
        <CreateDealDialog />
      </div>
      <DealsList />
    </div>
  );
}
```

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add deals API, list view, and create deal dialog"
```

---

## Task 6: Deal Detail View — Form with Per-Field Audit

**Files:**
- Create: `src/app/deals/[id]/page.tsx`
- Create: `src/app/api/deals/[id]/route.ts`
- Create: `src/app/api/deals/[id]/audit/route.ts`
- Create: `src/components/deal-form.tsx`
- Create: `src/components/field-audit-chip.tsx`
- Create: `src/components/audit-timeline.tsx`

**Step 1: Create deal detail API**

Create `src/app/api/deals/[id]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { db } from "@/db";
import { deals, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deal = db.select().from(deals).where(eq(deals.id, id)).get();
  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }
  return NextResponse.json(deal);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { field, value, userId, source = "manual" } = body;

  const deal = db.select().from(deals).where(eq(deals.id, id)).get();
  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  const oldValue = (deal as Record<string, unknown>)[field];
  const now = new Date().toISOString();

  // Update the deal field
  db.update(deals)
    .set({ [field]: value, updatedAt: now })
    .where(eq(deals.id, id))
    .run();

  // Log the change
  db.insert(auditLogs)
    .values({
      id: uuid(),
      dealId: id,
      userId,
      action: source === "agent" ? "AGENT_EXTRACTED" : "FIELD_UPDATED",
      fieldName: field,
      oldValue: oldValue != null ? String(oldValue) : null,
      newValue: value != null ? String(value) : null,
      source,
      timestamp: now,
    })
    .run();

  const updated = db.select().from(deals).where(eq(deals.id, id)).get();
  return NextResponse.json(updated);
}
```

**Step 2: Create audit API**

Create `src/app/api/deals/[id]/audit/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { db } from "@/db";
import { auditLogs, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const logs = db
    .select({
      id: auditLogs.id,
      dealId: auditLogs.dealId,
      userId: auditLogs.userId,
      action: auditLogs.action,
      fieldName: auditLogs.fieldName,
      oldValue: auditLogs.oldValue,
      newValue: auditLogs.newValue,
      source: auditLogs.source,
      documentId: auditLogs.documentId,
      documentPage: auditLogs.documentPage,
      comment: auditLogs.comment,
      timestamp: auditLogs.timestamp,
      userName: users.name,
      userEmail: users.email,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .where(eq(auditLogs.dealId, id))
    .orderBy(desc(auditLogs.timestamp))
    .all();

  return NextResponse.json(logs);
}
```

**Step 3: Create field audit chip component**

Create `src/components/field-audit-chip.tsx`:

```typescript
"use client";

import { AuditLog } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Pencil, Bot, Check } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

type Props = {
  fieldName: string;
  auditLogs: AuditLog[];
};

export function FieldAuditChip({ fieldName, auditLogs }: Props) {
  const fieldLogs = auditLogs.filter((l) => l.fieldName === fieldName);
  const lastLog = fieldLogs[0]; // already sorted desc

  if (!lastLog) return <span className="text-xs text-muted-foreground">—</span>;

  const icon =
    lastLog.source === "agent" ? (
      <Bot className="h-3 w-3" />
    ) : lastLog.action === "APPROVED" ? (
      <Check className="h-3 w-3" />
    ) : (
      <Pencil className="h-3 w-3" />
    );

  const label =
    lastLog.source === "agent"
      ? `Agent, confirmed by ${lastLog.userEmail}`
      : `${lastLog.userEmail}`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Badge
          variant="outline"
          className="cursor-pointer text-xs gap-1 font-normal max-w-[200px] truncate"
        >
          {icon}
          {label}
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <h4 className="font-medium text-sm mb-2">
          History: {fieldName}
        </h4>
        <ScrollArea className="max-h-48">
          <div className="space-y-2">
            {fieldLogs.map((log) => (
              <div key={log.id} className="text-xs border-l-2 pl-2 py-1">
                <div className="font-medium">
                  {log.source === "agent" ? "Agent extracted" : "Manual update"} by{" "}
                  {log.userEmail}
                </div>
                {log.oldValue && (
                  <div className="text-muted-foreground">
                    From: {log.oldValue}
                  </div>
                )}
                <div>To: {log.newValue}</div>
                {log.documentPage && (
                  <div className="text-muted-foreground">
                    Source: page {log.documentPage}
                  </div>
                )}
                <div className="text-muted-foreground">
                  {new Date(log.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
```

**Step 4: Create deal form component**

Create `src/components/deal-form.tsx`:

```typescript
"use client";

import { useState, useCallback } from "react";
import useSWR, { mutate } from "swr";
import { useUser } from "@/lib/user-context";
import { Deal, AuditLog, DEAL_FIELDS } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FieldAuditChip } from "./field-audit-chip";
import { AuditTimeline } from "./audit-timeline";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const statusLabels: Record<string, string> = {
  entry: "Data Entry",
  pending_approval: "Pending Approval",
  approved: "Approved",
  rejected: "Rejected",
};

const statusColors: Record<string, string> = {
  entry: "bg-blue-100 text-blue-800",
  pending_approval: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

type Props = {
  dealId: string;
};

export function DealForm({ dealId }: Props) {
  const { currentUser } = useUser();
  const { data: deal, mutate: mutateDeal } = useSWR<Deal>(
    `/api/deals/${dealId}`,
    fetcher
  );
  const { data: auditLogs = [] } = useSWR<AuditLog[]>(
    `/api/deals/${dealId}/audit`,
    fetcher
  );

  const [saving, setSaving] = useState<string | null>(null);

  const handleFieldBlur = useCallback(
    async (field: string, value: string) => {
      if (!deal || !currentUser) return;
      const currentValue = (deal as Record<string, unknown>)[field];
      if (String(currentValue ?? "") === value) return;

      setSaving(field);
      await fetch(`/api/deals/${dealId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field,
          value: value || null,
          userId: currentUser.id,
          source: "manual",
        }),
      });
      mutateDeal();
      mutate(`/api/deals/${dealId}/audit`);
      setSaving(null);
    },
    [deal, currentUser, dealId, mutateDeal]
  );

  const handleSubmitForApproval = async () => {
    if (!currentUser) return;
    await fetch(`/api/deals/${dealId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUser.id }),
    });
    mutateDeal();
    mutate(`/api/deals/${dealId}/audit`);
  };

  const handleApprove = async () => {
    if (!currentUser) return;
    await fetch(`/api/deals/${dealId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUser.id }),
    });
    mutateDeal();
    mutate(`/api/deals/${dealId}/audit`);
  };

  const handleReject = async () => {
    const comment = prompt("Rejection reason:");
    if (!comment || !currentUser) return;
    await fetch(`/api/deals/${dealId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUser.id, comment }),
    });
    mutateDeal();
    mutate(`/api/deals/${dealId}/audit`);
  };

  if (!deal) return <p className="text-muted-foreground">Loading...</p>;

  const isEditable = deal.status === "entry" || deal.status === "rejected";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{deal.name}</h2>
        </div>
        <Badge className={statusColors[deal.status]} variant="secondary">
          {statusLabels[deal.status]}
        </Badge>
      </div>

      {/* Form fields */}
      <div className="space-y-4">
        {DEAL_FIELDS.map((field) => {
          const value = String((deal as Record<string, unknown>)[field.key] ?? "");
          return (
            <div key={field.key} className="grid grid-cols-[180px_1fr_200px] gap-3 items-start">
              <Label className="pt-2 text-sm font-medium">{field.label}</Label>
              <div>
                {field.type === "textarea" ? (
                  <Textarea
                    defaultValue={value}
                    disabled={!isEditable}
                    onBlur={(e) => handleFieldBlur(field.key, e.target.value)}
                    className="min-h-[80px]"
                  />
                ) : (
                  <Input
                    type={field.type === "currency" ? "number" : field.type}
                    defaultValue={value}
                    disabled={!isEditable}
                    onBlur={(e) => handleFieldBlur(field.key, e.target.value)}
                  />
                )}
                {saving === field.key && (
                  <span className="text-xs text-muted-foreground">Saving...</span>
                )}
              </div>
              <FieldAuditChip fieldName={field.key} auditLogs={auditLogs} />
            </div>
          );
        })}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 pt-4 border-t">
        {deal.status === "entry" && (
          <Button onClick={handleSubmitForApproval}>Submit for Approval</Button>
        )}
        {deal.status === "pending_approval" && (
          <>
            <Button onClick={handleApprove} variant="default">
              Approve
            </Button>
            <Button onClick={handleReject} variant="destructive">
              Reject
            </Button>
          </>
        )}
        {deal.status === "approved" && (
          <p className="text-sm text-green-600 font-medium">
            This deal has been approved.
          </p>
        )}
      </div>

      {/* Audit timeline */}
      <AuditTimeline logs={auditLogs} />
    </div>
  );
}
```

**Step 5: Create audit timeline component**

Create `src/components/audit-timeline.tsx`:

```typescript
"use client";

import { useState } from "react";
import { AuditLog } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Pencil, Bot, Check, X, Send, Plus } from "lucide-react";

const actionIcons: Record<string, typeof Pencil> = {
  CREATED: Plus,
  FIELD_UPDATED: Pencil,
  AGENT_EXTRACTED: Bot,
  SUBMITTED: Send,
  APPROVED: Check,
  REJECTED: X,
};

const actionLabels: Record<string, string> = {
  CREATED: "Deal created",
  FIELD_UPDATED: "Field updated",
  AGENT_EXTRACTED: "Agent extracted data",
  SUBMITTED: "Submitted for approval",
  APPROVED: "Deal approved",
  REJECTED: "Deal rejected",
};

export function AuditTimeline({ logs }: { logs: AuditLog[] }) {
  const [expanded, setExpanded] = useState(false);

  if (logs.length === 0) return null;

  const displayed = expanded ? logs : logs.slice(0, 3);

  return (
    <div className="border-t pt-4">
      <Button
        variant="ghost"
        className="flex items-center gap-2 mb-3"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        Audit Trail ({logs.length} entries)
      </Button>
      <div className="space-y-2">
        {displayed.map((log) => {
          const Icon = actionIcons[log.action] || Pencil;
          return (
            <div key={log.id} className="flex items-start gap-3 text-sm">
              <div className="mt-0.5 p-1 rounded bg-muted">
                <Icon className="h-3 w-3" />
              </div>
              <div className="flex-1">
                <span className="font-medium">{actionLabels[log.action]}</span>
                {log.fieldName && (
                  <span className="text-muted-foreground">
                    {" "}— {log.fieldName}: {log.oldValue ?? "empty"} → {log.newValue}
                  </span>
                )}
                {log.comment && (
                  <span className="text-muted-foreground"> — "{log.comment}"</span>
                )}
                <div className="text-xs text-muted-foreground">
                  by {log.userEmail} · {new Date(log.timestamp).toLocaleString()}
                  {log.source === "agent" && " · via Agent"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {logs.length > 3 && !expanded && (
        <Button
          variant="link"
          className="text-xs mt-1"
          onClick={() => setExpanded(true)}
        >
          Show {logs.length - 3} more entries
        </Button>
      )}
    </div>
  );
}
```

**Step 6: Create the deal detail page**

Create `src/app/deals/[id]/page.tsx`:

```typescript
"use client";

import { use } from "react";
import { DealForm } from "@/components/deal-form";
import { ChatPanel } from "@/components/chat-panel";

export default function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Deal Form */}
      <div className="flex-[2] overflow-y-auto p-6 border-r">
        <DealForm dealId={id} />
      </div>
      {/* Chat Panel */}
      <div className="flex-1 flex flex-col">
        <ChatPanel dealId={id} />
      </div>
    </div>
  );
}
```

Note: `ChatPanel` will be created in Task 8. Create a placeholder for now:

Create `src/components/chat-panel.tsx`:

```typescript
export function ChatPanel({ dealId }: { dealId: string }) {
  return (
    <div className="p-4 flex items-center justify-center h-full text-muted-foreground">
      Chat panel (coming soon)
    </div>
  );
}
```

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: add deal detail view with form and per-field audit"
```

---

## Task 7: Workflow Stage Transitions API

**Files:**
- Create: `src/app/api/deals/[id]/submit/route.ts`
- Create: `src/app/api/deals/[id]/approve/route.ts`
- Create: `src/app/api/deals/[id]/reject/route.ts`
- Create: `src/app/api/notifications/route.ts`

**Step 1: Submit for approval endpoint**

Create `src/app/api/deals/[id]/submit/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { db } from "@/db";
import { deals, auditLogs, notifications, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId } = await req.json();
  const now = new Date().toISOString();

  // Find an approver
  const approver = db
    .select()
    .from(users)
    .where(eq(users.role, "approver"))
    .get();

  if (!approver) {
    return NextResponse.json(
      { error: "No approver available" },
      { status: 400 }
    );
  }

  // Update deal status
  db.update(deals)
    .set({
      status: "pending_approval",
      assignedApprover: approver.id,
      updatedAt: now,
    })
    .where(eq(deals.id, id))
    .run();

  // Audit log
  db.insert(auditLogs)
    .values({
      id: uuid(),
      dealId: id,
      userId,
      action: "SUBMITTED",
      source: "manual",
      timestamp: now,
    })
    .run();

  // Notify approver
  db.insert(notifications)
    .values({
      id: uuid(),
      userId: approver.id,
      dealId: id,
      message: `Deal requires your approval`,
      createdAt: now,
    })
    .run();

  return NextResponse.json({ status: "submitted" });
}
```

**Step 2: Approve endpoint**

Create `src/app/api/deals/[id]/approve/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { db } from "@/db";
import { deals, auditLogs, notifications } from "@/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId } = await req.json();
  const now = new Date().toISOString();

  const deal = db.select().from(deals).where(eq(deals.id, id)).get();
  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  db.update(deals)
    .set({ status: "approved", updatedAt: now })
    .where(eq(deals.id, id))
    .run();

  db.insert(auditLogs)
    .values({
      id: uuid(),
      dealId: id,
      userId,
      action: "APPROVED",
      source: "manual",
      timestamp: now,
    })
    .run();

  // Notify the creator
  if (deal.createdBy) {
    db.insert(notifications)
      .values({
        id: uuid(),
        userId: deal.createdBy,
        dealId: id,
        message: `Your deal has been approved`,
        createdAt: now,
      })
      .run();
  }

  return NextResponse.json({ status: "approved" });
}
```

**Step 3: Reject endpoint**

Create `src/app/api/deals/[id]/reject/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { db } from "@/db";
import { deals, auditLogs, notifications } from "@/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId, comment } = await req.json();
  const now = new Date().toISOString();

  const deal = db.select().from(deals).where(eq(deals.id, id)).get();
  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  db.update(deals)
    .set({ status: "entry", assignedApprover: null, updatedAt: now })
    .where(eq(deals.id, id))
    .run();

  db.insert(auditLogs)
    .values({
      id: uuid(),
      dealId: id,
      userId,
      action: "REJECTED",
      source: "manual",
      comment,
      timestamp: now,
    })
    .run();

  // Notify the creator
  if (deal.createdBy) {
    db.insert(notifications)
      .values({
        id: uuid(),
        userId: deal.createdBy,
        dealId: id,
        message: `Your deal was rejected: ${comment}`,
        createdAt: now,
      })
      .run();
  }

  return NextResponse.json({ status: "rejected" });
}
```

**Step 4: Notifications API**

Create `src/app/api/notifications/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");

  if (!userId) {
    return NextResponse.json([]);
  }

  const results = db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .all();

  return NextResponse.json(results);
}
```

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add workflow transitions (submit, approve, reject) and notifications API"
```

---

## Task 8: Chat Panel with Claude Agent SDK

**Files:**
- Modify: `src/components/chat-panel.tsx`
- Create: `src/app/api/agent/chat/route.ts`
- Create: `src/lib/agent-tools.ts`
- Create: `src/app/api/deals/[id]/documents/route.ts`

**Step 1: Create agent tools**

Create `src/lib/agent-tools.ts`:

```typescript
import { tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { db } from "@/db";
import { deals, auditLogs, notifications, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";

const getDealStatus = tool(
  "get_deal_status",
  "Get the current status and field values of the deal being discussed",
  {
    dealId: z.string().describe("The deal ID"),
  },
  async ({ dealId }) => {
    const deal = db.select().from(deals).where(eq(deals.id, dealId)).get();
    if (!deal) {
      return { content: [{ type: "text" as const, text: "Deal not found" }] };
    }
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(deal, null, 2),
        },
      ],
    };
  }
);

const updateDealField = tool(
  "update_deal_field",
  "Update a specific field on the deal form. Only use after the user confirms the value.",
  {
    dealId: z.string().describe("The deal ID"),
    field: z
      .enum([
        "name",
        "counterparty",
        "equityTicker",
        "investmentAmount",
        "dealDate",
        "settlementDate",
        "notes",
      ])
      .describe("The field to update"),
    value: z.string().describe("The new value for the field"),
    userId: z.string().describe("The user ID performing the action"),
    documentId: z
      .string()
      .optional()
      .describe("The document ID if extracted from a document"),
    documentPage: z
      .number()
      .optional()
      .describe("The page number if extracted from a document"),
  },
  async ({ dealId, field, value, userId, documentId, documentPage }) => {
    const deal = db.select().from(deals).where(eq(deals.id, dealId)).get();
    if (!deal) {
      return { content: [{ type: "text" as const, text: "Deal not found" }] };
    }

    const oldValue = (deal as Record<string, unknown>)[field];
    const now = new Date().toISOString();

    const parsedValue =
      field === "investmentAmount" ? parseFloat(value) : value;

    db.update(deals)
      .set({ [field]: parsedValue, updatedAt: now })
      .where(eq(deals.id, dealId))
      .run();

    db.insert(auditLogs)
      .values({
        id: uuid(),
        dealId,
        userId,
        action: "AGENT_EXTRACTED",
        fieldName: field,
        oldValue: oldValue != null ? String(oldValue) : null,
        newValue: String(value),
        source: "agent",
        documentId: documentId ?? null,
        documentPage: documentPage ?? null,
        timestamp: now,
      })
      .run();

    return {
      content: [
        {
          type: "text" as const,
          text: `Updated ${field} to "${value}"`,
        },
      ],
    };
  }
);

const sendNotification = tool(
  "send_notification",
  "Send an in-app notification to a user",
  {
    userEmail: z.string().describe("Email of the user to notify"),
    dealId: z.string().describe("The related deal ID"),
    message: z.string().describe("The notification message"),
  },
  async ({ userEmail, dealId, message }) => {
    const user = db
      .select()
      .from(users)
      .where(eq(users.email, userEmail))
      .get();

    if (!user) {
      return {
        content: [
          { type: "text" as const, text: `User ${userEmail} not found` },
        ],
      };
    }

    db.insert(notifications)
      .values({
        id: uuid(),
        userId: user.id,
        dealId,
        message,
        createdAt: new Date().toISOString(),
      })
      .run();

    return {
      content: [
        {
          type: "text" as const,
          text: `Notification sent to ${userEmail}`,
        },
      ],
    };
  }
);

export const agentMcpServer = createSdkMcpServer({
  name: "deal-closing-tools",
  version: "1.0.0",
  tools: [getDealStatus, updateDealField, sendNotification],
});
```

**Step 2: Create agent chat API route**

Create `src/app/api/agent/chat/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { agentMcpServer } from "@/lib/agent-tools";
import { db } from "@/db";
import { chatMessages } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export async function POST(req: Request) {
  const { message, dealId, userId } = await req.json();

  // Save user message
  db.insert(chatMessages)
    .values({
      id: uuid(),
      dealId,
      role: "user",
      content: message,
      timestamp: new Date().toISOString(),
    })
    .run();

  // Get chat history for context
  const history = db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.dealId, dealId))
    .orderBy(asc(chatMessages.timestamp))
    .all();

  // Build messages for the agent
  const messages = history.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const systemPrompt = `You are a deal closing assistant. You help users fill in deal information by extracting data from uploaded documents or through conversation.

Current deal ID: ${dealId}
Current user ID: ${userId}

When you extract information from a document or conversation:
1. Tell the user what you found and for which field
2. Ask for confirmation before updating the field
3. Only call update_deal_field after the user confirms

You can use get_deal_status to see the current state of the deal.
Be concise and professional.`;

  try {
    // Use the query API for streaming
    const q = query({
      prompt: messages,
      options: {
        model: "claude-sonnet-4-6",
        systemPrompt,
        mcpServers: {
          "deal-closing-tools": {
            type: "sdk",
            name: "deal-closing-tools",
            instance: agentMcpServer,
          },
        },
      },
    });

    let fullResponse = "";

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const msg of q) {
            if (msg.type === "assistant") {
              const text = msg.message.content
                .filter((block: { type: string }) => block.type === "text")
                .map((block: { type: string; text: string }) => block.text)
                .join("");

              if (text && text !== fullResponse) {
                const newText = text.slice(fullResponse.length);
                fullResponse = text;
                const data = `data: ${JSON.stringify({ text: newText })}\n\n`;
                controller.enqueue(encoder.encode(data));
              }
            }
          }

          // Save assistant response
          if (fullResponse) {
            db.insert(chatMessages)
              .values({
                id: uuid(),
                dealId,
                role: "assistant",
                content: fullResponse,
                timestamp: new Date().toISOString(),
              })
              .run();
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          console.error("Agent error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Agent error:", error);
    return NextResponse.json(
      { error: "Agent request failed" },
      { status: 500 }
    );
  }
}
```

**Step 3: Create document upload API**

Create `src/app/api/deals/[id]/documents/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const docs = db
    .select()
    .from(documents)
    .where(eq(documents.dealId, id))
    .all();
  return NextResponse.json(docs);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const formData = await req.formData();
  const file = formData.get("file") as File;
  const userId = formData.get("userId") as string;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Save file locally
  const uploadDir = path.join(process.cwd(), "uploads", id);
  await mkdir(uploadDir, { recursive: true });

  const filename = file.name;
  const filepath = path.join(uploadDir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filepath, buffer);

  // Save to database
  const docId = uuid();
  db.insert(documents)
    .values({
      id: docId,
      dealId: id,
      filename,
      filepath: `uploads/${id}/${filename}`,
      mimeType: file.type,
      uploadedBy: userId,
      uploadedAt: new Date().toISOString(),
    })
    .run();

  const doc = db.select().from(documents).where(eq(documents.id, docId)).get();
  return NextResponse.json(doc, { status: 201 });
}
```

**Step 4: Build the chat panel component**

Replace `src/components/chat-panel.tsx`:

```typescript
"use client";

import { useState, useRef, useEffect } from "react";
import { useUser } from "@/lib/user-context";
import useSWR, { mutate } from "swr";
import { ChatMessage } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Upload, Bot, User } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type Props = {
  dealId: string;
};

export function ChatPanel({ dealId }: Props) {
  const { currentUser } = useUser();
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: messages = [], mutate: mutateMessages } = useSWR<ChatMessage[]>(
    `/api/agent/messages?dealId=${dealId}`,
    fetcher
  );

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingText]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || !currentUser || streaming) return;

    setInput("");
    setStreaming(true);
    setStreamingText("");

    // Optimistically add user message
    const tempMessage: ChatMessage = {
      id: "temp",
      dealId,
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };
    mutateMessages([...messages, tempMessage], false);

    try {
      const response = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          dealId,
          userId: currentUser.id,
        }),
      });

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

        for (const line of lines) {
          const data = line.slice(6);
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            accumulated += parsed.text;
            setStreamingText(accumulated);
          } catch {
            // ignore parse errors
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
    }

    setStreaming(false);
    setStreamingText("");
    mutateMessages();
    // Refresh deal data since agent may have updated fields
    mutate(`/api/deals/${dealId}`);
    mutate(`/api/deals/${dealId}/audit`);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", currentUser.id);

    await fetch(`/api/deals/${dealId}/documents`, {
      method: "POST",
      body: formData,
    });

    // Tell the agent about the uploaded file
    await sendMessage(
      `I've uploaded a document: "${file.name}". Please extract any relevant deal information from it.`
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b flex items-center gap-2">
        <Bot className="h-4 w-4" />
        <span className="text-sm font-medium">Deal Assistant</span>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 && !streaming && (
            <div className="text-center text-muted-foreground text-sm py-8">
              <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Upload a document or ask me to help fill in deal information.</p>
            </div>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2 ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.role === "assistant" && (
                <div className="mt-0.5 p-1 rounded bg-muted shrink-0">
                  <Bot className="h-3 w-3" />
                </div>
              )}
              <div
                className={`rounded-lg px-3 py-2 max-w-[80%] text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {msg.content}
              </div>
              {msg.role === "user" && (
                <div className="mt-0.5 p-1 rounded bg-primary shrink-0">
                  <User className="h-3 w-3 text-primary-foreground" />
                </div>
              )}
            </div>
          ))}
          {streaming && streamingText && (
            <div className="flex gap-2 justify-start">
              <div className="mt-0.5 p-1 rounded bg-muted shrink-0">
                <Bot className="h-3 w-3" />
              </div>
              <div className="rounded-lg px-3 py-2 max-w-[80%] text-sm bg-muted">
                {streamingText}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t">
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleUpload}
            accept=".pdf,.doc,.docx,.txt,.csv,.xlsx"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={streaming}
          >
            <Upload className="h-4 w-4" />
          </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about this deal..."
            onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
            disabled={streaming}
          />
          <Button
            size="icon"
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || streaming}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
```

**Step 5: Create chat messages API**

Create `src/app/api/agent/messages/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { db } from "@/db";
import { chatMessages } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const dealId = url.searchParams.get("dealId");

  if (!dealId) {
    return NextResponse.json([]);
  }

  const messages = db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.dealId, dealId))
    .orderBy(asc(chatMessages.timestamp))
    .all();

  return NextResponse.json(messages);
}
```

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add chat panel with Claude Agent SDK integration"
```

---

## Task 9: My Tasks View

**Files:**
- Modify: `src/app/my-tasks/page.tsx`

**Step 1: Build My Tasks page**

Replace `src/app/my-tasks/page.tsx`:

```typescript
"use client";

import { useUser } from "@/lib/user-context";
import useSWR from "swr";
import { Deal } from "@/lib/types";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function MyTasksPage() {
  const { currentUser } = useUser();
  const { data: deals = [] } = useSWR<Deal[]>("/api/deals", fetcher);

  if (!currentUser) return null;

  const myEntryDeals = deals.filter(
    (d) =>
      d.createdBy === currentUser.id &&
      (d.status === "entry" || d.status === "rejected")
  );

  const myApprovalDeals = deals.filter(
    (d) =>
      d.assignedApprover === currentUser.id && d.status === "pending_approval"
  );

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">My Tasks</h1>

      {myEntryDeals.length === 0 && myApprovalDeals.length === 0 && (
        <p className="text-muted-foreground">No tasks assigned to you.</p>
      )}

      {myEntryDeals.length > 0 && (
        <div>
          <h2 className="text-lg font-medium mb-3">Data Entry</h2>
          <div className="grid gap-3">
            {myEntryDeals.map((deal) => (
              <Link key={deal.id} href={`/deals/${deal.id}`}>
                <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium">{deal.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {deal.counterparty || "No counterparty set"}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={
                        deal.status === "rejected"
                          ? "bg-red-100 text-red-800"
                          : "bg-blue-100 text-blue-800"
                      }
                    >
                      {deal.status === "rejected" ? "Rejected — needs revision" : "In progress"}
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {myApprovalDeals.length > 0 && (
        <div>
          <h2 className="text-lg font-medium mb-3">Pending Your Approval</h2>
          <div className="grid gap-3">
            {myApprovalDeals.map((deal) => (
              <Link key={deal.id} href={`/deals/${deal.id}`}>
                <Card className="hover:bg-accent/50 transition-colors cursor-pointer border-yellow-200">
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium">{deal.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {deal.counterparty || "No counterparty set"}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-yellow-100 text-yellow-800"
                    >
                      Awaiting your approval
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add My Tasks view"
```

---

## Task 10: Admin Page — User Management

**Files:**
- Modify: `src/app/admin/page.tsx`
- Create: `src/app/api/users/route.ts` (extend with POST/DELETE)

**Step 1: Extend users API to support CRUD**

Modify `src/app/api/users/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export async function GET() {
  const allUsers = db.select().from(users).all();
  return NextResponse.json(allUsers);
}

export async function POST(req: Request) {
  const { name, email, role } = await req.json();

  const id = uuid();
  db.insert(users)
    .values({ id, name, email, role })
    .run();

  const user = db.select().from(users).where(eq(users.id, id)).get();
  return NextResponse.json(user, { status: 201 });
}

export async function DELETE(req: Request) {
  const { id } = await req.json();
  db.delete(users).where(eq(users.id, id)).run();
  return NextResponse.json({ status: "deleted" });
}
```

**Step 2: Build admin page**

Replace `src/app/admin/page.tsx`:

```typescript
"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus } from "lucide-react";
import { User } from "@/lib/user-context";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AdminPage() {
  const { data: users = [] } = useSWR<User[]>("/api/users", fetcher);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("entry");

  const handleAdd = async () => {
    if (!name.trim() || !email.trim()) return;

    await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), email: email.trim(), role }),
    });

    setName("");
    setEmail("");
    setRole("entry");
    mutate("/api/users");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this user?")) return;

    await fetch("/api/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    mutate("/api/users");
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Admin</h1>

      <Card>
        <CardHeader>
          <CardTitle>Add User</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Smith"
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@lgt.com"
              />
            </div>
            <div className="w-40">
              <Label>Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entry">Entry</SelectItem>
                  <SelectItem value="approver">Approver</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{user.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(user.id)}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add admin page with user management"
```

---

## Task 11: Snowflake Integration Documentation View

**Files:**
- Modify: `src/app/snowflake/page.tsx`

**Step 1: Build the Snowflake documentation page**

Replace `src/app/snowflake/page.tsx`:

```typescript
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function SnowflakePage() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Snowflake Integration</h1>
        <p className="text-muted-foreground mt-1">
          How approved deal data flows into the Snowflake data warehouse.
        </p>
      </div>

      {/* Pipeline Diagram */}
      <Card>
        <CardHeader>
          <CardTitle>Data Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-4 py-6">
            <div className="text-center">
              <div className="border-2 rounded-lg p-4 bg-blue-50">
                <p className="font-medium">App Database</p>
                <p className="text-xs text-muted-foreground">SQLite</p>
              </div>
            </div>
            <div className="text-2xl text-muted-foreground">→</div>
            <div className="text-center">
              <div className="border-2 rounded-lg p-4 bg-yellow-50">
                <p className="font-medium">ETL / Sync</p>
                <p className="text-xs text-muted-foreground">
                  Scheduled or event-driven
                </p>
              </div>
            </div>
            <div className="text-2xl text-muted-foreground">→</div>
            <div className="text-center">
              <div className="border-2 rounded-lg p-4 bg-cyan-50">
                <p className="font-medium">Snowflake</p>
                <p className="text-xs text-muted-foreground">Data Warehouse</p>
              </div>
            </div>
            <div className="text-2xl text-muted-foreground">→</div>
            <div className="text-center">
              <div className="border-2 rounded-lg p-4 bg-green-50">
                <p className="font-medium">Analytics</p>
                <p className="text-xs text-muted-foreground">
                  Reporting & Compliance
                </p>
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Approved deals with full audit trail are synced to Snowflake,
            including who entered and who approved each data point.
          </p>
        </CardContent>
      </Card>

      {/* Target Schema */}
      <Card>
        <CardHeader>
          <CardTitle>Snowflake Target Schema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* DEALS table */}
          <div>
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <Badge>Table</Badge> DEAL_CLOSING.DEALS
            </h3>
            <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
              <pre>{`CREATE TABLE DEAL_CLOSING.DEALS (
  DEAL_ID        VARCHAR(36)  PRIMARY KEY,
  DEAL_NAME      VARCHAR(255) NOT NULL,
  COUNTERPARTY   VARCHAR(255),
  EQUITY_TICKER  VARCHAR(20),
  INVESTMENT_AMT NUMBER(18,2),
  DEAL_DATE      DATE,
  SETTLEMENT_DT  DATE,
  NOTES          TEXT,
  STATUS         VARCHAR(20)  NOT NULL,
  CREATED_BY     VARCHAR(255),
  APPROVED_BY    VARCHAR(255),
  CREATED_AT     TIMESTAMP_NTZ,
  UPDATED_AT     TIMESTAMP_NTZ,
  APPROVED_AT    TIMESTAMP_NTZ
);`}</pre>
            </div>
          </div>

          <Separator />

          {/* AUDIT_LOG table */}
          <div>
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <Badge>Table</Badge> DEAL_CLOSING.AUDIT_LOG
            </h3>
            <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
              <pre>{`CREATE TABLE DEAL_CLOSING.AUDIT_LOG (
  LOG_ID         VARCHAR(36)  PRIMARY KEY,
  DEAL_ID        VARCHAR(36)  REFERENCES DEALS(DEAL_ID),
  USER_EMAIL     VARCHAR(255) NOT NULL,
  USER_NAME      VARCHAR(255),
  ACTION         VARCHAR(50)  NOT NULL,
  FIELD_NAME     VARCHAR(100),
  OLD_VALUE      TEXT,
  NEW_VALUE      TEXT,
  SOURCE         VARCHAR(10),  -- 'manual' or 'agent'
  DOCUMENT_REF   VARCHAR(255),
  DOCUMENT_PAGE  INTEGER,
  COMMENT        TEXT,
  TIMESTAMP      TIMESTAMP_NTZ NOT NULL
);`}</pre>
            </div>
          </div>

          <Separator />

          {/* APPROVALS table */}
          <div>
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <Badge>Table</Badge> DEAL_CLOSING.APPROVALS
            </h3>
            <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
              <pre>{`CREATE TABLE DEAL_CLOSING.APPROVALS (
  APPROVAL_ID    VARCHAR(36)  PRIMARY KEY,
  DEAL_ID        VARCHAR(36)  REFERENCES DEALS(DEAL_ID),
  APPROVER_EMAIL VARCHAR(255) NOT NULL,
  APPROVER_NAME  VARCHAR(255),
  STATUS         VARCHAR(20)  NOT NULL,  -- 'approved' or 'rejected'
  COMMENT        TEXT,
  APPROVED_AT    TIMESTAMP_NTZ NOT NULL
);`}</pre>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sample Queries */}
      <Card>
        <CardHeader>
          <CardTitle>Sample Queries</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-sm font-medium mb-2">
              All deals approved by a specific user in the last 30 days
            </h3>
            <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
              <pre>{`SELECT d.DEAL_ID, d.DEAL_NAME, d.COUNTERPARTY,
       d.INVESTMENT_AMT, a.APPROVED_AT
FROM DEAL_CLOSING.DEALS d
JOIN DEAL_CLOSING.APPROVALS a ON d.DEAL_ID = a.DEAL_ID
WHERE a.APPROVER_EMAIL = 'maria.jones@lgt.com'
  AND a.APPROVED_AT >= DATEADD(day, -30, CURRENT_TIMESTAMP())
  AND a.STATUS = 'approved'
ORDER BY a.APPROVED_AT DESC;`}</pre>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-medium mb-2">
              Full audit trail for a specific deal
            </h3>
            <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
              <pre>{`SELECT al.TIMESTAMP, al.USER_EMAIL, al.ACTION,
       al.FIELD_NAME, al.OLD_VALUE, al.NEW_VALUE,
       al.SOURCE, al.DOCUMENT_REF, al.DOCUMENT_PAGE
FROM DEAL_CLOSING.AUDIT_LOG al
WHERE al.DEAL_ID = '<deal-id>'
ORDER BY al.TIMESTAMP ASC;`}</pre>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-medium mb-2">
              Compliance report: all field changes with approver sign-off
            </h3>
            <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
              <pre>{`SELECT d.DEAL_NAME,
       al.FIELD_NAME, al.OLD_VALUE, al.NEW_VALUE,
       al.USER_EMAIL AS changed_by, al.SOURCE,
       a.APPROVER_EMAIL AS approved_by, a.APPROVED_AT
FROM DEAL_CLOSING.AUDIT_LOG al
JOIN DEAL_CLOSING.DEALS d ON al.DEAL_ID = d.DEAL_ID
LEFT JOIN DEAL_CLOSING.APPROVALS a ON al.DEAL_ID = a.DEAL_ID
  AND a.STATUS = 'approved'
WHERE al.ACTION IN ('FIELD_UPDATED', 'AGENT_EXTRACTED')
ORDER BY d.DEAL_NAME, al.TIMESTAMP;`}</pre>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Integration Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <h3 className="font-medium">Sync Strategy</h3>
            <p className="text-muted-foreground">
              Two options depending on volume and latency requirements:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-1">
              <li>
                <strong>Scheduled batch:</strong> A cron job runs every N
                minutes, queries for newly approved deals, and bulk-loads them
                into Snowflake via COPY INTO.
              </li>
              <li>
                <strong>Event-driven:</strong> On deal approval, an event is
                emitted (webhook/queue) that triggers an immediate sync of that
                deal and its audit log to Snowflake.
              </li>
            </ul>
          </div>
          <Separator />
          <div>
            <h3 className="font-medium">Data Format</h3>
            <p className="text-muted-foreground">
              The primary artifact is the <strong>audit log</strong> — every
              field change paired with the person who made it and the person who
              approved it. This provides a complete, tamper-evident record of the
              data lineage from entry to approval.
            </p>
          </div>
          <Separator />
          <div>
            <h3 className="font-medium">Schema Mapping</h3>
            <p className="text-muted-foreground">
              The app's SQLite tables map directly to Snowflake tables. Field
              names are converted from camelCase to UPPER_SNAKE_CASE. User IDs
              are resolved to email addresses for human readability in the
              warehouse. Timestamps are stored as TIMESTAMP_NTZ (UTC).
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add Snowflake integration documentation view"
```

---

## Task 12: Final Wiring & Smoke Test

**Step 1: Verify the app compiles**

```bash
npm run build
```

Fix any TypeScript errors.

**Step 2: Run the dev server and test the flow**

```bash
npm run dev
```

Test the following flow:
1. Open http://localhost:3000 — should redirect to /deals
2. Switch to "John Smith" (entry role) using the user switcher
3. Create a new deal "Test Acquisition"
4. Click into the deal — see the form with empty fields and the chat panel
5. Fill in some fields manually — see "Saving..." and audit chips appear
6. Send a chat message — agent should respond
7. Click "Submit for Approval"
8. Switch to "Maria Jones" (approver role)
9. Go to "My Tasks" — see the deal pending approval
10. Click into it — see "Approve" and "Reject" buttons
11. Click "Approve" — deal status changes to "Approved"
12. Check the audit timeline — full history visible
13. Visit /snowflake — see the documentation view
14. Visit /admin — see user management

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: final wiring and fixes"
```

---

## Summary

| Task | Description | Estimated Steps |
|------|-------------|----------------|
| 1 | Project scaffolding | 6 |
| 2 | Database schema & Drizzle | 6 |
| 3 | User context & impersonation | 4 |
| 4 | App layout & navigation | 8 |
| 5 | Deals API & list view | 6 |
| 6 | Deal detail view with per-field audit | 7 |
| 7 | Workflow stage transitions API | 5 |
| 8 | Chat panel with Agent SDK | 6 |
| 9 | My Tasks view | 2 |
| 10 | Admin page | 3 |
| 11 | Snowflake documentation view | 2 |
| 12 | Final wiring & smoke test | 3 |
