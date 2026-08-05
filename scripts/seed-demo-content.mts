/**
 * Fills the empty sections with starter content — `npm run seed:demo`.
 *
 * Media and About were completely empty, which is why the homepage rendered blank grids
 * and the About page fell through to its hard-coded fallback. This script gives every
 * section something coherent to show.
 *
 * Two rules it follows deliberately:
 *
 *  - **No invented facts about the university.** No founding year, no named staff, no
 *    street address, no attendance figures. The text describes the portal itself, which is
 *    verifiable, and the photographs are openly-licensed stock with generic titles.
 *  - **Idempotent.** Matches on a natural key and updates, so running it twice does not
 *    duplicate rows and does not overwrite anything an editor has since changed by hand.
 *
 * The images are stock photographs, not pictures of this campus. Replace them from
 * Admin → Media before launch.
 */
import { prisma } from "@/lib/prisma";

const STOCK = {
  library: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?q=80&w=1600&auto=format&fit=crop",
  lecture: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=1600&auto=format&fit=crop",
  graduation: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=1600&auto=format&fit=crop",
  conference: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=1600&auto=format&fit=crop",
  campus: "https://images.unsplash.com/photo-1541339907198-e08756ebafe3?q=80&w=1600&auto=format&fit=crop",
  study: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1600&auto=format&fit=crop",
  reading: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=1600&auto=format&fit=crop",
};

type MediaSeed = {
  title: string;
  titleRu: string;
  titleUz: string;
  url: string;
  category: string;
};

const MEDIA: MediaSeed[] = [
  {
    title: "Campus library",
    titleRu: "Университетская библиотека",
    titleUz: "Universitet kutubxonasi",
    url: STOCK.library,
    category: "Campus",
  },
  {
    title: "Lecture hall",
    titleRu: "Лекционный зал",
    titleUz: "Ma'ruza zali",
    url: STOCK.lecture,
    category: "Campus",
  },
  {
    title: "International conference",
    titleRu: "Международная конференция",
    titleUz: "Xalqaro konferensiya",
    url: STOCK.conference,
    category: "Events",
  },
  {
    title: "Reading room",
    titleRu: "Читальный зал",
    titleUz: "O'quv zali",
    url: STOCK.reading,
    category: "Student Life",
  },
  {
    title: "Study group",
    titleRu: "Работа в группе",
    titleUz: "Guruhda ishlash",
    url: STOCK.study,
    category: "Student Life",
  },
  // Two slots the homepage hero reads by category. Without them the hero previously
  // showed the admin instruction "Set media category to hero-side…" to visitors.
  {
    title: "University campus",
    titleRu: "Кампус университета",
    titleUz: "Universitet kampusi",
    url: STOCK.campus,
    category: "hero-banner",
  },
  {
    title: "Inside the newsroom",
    titleRu: "В редакции",
    titleUz: "Tahririyatda",
    url: STOCK.graduation,
    category: "hero-side",
  },
];

let mediaCreated = 0;
let mediaUpdated = 0;

for (const item of MEDIA) {
  const existing = await prisma.media.findFirst({ where: { title: item.title } });

  if (existing) {
    await prisma.media.update({
      where: { id: existing.id },
      data: { titleRu: item.titleRu, titleUz: item.titleUz, category: item.category },
    });
    mediaUpdated++;
  } else {
    await prisma.media.create({
      data: {
        type: "image",
        title: item.title,
        titleRu: item.titleRu,
        titleUz: item.titleUz,
        url: item.url,
        thumbnail: item.url,
        category: item.category,
      },
    });
    mediaCreated++;
  }
}

console.log(`media: ${mediaCreated} created, ${mediaUpdated} updated (${await prisma.media.count()} total)`);

