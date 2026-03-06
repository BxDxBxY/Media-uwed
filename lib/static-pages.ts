import { prisma } from "@/lib/prisma";

export type StaticPageSlug = "privacy-policy" | "terms-of-use";

export interface StaticPageContent {
  slug: StaticPageSlug;
  title: string;
  titleRu?: string;
  titleUz?: string;
  content: string;
  contentRu?: string;
  contentUz?: string;
  updatedAt: string;
}

const SUBJECT_PREFIX = "__static_page__:";

const defaults: Record<StaticPageSlug, StaticPageContent> = {
  "privacy-policy": {
    slug: "privacy-policy",
    title: "Privacy Policy",
    titleRu: "Политика конфиденциальности",
    titleUz: "Maxfiylik siyosati",
    content: "This page describes how University Media Portal collects, stores, and uses personal data.",
    contentRu: "На этой странице описано, как University Media Portal собирает, хранит и использует персональные данные.",
    contentUz: "Ushbu sahifada University Media Portal shaxsiy ma'lumotlarni qanday yig'ishi, saqlashi va foydalanishi bayon etiladi.",
    updatedAt: new Date(0).toISOString(),
  },
  "terms-of-use": {
    slug: "terms-of-use",
    title: "Terms of Use",
    titleRu: "Условия использования",
    titleUz: "Foydalanish shartlari",
    content: "These terms govern the use of University Media Portal and its services.",
    contentRu: "Эти условия регулируют использование University Media Portal и его сервисов.",
    contentUz: "Ushbu shartlar University Media Portal va uning xizmatlaridan foydalanishni tartibga soladi.",
    updatedAt: new Date(0).toISOString(),
  },
};

export async function getStaticPage(slug: StaticPageSlug): Promise<StaticPageContent> {
  const row = await prisma.contactMessage.findFirst({
    where: { subject: `${SUBJECT_PREFIX}${slug}` },
    orderBy: { createdAt: "desc" },
    select: { message: true, createdAt: true },
  });

  if (!row) return defaults[slug];

  try {
    const parsed = JSON.parse(row.message || "{}");
    return {
      slug,
      title: String(parsed.title || defaults[slug].title),
      titleRu: String(parsed.titleRu || defaults[slug].titleRu || ""),
      titleUz: String(parsed.titleUz || defaults[slug].titleUz || ""),
      content: String(parsed.content || defaults[slug].content),
      contentRu: String(parsed.contentRu || defaults[slug].contentRu || ""),
      contentUz: String(parsed.contentUz || defaults[slug].contentUz || ""),
      updatedAt: row.createdAt.toISOString(),
    };
  } catch {
    return defaults[slug];
  }
}

export async function setStaticPage(payload: Omit<StaticPageContent, "updatedAt">) {
  const slug = payload.slug;
  await prisma.contactMessage.create({
    data: {
      name: "Static Page Content",
      email: "system@local",
      subject: `${SUBJECT_PREFIX}${slug}`,
      message: JSON.stringify({
        title: payload.title,
        titleRu: payload.titleRu || "",
        titleUz: payload.titleUz || "",
        content: payload.content,
        contentRu: payload.contentRu || "",
        contentUz: payload.contentUz || "",
      }),
    },
  });

  return getStaticPage(slug);
}
