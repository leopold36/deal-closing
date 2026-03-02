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