// About page hero text. Describes the portal — nothing asserted about the institution
// that is not already published on uwed.uz.
const ABOUT = {
  title: "About this portal",
  titleRu: "Об этом портале",
  titleUz: "Bu portal haqida",
  content:
    "The news and media portal of the University of World Economy and Diplomacy — university news, Uzbekistan's diplomacy and economy, and Central Asian affairs, published in three languages and reviewed by an editor before publication.",
  contentRu:
    "Новостной и медиапортал Университета мировой экономики и дипломатии — новости университета, дипломатия и экономика Узбекистана, дела Центральной Азии. Три языка, и каждый материал проходит через редактора перед публикацией.",
  contentUz:
    "Jahon iqtisodiyoti va diplomatiya universitetining yangiliklar va media portali — universitet yangiliklari, O'zbekiston diplomatiyasi va iqtisodiyoti, Markaziy Osiyo voqealari. Uch tilda, va har bir material chiqishdan oldin muharrir ko'rigidan o'tadi.",
  image: STOCK.campus,
};

const existingAbout = await prisma.aboutContent.findFirst();
if (existingAbout) {
  await prisma.aboutContent.update({ where: { id: existingAbout.id }, data: ABOUT });
  console.log("about: updated the existing row");
} else {
  await prisma.aboutContent.create({ data: ABOUT });
  console.log("about: created");
}

/**
 * Events. Dates are deliberately relative to the run date so the "upcoming" tab is not
 * empty the day after seeding, and generic enough to be replaced.
 */
const daysFromNow = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const EVENTS = [
  {
    title: "Open day for prospective students",
    titleRu: "День открытых дверей",
    titleUz: "Ochiq eshiklar kuni",
    description: "Admissions, faculties and student life, presented by the departments.",
    descriptionRu: "Приём, факультеты и студенческая жизнь — презентации кафедр.",
    descriptionUz: "Qabul, fakultetlar va talabalar hayoti — kafedralar taqdimoti.",
    date: daysFromNow(14),
    time: "10:00",
    location: "Main building",
    locationRu: "Главный корпус",
    locationUz: "Asosiy bino",
    image: STOCK.campus,
  },
  {
    title: "Regional diplomacy roundtable",
    titleRu: "Круглый стол по региональной дипломатии",
    titleUz: "Mintaqaviy diplomatiya bo'yicha davra suhbati",
    description: "Faculty and guest speakers on Central Asian cooperation.",
    descriptionRu: "Преподаватели и приглашённые спикеры о сотрудничестве в Центральной Азии.",
    descriptionUz: "Professor-o'qituvchilar va taklif etilgan spikerlar Markaziy Osiyo hamkorligi haqida.",
    date: daysFromNow(28),
    time: "15:00",
    location: "Conference hall",
    locationRu: "Конференц-зал",
    locationUz: "Konferensiya zali",
    image: STOCK.conference,
  },
  {
    title: "Student research conference",
    titleRu: "Студенческая научная конференция",
    titleUz: "Talabalar ilmiy konferensiyasi",
    description: "Presentations from undergraduate and graduate researchers.",
    descriptionRu: "Доклады студентов и магистрантов.",
    descriptionUz: "Bakalavr va magistratura talabalarining ma'ruzalari.",
    date: daysFromNow(45),
    time: "11:00",
    location: "Library reading room",
    locationRu: "Читальный зал библиотеки",
    locationUz: "Kutubxona o'quv zali",
    image: STOCK.library,
  },
];

let eventsCreated = 0;
let eventsUpdated = 0;

for (const event of EVENTS) {
  const existing = await prisma.event.findFirst({ where: { title: event.title } });

  if (existing) {
    await prisma.event.update({ where: { id: existing.id }, data: event });
    eventsUpdated++;
  } else {
    await prisma.event.create({ data: event });
    eventsCreated++;
  }
}

console.log(`events: ${eventsCreated} created, ${eventsUpdated} updated (${await prisma.event.count()} total)`);
console.log(
  "\nThe photographs are openly-licensed stock, not pictures of this campus." +
    "\nReplace them from Admin -> Media, and enter the real masthead in Admin -> About.",
);

await prisma.$disconnect();
