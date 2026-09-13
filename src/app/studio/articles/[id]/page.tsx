import { notFound } from "next/navigation";
import { WriterDesk } from "@/components/studio/WriterDesk";

/** Writer Desk (§12.3) - the writing screen. */
export default async function StudioArticlePage({
  params,
}: PageProps<"/studio/articles/[id]">) {
  const { id } = await params;
  return <WriterDesk articleId={id} />;
}
