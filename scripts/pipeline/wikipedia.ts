import { getJson } from './http';

interface Summary {
  type?: string;
  title?: string;
  content_urls?: { desktop?: { page?: string } };
}

export interface WikiPage {
  title: string;
  url: string;
}

/** The first title that resolves to a real article (not a disambiguation page). */
export async function findArticle(titles: string[]): Promise<WikiPage | null> {
  for (const title of titles) {
    const res = await getJson<Summary>(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}?redirect=true`,
    );
    const url = res?.content_urls?.desktop?.page;
    if (res && res.type === 'standard' && url) return { title: res.title ?? title, url };
  }
  return null;
}
