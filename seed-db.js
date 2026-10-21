import { PrismaClient } from "./prisma/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/media_uwed?schema=public",
  }),
});

async function seed() {
  console.log("?? Seeding database directly via Prisma...");
  try {
    const existingArticles = await prisma.article.count();
    const existingEvents = await prisma.event.count();

    if (existingArticles > 0 || existingEvents > 0) {
      console.log("?? Database already has data. Skipping seed.");
      return;
    }

    // Seed Categories
    const categoryNames = ["News", "Research", "Sports", "Culture", "Campus Life",
      "University", "World", "Analysis", "Economy", "Technology",
      "Health", "Science", "Education", "Events", "Politics"];
    const categories = await Promise.all(
      categoryNames.map((name) =>
        prisma.category.upsert({ where: { name }, update: {}, create: { name } }),
      ),
    );
    const catMap = Object.fromEntries(categories.map((c) => [c.name, c.id]));
    console.log("? Created " + categories.length + " categories");

    // Seed Articles with category connections
    const articleData = [
      { title: "Breaking: University Announces New Innovation Hub", summary: "The university has unveiled plans for a state-of-the-art innovation hub...", content: "The university has unveiled plans for a state-of-the-art innovation hub that will foster collaboration between students, faculty, and industry partners.", image: "https://picsum.photos/seed/innovation-hub/800/600", cats: ["News", "Education", "University"], date: "Feb 10, 2026", slug: "breaking-news-campus-innovation", author: "Editorial Team" },
    { title: "Research Team Makes Breakthrough in Renewable Energy", summary: "A team of researchers has developed a new solar panel technology...", content: "A team of researchers at our university has developed a groundbreaking solar panel technology.", image: "https://picsum.photos/seed/solar-research/800/600", cats: ["Research", "Science", "Technology"], date: "Feb 9, 2026", slug: "renewable-energy-breakthrough", author: "Dr. Sarah Chen" },
    { title: "Student Athletes Win National Championship", summary: "Our basketball team secured a historic victory in the national championship finals.", content: "In a thrilling finale, our university's basketball team clinched the national championship with a stunning 78-75 victory.", image: "https://picsum.photos/seed/basketball-champs/800/600", cats: ["Sports", "University"], date: "Feb 8, 2026", slug: "national-championship-victory", author: "Sports Desk" },
    { title: "New Arts Center Opens to Public", summary: "The university's new performing arts center showcases world-class facilities...", content: "The university's new performing arts center has officially opened its doors to the public.", image: "https://picsum.photos/seed/arts-center/800/600", cats: ["Culture", "Events"], date: "Feb 7, 2026", slug: "new-arts-center-opens", author: "Arts Reporter" },
    { title: "Campus Sustainability Initiative Wins Award", summary: "Our university's comprehensive sustainability program has been recognized...", content: "The university's comprehensive sustainability initiative has been honored with the National Green Campus Award.", image: "https://picsum.photos/seed/sustainability/800/600", cats: ["Campus Life", "Education"], date: "Feb 6, 2026", slug: "sustainability-award-winner", author: "Campus News" },
    ];

    for (const article of articleData) {
      const { cats, ...fields } = article;
      await prisma.article.create({
        data: {
          ...fields,
          categories: { connect: cats.map((name) => ({ id: catMap[name] })) },
        },
      });
    }
    console.log("? Created " + articleData.length + " articles");

    // Seed Events
    await prisma.event.createMany({
      data: [
        { title: "Annual Science Fair", description: "Join us for our annual science fair featuring innovative projects.", date: "Mar 15, 2026", time: "10:00 AM", location: "Main Campus Hall", attendees: 500, image: "https://picsum.photos/seed/science-fair/800/600" },
        { title: "Guest Lecture: Future of AI", description: "Dr. Emily Watson will discuss the future of artificial intelligence.", date: "Mar 20, 2026", time: "6:00 PM", location: "Auditorium A", attendees: 300, image: "https://picsum.photos/seed/ai-lecture/800/600" },
        { title: "Spring Music Festival", description: "A celebration of music featuring performances by student bands.", date: "Apr 5, 2026", time: "2:00 PM", location: "Outdoor Amphitheater", attendees: 1000, image: "https://picsum.photos/seed/music-festival/800/600" },
        { title: "Career Fair 2026", description: "Connect with top employers and explore career opportunities.", date: "Apr 12, 2026", time: "9:00 AM", location: "Student Center", attendees: 800, image: "https://picsum.photos/seed/career-fair/800/600" },
      ],
    });
    console.log("? Created 4 events");

    console.log("? Seeding complete!");
  } catch (error) {
    console.error("? Seeding failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

seed();