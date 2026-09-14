import React from "react";

/**
 * Highlights selected text in an article using a simple heuristic
 * (could be enhanced with more sophisticated NLP highlighting).
 */
const SimpleHighlighter = ({ articleId }: { articleId: string }) => {
  // In a real implementation, this would extract highlighted spans
  // from the article content. For now, we'll return a placeholder.
  const highlightedText = articleId === "growth" ? "highlighted text" : "normal text";

  return (
    <div className="highlighter">
      <p>{highlightedText}</p>
    </div>
  );
};

export default SimpleHighlighter;