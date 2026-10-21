import MediaClient from "./media-client";
import { buildPageMetadata } from "@/lib/page-metadata";

export const metadata = buildPageMetadata({
  title: "Media gallery",
  description:
    "Photographs and video from the University of World Economy and Diplomacy: campus, events, research and student life.",
  path: "/media",
});

export default function MediaPage() {
  return <MediaClient />;
}
