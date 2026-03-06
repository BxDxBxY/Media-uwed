import { prisma } from "@/lib/prisma";

const ABOUT_CONFIG_SUBJECT = "__about_page_config__";

type LangText = {
  en: string;
  ru: string;
  uz: string;
};

type TeamMember = {
  name: string;
  role: LangText;
  email: string;
  image: string;
};

export type AboutPageConfig = {
  missionTitle: LangText;
  missionBody: LangText;
  teamTitle: LangText;
  contactTitle: LangText;
  contactEmail: string;
  contactEmailHint: LangText;
  contactPhone: string;
  contactPhoneHint: LangText;
  contactAddress: string;
  contactAddressHint: LangText;
  team: TeamMember[];
};

export const defaultAboutPageConfig: AboutPageConfig = {
  missionTitle: {
    en: "Our Mission",
    ru: "Наша миссия",
    uz: "Bizning missiyamiz",
  },
  missionBody: {
    en: "Established in 1995, our mission is to provide a platform for student voices and to keep the university community informed about the issues that matter. We believe in the power of storytelling to foster connection and drive positive change.\n\nWe cover everything from administrative decisions and student government to sports, arts, and campus culture. Our team is comprised of dedicated student journalists, photographers, and designers from diverse academic backgrounds.",
    ru: "Основанная в 1995 году, наша миссия — предоставлять платформу для голосов студентов и держать университетское сообщество в курсе важных вопросов. Мы верим, что сила историй помогает объединять людей и создавать позитивные изменения.\n\nМы освещаем всё: от административных решений и студенческого самоуправления до спорта, искусства и кампусной культуры. Наша команда состоит из преданных своему делу студенческих журналистов, фотографов и дизайнеров из разных академических направлений.",
    uz: "1995-yilda tashkil etilgan tashkilotimizning missiyasi — talabalar ovozi uchun maydon yaratish va universitet hamjamiyatini muhim mavzular haqida xabardor qilishdir. Biz hikoyachilik odamlarni bog‘lash va ijobiy o‘zgarishlar qilish kuchiga ega, deb ishonamiz.\n\nBiz ma’muriy qarorlar va talabalar kengashidan tortib sport, san’at va kampus madaniyatigacha bo‘lgan mavzularni yoritamiz. Jamoamiz turli yo‘nalishdagi fidoyi talaba jurnalistlar, fotograf va dizaynerlardan iborat.",
  },
  teamTitle: {
    en: "Meet the Team",
    ru: "Наша команда",
    uz: "Jamoa bilan tanishing",
  },
  contactTitle: {
    en: "Contact Us",
    ru: "Свяжитесь с нами",
    uz: "Biz bilan bog'laning",
  },
  contactEmail: "editor@university.edu",
  contactEmailHint: {
    en: "For press releases & tips",
    ru: "Для пресс-релизов и подсказок",
    uz: "Press-reliz va maslahatlar uchun",
  },
  contactPhone: "+1 (555) 123-4567",
  contactPhoneHint: {
    en: "Newsroom Direct Line",
    ru: "Прямая линия редакции",
    uz: "Tahririyatning to'g'ridan-to'g'ri liniyasi",
  },
  contactAddress: "Student Center, Room 304",
  contactAddressHint: {
    en: "University Campus",
    ru: "Кампус университета",
    uz: "Universitet kampusi",
  },
  team: [
    {
      name: "Dr. Alan Grant",
      role: { en: "Faculty Advisor", ru: "Научный консультант", uz: "Fakultet maslahatchisi" },
      email: "alan.grant@university.edu",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=2670&auto=format&fit=crop",
    },
    {
      name: "Sarah Connor",
      role: { en: "Editor-in-Chief", ru: "Главный редактор", uz: "Bosh muharrir" },
      email: "sarah.connor@university.edu",
      image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=2670&auto=format&fit=crop",
    },
    {
      name: "James T. Kirk",
      role: { en: "Lead Photographer", ru: "Ведущий фотограф", uz: "Bosh fotograf" },
      email: "james.kirk@university.edu",
      image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=2670&auto=format&fit=crop",
    },
    {
      name: "Nyota Uhura",
      role: { en: "Head of Communications", ru: "Руководитель коммуникаций", uz: "Kommunikatsiya rahbari" },
      email: "nyota.uhura@university.edu",
      image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=2670&auto=format&fit=crop",
    },
  ],
};

