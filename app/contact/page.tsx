import ContactClient from "./contact-client";
import { buildPageMetadata } from "@/lib/page-metadata";

export const metadata = buildPageMetadata({
  title: "Contact",
  description:
    "Contact the editorial team of the University of World Economy and Diplomacy media portal — press releases, corrections and tips.",
  path: "/contact",
});

export default function ContactPage() {
  return <ContactClient />;
}
