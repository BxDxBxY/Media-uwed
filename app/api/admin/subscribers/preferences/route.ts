import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSubscriberPreferenceMap, setSubscriberPreference } from "@/lib/subscriber-preferences";

export async function GET(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const preferences = await getSubscriberPreferenceMap();
    return NextResponse.json({ preferences });
  } catch {
    return NextResponse.json({ error: "Failed to fetch preferences" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const active = Boolean(body.active);

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    await setSubscriberPreference(email, active);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to update preference" }, { status: 500 });
  }
}
