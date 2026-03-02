import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";

export async function GET() {
  const allUsers = db.select().from(users).all();
  return NextResponse.json(allUsers);
}
