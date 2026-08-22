const CURLY_QUOTES: Record<string, string> = {
  '\u2018': "'",
  '\u2019': "'",
  '\u201C': '"',
  '\u201D': '"',
};

/** Normalize typographic quotes so curly and straight keys compare equal. */
export function normalizeLookupKey(value: string): string {
  return String(value || '').replace(/[\u2018\u2019\u201C\u201D]/g, (ch) => CURLY_QUOTES[ch] || ch);
}

/** Find a record entry by exact key, then by quote-normalized key. */
export function lookupByNormalizedKey<T>(
  record: Record<string, T>,
  key: string
): { key: string; value: T } | undefined {
  if (!key) return undefined;
  if (Object.prototype.hasOwnProperty.call(record, key)) {
    return { key, value: record[key] };
  }

  const normalized = normalizeLookupKey(key);
  if (Object.prototype.hasOwnProperty.call(record, normalized)) {
    return { key: normalized, value: record[normalized] };
  }

  for (const existingKey of Object.keys(record)) {
    if (normalizeLookupKey(existingKey) === normalized) {
      return { key: existingKey, value: record[existingKey] };
    }
  }

  return undefined;
}
