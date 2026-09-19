"use client";

import type { ReactNode } from "react";
import { createContext, useContext } from "react";
import Link from "next/link";
import { GlossaryTooltip, type GlossaryWord } from "@/components/reader/GlossaryTooltip";

const GlossaryContext = createContext<GlossaryWord[]>([]);

/**
 * THE HUMAN EDIT - Article renderer (section 7, 46)
 * Renders Tiptap JSON documents as server-rendered React.
 * Also renders mid-article ad slots, editorial link blocks,
 * and glossary tooltips for vocabulary words.
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

export interface AdSlot {
  id: string;
  placement: string;
  afterParagraph: number;
  title: string | null;
  body: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  kind: string;
}

export interface EditorialLink {
  slug: string;
  title: string;
  dek: string | null;
  label: string | null;
}

export function ArticleBody({
  doc,
  ads = [],
  links = [],
  words = [],
}: {
  doc: TiptapDoc | null | undefined;
  ads?: AdSlot[];
  links?: EditorialLink[];
  words?: GlossaryWord[];
}) {
  if (!doc?.content?.length) {
    return null;
  }

  const midAd = ads.find((a) => a.placement === "mid");
  const endAd = ads.find((a) => a.placement === "end");
  const topAd = ads.find((a) => a.placement === "top");

  // paragraphs counted for ad placement
  let paragraphIndex = 0;
  const nodes: ReactNode[] = [];

  for (let i = 0; i < doc.content.length; i++) {
    const node = doc.content[i];
    nodes.push(<RenderNode key={i} node={node} />);
    if (node.type === "paragraph") {
      paragraphIndex++;
      if (midAd && paragraphIndex === midAd.afterParagraph) {
        nodes.push(<AdBlock key={`ad-${midAd.id}`} ad={midAd} />);
      }
    }
    // editorial links render after the 2nd paragraph block
    if (node.type === "paragraph" && paragraphIndex === 2 && links.length > 0) {
      nodes.push(<LinksBlock key="links" links={links} />);
    }
  }

  return (
    <GlossaryContext.Provider value={words}>
      <div className="article-body">
        {topAd && <AdBlock ad={topAd} />}
        {nodes}
        {endAd && <AdBlock ad={endAd} />}
      </div>
    </GlossaryContext.Provider>
  );
}

function AdBlock({ ad }: { ad: AdSlot }) {
  return (
    <aside className="ad-slot" aria-label="Sponsored message" data-testid="ad-slot">
      <p className="ad-kicker">
        {ad.kind === "premium" ? "Support The Human Edit" : "Notice"}
      </p>
      {ad.title && <h3>{ad.title}</h3>}
      {ad.body && <p>{ad.body}</p>}
      {ad.ctaLabel && ad.ctaUrl && (
        <a
          href={ad.ctaUrl}
          className="btn btn-primary mt-3"
          style={{ padding: "0.55rem 1.1rem", fontSize: "var(--step--1)" }}
        >
          {ad.ctaLabel}
        </a>
      )}
    </aside>
  );
}

function LinksBlock({ links }: { links: EditorialLink[] }) {
  return (
    <aside
      className="mt-8 border-l-2 border-gold pl-4"
      aria-label="Keep reading"
      data-testid="editorial-links"
    >
      <p className="meta-line font-medium" style={{ color: "var(--gold)" }}>
        Elsewhere in The Human Edit
      </p>
      <ul className="mt-2 space-y-2.5">
        {links.map((l) => (
          <li key={l.slug}>
            <Link
              href={`/articles/${l.slug}`}
              className="group block"
            >
              <span className="font-display text-base text-ink transition-colors group-hover:text-accent">
                {l.label ?? l.title}
              </span>
              {l.dek && (
                <span className="mt-0.5 block text-sm text-ink-muted">
                  {l.dek.slice(0, 120)}
                  {l.dek.length > 120 ? "…" : ""}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </aside>
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
    const words = useContext(GlossaryContext);
    return <>{applyMarks(node.text ?? "", node.marks, words)}</>;
  }
  if (node.type === "hardBreak") return <br />;
  // Nested structure inside inline content - recurse
  return <>{renderInline(node.content)}</>;
}

/** Wrap vocabulary words in GlossaryTooltip, preserving surrounding text. */
function wrapGlossaryWords(text: string, words: GlossaryWord[]): ReactNode {
  if (!words.length || !text) return text;

  // Build a regex that matches any vocabulary word (whole word, case-insensitive)
  const pattern = words
    .map((w) => w.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const regex = new RegExp(`\\b(${pattern})\\b`, "gi");

  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Text before the match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    // Find the glossary word data (case-insensitive lookup)
    const matchedWord = match[0];
    const wordData = words.find(
      (w) => w.word.toLowerCase() === matchedWord.toLowerCase()
    );
    if (wordData) {
      parts.push(
        <GlossaryTooltip key={`glossary-${match.index}`} word={wordData}>
          {matchedWord}
        </GlossaryTooltip>
      );
    } else {
      parts.push(matchedWord);
    }
    lastIndex = regex.lastIndex;
  }

  // Remaining text after last match
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

function applyMarks(text: string, marks: Mark[] | undefined, words: GlossaryWord[]): ReactNode {
  if (!text) return null;

  // First, wrap any vocabulary words in the raw text
  const withGlossary = wrapGlossaryWords(text, words);

  if (!marks?.length) return withGlossary;
  let result: ReactNode = withGlossary;
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
        const isInternal = href.startsWith("/");
        if (isInternal) {
          return (
            <Link href={href}>
              {result}
            </Link>
          );
        }
        return (
          <a href={href} target="_blank" rel="noopener noreferrer">
            {result}
          </a>
        );
      }
      default:
        break;
    }
  }
  return result;
}
