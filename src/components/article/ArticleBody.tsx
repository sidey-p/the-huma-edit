import type { ReactNode } from "react";

/**
 * THE HUMAN EDIT - Article renderer (section 7, 46)
 * Renders Tiptap JSON documents as server-rendered React.
 * No client JS, no animation dependency on the reading path (20.5).
 */

interface TiptapDoc {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  marks?: Mark[];
  text?: string;
}

interface TiptapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  marks?: Mark[];
  text?: string;
}

interface Mark {
  type: string;
  attrs?: Record<string, unknown>;
}

export function ArticleBody({ doc }: { doc: TiptapDoc | null | undefined }) {
  if (!doc?.content?.length) {
    return null;
  }
  return (
    <div className="article-body">
      {doc.content.map((node, i) => (
        <RenderNode key={i} node={node} />
      ))}
    </div>
  );
}

function RenderNode({ node }: { node: TiptapNode }) {
  switch (node.type) {
    case "heading": {
      const level = (node.attrs?.level as number) ?? 2;
      const Tag = (level >= 1 && level <= 4 ? `h${level}` : "h2") as
        | "h1"
        | "h2"
        | "h3"
        | "h4";
      return <Tag>{renderInline(node.content)}</Tag>;
    }
    case "paragraph":
      return <p>{renderInline(node.content)}</p>;
    case "blockquote":
      return <blockquote>{renderChildren(node.content)}</blockquote>;
    case "bulletList":
      return <ul>{renderChildren(node.content)}</ul>;
    case "orderedList":
      return <ol>{renderChildren(node.content)}</ol>;
    case "listItem":
      return <li>{renderChildren(node.content)}</li>;
    case "horizontalRule":
      return <hr className="my-12 border-line" />;
    case "codeBlock":
      return (
        <pre className="overflow-x-auto rounded-editorial border border-line bg-paper-sunken p-4 text-sm">
          <code>{renderInline(node.content)}</code>
        </pre>
      );
    case "hardBreak":
      return <br />;
    default:
      // Unknown/custom editorial blocks: render inner text content so
      // nothing is silently lost.
      return <p className="text-ink-muted">{renderInline(node.content)}</p>;
  }
}

function renderChildren(content: TiptapNode[] | undefined): ReactNode {
  if (!content) return null;
  return <>{content.map((n, i) => <RenderNode key={i} node={n} />)}</>;
}

function renderInline(content: TiptapNode[] | undefined): ReactNode {
  if (!content) return null;
  return <>{content.map((n, i) => <RenderInline key={i} node={n} />)}</>;
}

function RenderInline({ node }: { node: TiptapNode }) {
  if (node.type === "text") {
    return <>{applyMarks(node.text ?? "", node.marks)}</>;
  }
  if (node.type === "hardBreak") return <br />;
  // Nested structure inside inline content - recurse
  return <>{renderInline(node.content)}</>;
}

function applyMarks(text: string, marks: Mark[] | undefined): ReactNode {
  if (!text) return null;
  if (!marks?.length) return text;
  let result: ReactNode = text;
  for (const mark of marks) {
    switch (mark.type) {
      case "bold":
        result = <strong>{result}</strong>;
        break;
      case "italic":
        result = <em>{result}</em>;
        break;
      case "code":
        result = (
          <code className="rounded-editorial-sm bg-paper-sunken px-1 py-0.5 text-[0.9em]">
            {result}
          </code>
        );
        break;
      case "link": {
        const href = (mark.attrs?.href as string) ?? "#";
        return (
          <a href={href} className="underline decoration-accent underline-offset-2">
            {text}
          </a>
        );
      }
      default:
        break;
    }
  }
  return result;
}
