import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/frontend/events - List all events
export async function GET() {
  try {
    const events = await prisma.event.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ events });
  } catch (error: any) {
    console.error("Error fetching events:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch events",
        details: error.message,
        stack: error.stack,
      },
      { status: 500 },
    );
  }
}

// POST /api/frontend/events - Create new event
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      title,
      titleRu,
      titleUz,
      description,
      descriptionRu,
      descriptionUz,
      date,
      time,
      location,
      locationRu,
      locationUz,
      attendees,
      image,
    } = body;

    // Validate required fields
    if (!title || !date || !location || !time) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const event = await prisma.event.create({
      data: {
        title,
        titleRu: titleRu || null,
        titleUz: titleUz || null,
        description: description || null,
        descriptionRu: descriptionRu || null,
        descriptionUz: descriptionUz || null,
        date,
        time,
        location,
        locationRu: locationRu || null,
        locationUz: locationUz || null,
        attendees: attendees ? parseInt(attendees.toString()) : null,
        image: image || `https://picsum.photos/seed/${title}/800/600`,
      },
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating event:", error);
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 },
    );
  }
}
