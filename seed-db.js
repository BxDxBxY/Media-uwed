const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function seed() {
  console.log("🌱 Seeding database directly via Prisma...");
  try {
    // Check if data already exists
    const existingArticles = await prisma.article.count();
    const existingEvents = await prisma.event.count();

    if (existingArticles > 0 || existingEvents > 0) {
      console.log("⚠️ Database already has data. Skipping seed.");
      return;
    }

    // Seed Articles
    await prisma.article.createMany({
      data: [
        {
          title: "Breaking: University Announces New Innovation Hub",
          summary:
            "The university has unveiled plans for a state-of-the-art innovation hub that will foster collaboration between students, faculty, and industry partners.",
          content:
            "The university has unveiled plans for a state-of-the-art innovation hub that will foster collaboration between students, faculty, and industry partners. The new facility, set to open next fall, will feature cutting-edge laboratories, collaborative workspaces, and advanced technology resources.",
          image: "https://picsum.photos/seed/innovation-hub/800/600",
          category: "News",
          date: "Feb 10, 2026",
          slug: "breaking-news-campus-innovation",
          author: "Editorial Team",
        },
        {
          title: "Research Team Makes Breakthrough in Renewable Energy",
          summary:
            "A team of researchers has developed a new solar panel technology that could revolutionize the renewable energy sector.",
          content:
            "A team of researchers at our university has developed a groundbreaking solar panel technology that promises to revolutionize the renewable energy sector.",
          image: "https://picsum.photos/seed/solar-research/800/600",
          category: "Research",
          date: "Feb 9, 2026",
          slug: "renewable-energy-breakthrough",
          author: "Dr. Sarah Chen",
        },
        {
          title: "Student Athletes Win National Championship",
          summary:
            "Our basketball team secured a historic victory in the national championship finals.",
          content:
            "In a thrilling finale, our university's basketball team clinched the national championship with a stunning 78-75 victory.",
          image: "https://picsum.photos/seed/basketball-champs/800/600",
          category: "Sports",
          date: "Feb 8, 2026",
          slug: "national-championship-victory",
          author: "Sports Desk",
        },
        {
          title: "New Arts Center Opens to Public",
          summary:
            "The university's new performing arts center showcases world-class facilities for music, theater, and dance.",
          content:
            "The university's new performing arts center has officially opened its doors to the public, offering world-class facilities.",
          image: "https://picsum.photos/seed/arts-center/800/600",
          category: "Culture",
          date: "Feb 7, 2026",
          slug: "new-arts-center-opens",
          author: "Arts Reporter",
        },
        {
          title: "Campus Sustainability Initiative Wins Award",
          summary:
            "Our university's comprehensive sustainability program has been recognized with a prestigious national award.",
          content:
            "The university's comprehensive sustainability initiative has been honored with the National Green Campus Award.",
          image: "https://picsum.photos/seed/sustainability/800/600",
          category: "Campus Life",
          date: "Feb 6, 2026",
          slug: "sustainability-award-winner",
          author: "Campus News",
        },
      ],
    });

    // Seed Events
    await prisma.event.createMany({
      data: [
        {
          title: "Annual Science Fair",
          description:
            "Join us for our annual science fair featuring innovative projects.",
          date: "Mar 15, 2026",
          time: "10:00 AM",
          location: "Main Campus Hall",
          attendees: 500,
          image: "https://picsum.photos/seed/science-fair/800/600",
        },
        {
          title: "Guest Lecture: Future of AI",
          description:
            "Dr. Emily Watson will discuss the future of artificial intelligence.",
          date: "Mar 20, 2026",
          time: "6:00 PM",
          location: "Auditorium A",
          attendees: 300,
          image: "https://picsum.photos/seed/ai-lecture/800/600",
        },
        {
          title: "Spring Music Festival",
          description:
            "A celebration of music featuring performances by student bands.",
          date: "Apr 5, 2026",
          time: "2:00 PM",
          location: "Outdoor Amphitheater",
          attendees: 1000,
          image: "https://picsum.photos/seed/music-festival/800/600",
        },
        {
          title: "Career Fair 2026",
          description:
            "Connect with top employers and explore career opportunities.",
          date: "Apr 12, 2026",
          time: "9:00 AM",
          location: "Student Center",
          attendees: 800,
          image: "https://picsum.photos/seed/career-fair/800/600",
        },
      ],
    });

    console.log("✅ Seeding complete!");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