function normalizeConfig(input: unknown): AboutPageConfig {
  if (!input || typeof input !== "object") return defaultAboutPageConfig;
  const source = input as Partial<AboutPageConfig>;

  const normalizedTeam = Array.isArray(source.team)
    ? source.team.slice(0, 8).map((member, index) => ({
        name: member?.name || defaultAboutPageConfig.team[index]?.name || `Member ${index + 1}`,
        role: {
          en: member?.role?.en || defaultAboutPageConfig.team[index]?.role.en || "Team Member",
          ru: member?.role?.ru || defaultAboutPageConfig.team[index]?.role.ru || "Участник команды",
          uz: member?.role?.uz || defaultAboutPageConfig.team[index]?.role.uz || "Jamoa a'zosi",
        },
        email: member?.email || defaultAboutPageConfig.team[index]?.email || "",
        image: member?.image || defaultAboutPageConfig.team[index]?.image || "",
      }))
    : defaultAboutPageConfig.team;

  return {
    missionTitle: {
      en: source.missionTitle?.en || defaultAboutPageConfig.missionTitle.en,
      ru: source.missionTitle?.ru || defaultAboutPageConfig.missionTitle.ru,
      uz: source.missionTitle?.uz || defaultAboutPageConfig.missionTitle.uz,
    },
    missionBody: {
      en: source.missionBody?.en || defaultAboutPageConfig.missionBody.en,
      ru: source.missionBody?.ru || defaultAboutPageConfig.missionBody.ru,
      uz: source.missionBody?.uz || defaultAboutPageConfig.missionBody.uz,
    },
    teamTitle: {
      en: source.teamTitle?.en || defaultAboutPageConfig.teamTitle.en,
      ru: source.teamTitle?.ru || defaultAboutPageConfig.teamTitle.ru,
      uz: source.teamTitle?.uz || defaultAboutPageConfig.teamTitle.uz,
    },
    contactTitle: {
      en: source.contactTitle?.en || defaultAboutPageConfig.contactTitle.en,
      ru: source.contactTitle?.ru || defaultAboutPageConfig.contactTitle.ru,
      uz: source.contactTitle?.uz || defaultAboutPageConfig.contactTitle.uz,
    },
    contactEmail: source.contactEmail || defaultAboutPageConfig.contactEmail,
    contactEmailHint: {
      en: source.contactEmailHint?.en || defaultAboutPageConfig.contactEmailHint.en,
      ru: source.contactEmailHint?.ru || defaultAboutPageConfig.contactEmailHint.ru,
      uz: source.contactEmailHint?.uz || defaultAboutPageConfig.contactEmailHint.uz,
    },
    contactPhone: source.contactPhone || defaultAboutPageConfig.contactPhone,
    contactPhoneHint: {
      en: source.contactPhoneHint?.en || defaultAboutPageConfig.contactPhoneHint.en,
      ru: source.contactPhoneHint?.ru || defaultAboutPageConfig.contactPhoneHint.ru,
      uz: source.contactPhoneHint?.uz || defaultAboutPageConfig.contactPhoneHint.uz,
    },
    contactAddress: source.contactAddress || defaultAboutPageConfig.contactAddress,
    contactAddressHint: {
      en: source.contactAddressHint?.en || defaultAboutPageConfig.contactAddressHint.en,
      ru: source.contactAddressHint?.ru || defaultAboutPageConfig.contactAddressHint.ru,
      uz: source.contactAddressHint?.uz || defaultAboutPageConfig.contactAddressHint.uz,
    },
    team: normalizedTeam,
  };
}

export async function getAboutPageConfig(): Promise<AboutPageConfig> {
  const row = await prisma.contactMessage.findFirst({
    where: { subject: ABOUT_CONFIG_SUBJECT },
    orderBy: { createdAt: "desc" },
  });

  if (!row) return defaultAboutPageConfig;

  try {
    return normalizeConfig(JSON.parse(row.message));
  } catch {
    return defaultAboutPageConfig;
  }
}

export async function setAboutPageConfig(input: AboutPageConfig): Promise<AboutPageConfig> {
  const normalized = normalizeConfig(input);

  await prisma.contactMessage.create({
    data: {
      name: "System",
      email: "system@local",
      subject: ABOUT_CONFIG_SUBJECT,
      message: JSON.stringify(normalized),
    },
  });

  return normalized;
}
