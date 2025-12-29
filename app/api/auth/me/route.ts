import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/serverAuth";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ user: null }, { status: 200 });
    return NextResponse.json({ user }, { status: 200 });
  } catch (err) {
    console.error("me error:", err);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}


