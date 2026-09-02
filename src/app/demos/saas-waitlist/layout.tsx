import type { Metadata } from "next";
import { generateDemoMetadata } from "@/lib/seo/demo-metadata";

export const metadata: Metadata = generateDemoMetadata("saas-waitlist");

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
