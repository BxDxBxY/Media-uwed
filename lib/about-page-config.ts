import { prisma } from "@/lib/prisma";

const ABOUT_CONFIG_KEY = "about";

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

/**
 * Fallback shown until an editor fills the About page in.
 *
 * Deliberately contains **no claims that cannot be verified from this repository**: no
 * founding year, no street address, no named staff. The previous defaults asserted
 * "Established in 1995", a US phone number, "Student Center, Room 304", and a team of
 * "Sarah Connor", "James T. Kirk" and "Nyota Uhura" — template placeholders that were
 * being rendered to the public as fact, because `about_content` is empty. Inventing
 * details about a real institution is worse than an obviously unfinished page.
 */
export const defaultAboutPageConfig: AboutPageConfig = {
  missionTitle: {
    en: "About this portal",
    ru: "Об этом портале",
    uz: "Bu portal haqida",
  },
  missionBody: {
    en: "This is the news and media portal of the University of World Economy and Diplomacy. It publishes university news alongside coverage of Uzbekistan's diplomacy, economy and higher education, and of Central Asian regional affairs.\n\nEvery article is published in English, Russian and Uzbek, and every article passes through an editor before it appears here — nothing reaches the site unreviewed.",
    ru: "Это новостной и медиапортал Университета мировой экономики и дипломатии. Здесь публикуются новости университета, а также материалы о дипломатии, экономике и высшем образовании Узбекистана и о региональных делах Центральной Азии.\n\nКаждый материал выходит на английском, русском и узбекском языках и проходит через редактора — на сайт не попадает ничего непроверенного.",
    uz: "Bu — Jahon iqtisodiyoti va diplomatiya universitetining yangiliklar va media portali. Bu yerda universitet yangiliklari, shuningdek O‘zbekiston diplomatiyasi, iqtisodiyoti va oliy ta’limi hamda Markaziy Osiyo mintaqasidagi voqealar yoritiladi.\n\nHar bir material ingliz, rus va o‘zbek tillarida chiqadi va muharrir ko‘rigidan o‘tadi — saytga tekshirilmagan hech narsa chiqmaydi.",
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
  // The university's own published address; nothing here is invented.
  contactEmail: "info@uwed.uz",
  contactEmailHint: {
    en: "For press releases and tips",
    ru: "Для пресс-релизов и обращений",
    uz: "Press-relizlar va murojaatlar uchun",
  },
  contactPhone: "",
  contactPhoneHint: {
    en: "Add the newsroom number in Admin → About",
    ru: "Укажите телефон редакции в Админке → О нас",
    uz: "Tahririyat raqamini Admin → Biz haqimizda bo‘limida kiriting",
  },
  contactAddress: "uwed.uz",
  contactAddressHint: {
    en: "University of World Economy and Diplomacy, Tashkent",
    ru: "Университет мировой экономики и дипломатии, Ташкент",
    uz: "Jahon iqtisodiyoti va diplomatiya universiteti, Toshkent",
  },
  // Empty on purpose: a real masthead is entered in Admin → About. The page hides the
  // team section entirely rather than showing invented staff.
  team: [],
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
  const row = await prisma.pageConfig.findUnique({ where: { key: ABOUT_CONFIG_KEY } });

  if (!row) return defaultAboutPageConfig;

  try {
    return normalizeConfig(JSON.parse(row.value));
  } catch {
    return defaultAboutPageConfig;
  }
}

export async function setAboutPageConfig(input: AboutPageConfig): Promise<AboutPageConfig> {
  const normalized = normalizeConfig(input);
  const value = JSON.stringify(normalized);

  // Upsert, not insert: this is one document, not an event log.
  await prisma.pageConfig.upsert({
    where: { key: ABOUT_CONFIG_KEY },
    create: { key: ABOUT_CONFIG_KEY, value },
    update: { value },
  });

  return normalized;
}
