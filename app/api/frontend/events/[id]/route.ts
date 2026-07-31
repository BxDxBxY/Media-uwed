import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

// PUT /api/frontend/events/[id] - Update event (admin only)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const { id } = await params;
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

    const event = await prisma.event.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(titleRu !== undefined && { titleRu }),
        ...(titleUz !== undefined && { titleUz }),
        ...(description !== undefined && { description }),
        ...(descriptionRu !== undefined && { descriptionRu }),
        ...(descriptionUz !== undefined && { descriptionUz }),
        ...(date && { date }),
        ...(time && { time }),
        ...(location && { location }),
        ...(locationRu !== undefined && { locationRu }),
        ...(locationUz !== undefined && { locationUz }),
        ...(attendees !== undefined && {
          attendees: attendees ? parseInt(attendees.toString()) : null,
        }),
        ...(image !== undefined && { image }),
      },
    });

    return NextResponse.json({ event });
  } catch (error: any) {
    console.error("Error updating event:", error);

    if (error.code === "P2025") {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to update event" },
      { status: 500 },
    );
  }
}

// DELETE /api/frontend/events/[id] - Delete event (admin only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const { id } = await params;
    await prisma.event.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting event:", error);

    if (error.code === "P2025") {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to delete event" },
      { status: 500 },
    );
  }
}
