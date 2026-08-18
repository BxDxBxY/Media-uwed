import AboutClient from "./about-client";
import { buildPageMetadata } from "@/lib/page-metadata";

export const metadata = buildPageMetadata({
  title: "About",
  description:
    "About the news and media portal of the University of World Economy and Diplomacy: what it covers, in which languages, and how articles are reviewed before publication.",
  path: "/about",
});

export default function AboutPage() {
  return <AboutClient />;
}
