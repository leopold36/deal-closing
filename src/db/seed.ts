import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { v4 as uuid } from "uuid";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, { prepare: false });
const db = drizzle(client, { schema });

async function seed() {
  // Clear existing data
  await db.delete(schema.chatMessages);
  await db.delete(schema.suggestions);
  await db.delete(schema.notifications);
  await db.delete(schema.auditLogs);
  await db.delete(schema.documents);
  await db.delete(schema.deals);
  await db.delete(schema.users);

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
    await db.insert(schema.users).values(user);
  }

  console.log("Seed complete. Created users:", users.map((u) => u.email));
  process.exit(0);
}

seed();
