import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/admin-auth";

// POST /api/frontend/seed - Seed database with initial data
export async function POST() {
  try {
    // Check if data already exists
    const existingArticles = await (prisma as any).article.count();
    const existingEvents = await (prisma as any).event.count();

    if (existingArticles > 0 || existingEvents > 0) {
      return NextResponse.json({
        message: "Database already has data. Skipping seed.",
        articlesCount: existingArticles,
        eventsCount: existingEvents,
      });
    }

    // Seed admin user
    const adminEmail = "admin@uwed.local";
    const adminUsername = "admin";
    const adminPassword = process.env.DEMO_ADMIN_PASSWORD ?? "Admin123!";
    await (prisma as any).adminUser.upsert({
      where: { email: adminEmail },
      update: {
        username: adminUsername,
        passwordHash: hashPassword(adminPassword),
        role: "admin",
      },
      create: {
        username: adminUsername,
        email: adminEmail,
        passwordHash: hashPassword(adminPassword),
        role: "admin",
      },
    });

    // Seed Articles
    const articleData = [
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
    ];

    for (const data of articleData) {
      await (prisma as any).article.create({ data });
    }

    // Seed Events
    const eventData = [
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
    ];

    for (const data of eventData) {
      await (prisma as any).event.create({ data });
    }

    return NextResponse.json({
      message: "Database seeded successfully",
      articlesCreated: articleData.length,
      eventsCreated: eventData.length,
      adminCredentials: { username: adminUsername, email: adminEmail },
    });
  } catch (error) {
    console.error("Error seeding database:", error);
    return NextResponse.json(
      { error: "Failed to seed database" },
      { status: 500 },
    );
  }
}
