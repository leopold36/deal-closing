import { NextResponse } from "next/server";

const VALID_USERNAME = "deal.closing";
const VALID_PASSWORD = "LGT01";

export async function POST(request: Request) {
  const body = await request.json();
  const { username, password } = body;

  if (username === VALID_USERNAME && password === VALID_PASSWORD) {
    const response = NextResponse.json({ success: true });
    response.cookies.set("dc-session", "authenticated", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });
    return response;
  }

  return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
}
