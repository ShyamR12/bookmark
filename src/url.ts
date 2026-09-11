const droppedParam = /^(utm_|fbclid$|gclid$)/i;

export function normalizeUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.hash = "";
    const retained = [...url.searchParams.entries()]
      .filter(([key]) => !droppedParam.test(key))
      .sort(([keyA, valueA], [keyB, valueB]) => keyA.localeCompare(keyB) || valueA.localeCompare(valueB));
    url.search = "";
    for (const [key, value] of retained) url.searchParams.append(key, value);
    return url.href;
  } catch {
    return null;
  }
}

export function pageTitle(title: string, url: string): string {
  const cleanTitle = title.replace(/\s+/g, " ").trim();
  if (cleanTitle) return cleanTitle;
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
