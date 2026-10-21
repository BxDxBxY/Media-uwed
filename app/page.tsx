import HomeClient from "./home-client";
import { buildPageMetadata } from "@/lib/page-metadata";

export const metadata = buildPageMetadata({
  title: "Media Uwed",
  description:
    "News, analysis, events and multimedia from the University of World Economy and Diplomacy — published in English, Russian and Uzbek.",
  path: "/",
});

export default function HomePage() {
  return <HomeClient />;
}
