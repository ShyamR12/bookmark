export function normalizeUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;

    url.protocol = url.protocol.toLowerCase();
    url.hostname = url.hostname.toLowerCase();
    url.hash = "";
    if ((url.protocol === "http:" && url.port === "80") || (url.protocol === "https:" && url.port === "443")) url.port = "";

    const retained = [...url.searchParams.entries()]
      .filter(([key]) => !/^utm_/i.test(key) && key.toLowerCase() !== "fbclid" && key.toLowerCase() !== "gclid")
      .sort(([keyA, valueA], [keyB, valueB]) => keyA.localeCompare(keyB) || valueA.localeCompare(valueB));
    url.search = "";
    retained.forEach(([key, value]) => url.searchParams.append(key, value));
    return url.toString();
  } catch {
    return null;
  }
}

export function pageTitle(title: string, url: string): string {
  const cleanTitle = title.replace(/\s+/g, " ").trim();
  if (cleanTitle) return cleanTitle;
  try { return new URL(url).hostname; } catch { return url; }
}
