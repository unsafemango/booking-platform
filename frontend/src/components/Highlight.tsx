/** Escapes characters that have a meaning in regular expressions. */
function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Renders text with every case-insensitive match of the query wrapped in <mark>. */
export default function Highlight({ text, query }: { text: string; query: string }) {
  const needle = query.trim();
  if (!needle) return <>{text}</>;
  // A capturing group keeps the matches in the split result, at odd indexes.
  const parts = text.split(new RegExp(`(${escapeRegExp(needle)})`, 'gi'));
  return <>{parts.map((part, i) => (i % 2 === 1 ? <mark key={i}>{part}</mark> : part))}</>;
}
