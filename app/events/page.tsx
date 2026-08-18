import EventsClient from "./events-client";
import { buildPageMetadata } from "@/lib/page-metadata";

export const metadata = buildPageMetadata({
  title: "Events",
  description:
    "Conferences, lectures, ceremonies and student activities at the University of World Economy and Diplomacy — upcoming and past.",
  path: "/events",
});

export default function EventsPage() {
  return <EventsClient />;
}
