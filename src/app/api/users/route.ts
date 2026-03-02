import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { v4 as uuid } from "uuid";
import { eq } from "drizzle-orm";

export async function GET() {
  const allUsers = db.select().from(users).all();
  return NextResponse.json(allUsers);
}

export async function POST(req: Request) {
  const { name, email, role } = await req.json();
  const id = uuid();
  db.insert(users).values({ id, name, email, role }).run();
  const user = db.select().from(users).where(eq(users.id, id)).get();
  return NextResponse.json(user, { status: 201 });
}

export async function DELETE(req: Request) {
  const { id } = await req.json();
  db.delete(users).where(eq(users.id, id)).run();
  return NextResponse.json({ status: "deleted" });
}
