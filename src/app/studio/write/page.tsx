import type { Metadata } from "next";
import { PublicShell } from "@/components/navigation/PublicShell";
import NewArticleInner from "./NewArticleInner";

export default function NewArticlePage() {
  return (
    <PublicShell>
      <NewArticleInner />
    </PublicShell>
  );
}

export const metadata: Metadata = {
  title: "New article",
  robots: { index: false, follow: false },
};
