import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const res = NextResponse.json({ ok: true });
    // clear cookie
    res.cookies.set("auth_token", "", {
      httpOnly: true,
      path: "/",
      maxAge: 0,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });
    return res;
  } catch (err) {
    console.error("Logout error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}


