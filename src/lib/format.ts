/** Small display formatters for reader-facing metadata. */

export function formatReadingTime(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes} min read`;
}

export function formatDate(timestamp: number | undefined): string {
  if (!timestamp) return "";
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timestamp));
}
