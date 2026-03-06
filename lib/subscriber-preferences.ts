import { prisma } from "@/lib/prisma";

const PREF_SUBJECT = "__subscriber_pref__";

type PreferenceMap = Record<string, boolean>;

export async function getSubscriberPreferenceMap(): Promise<PreferenceMap> {
  const rows = await prisma.contactMessage.findMany({
    where: { subject: PREF_SUBJECT },
    orderBy: { createdAt: "desc" },
    select: { message: true },
  });

  const map: PreferenceMap = {};

  for (const row of rows) {
    try {
      const parsed = JSON.parse(row.message || "{}");
      const email = String(parsed.email || "").trim().toLowerCase();
      if (!email || email in map) continue;
      map[email] = Boolean(parsed.active);
    } catch {
      continue;
    }
  }

  return map;
}

export async function setSubscriberPreference(email: string, active: boolean) {
  await prisma.contactMessage.create({
    data: {
      name: "Newsletter Preferences",
      email,
      subject: PREF_SUBJECT,
      message: JSON.stringify({ email: email.toLowerCase(), active, updatedAt: new Date().toISOString() }),
    },
  });
}
