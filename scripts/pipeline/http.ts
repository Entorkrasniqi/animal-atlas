import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const USER_AGENT = 'animal-atlas-pipeline (+https://github.com/Entorkrasniqi/animal-atlas)';
const CACHE_DIR = path.resolve('.cache/pipeline');

/** Minimum gap between requests to one host, in ms. These are shared public services: be gentle. */
const MIN_GAP_MS: Record<string, number> = {
  'api.gbif.org': 120,
  'paleobiodb.org': 250,
  'api.phylopic.org': 120,
  'images.phylopic.org': 120,
  'en.wikipedia.org': 100,
  'raw.githubusercontent.com': 300,
};

let refresh = false;
export function setRefresh(value: boolean): void {
  refresh = value;
}

const nextSlot = new Map<string, number>();

/** Serialises request starts per host so concurrent workers still respect MIN_GAP_MS. */
async function throttle(host: string): Promise<void> {
  const gap = MIN_GAP_MS[host] ?? 150;
  const now = Date.now();
  const start = Math.max(now, nextSlot.get(host) ?? 0);
  nextSlot.set(host, start + gap);
  if (start > now) await new Promise((r) => setTimeout(r, start - now));
}

interface CacheEntry {
  url: string;
  status: number;
  body: string;
  fetchedAt: string;
}

export interface Response {
  status: number;
  body: string;
  fromCache: boolean;
}

export interface FetchOptions {
  /** Don't read or write the cache (for volatile lookups such as PhyloPic's build number). */
  noCache?: boolean;
  /** The body is binary (e.g. a vector tile): it is cached and returned base64-encoded. */
  binary?: boolean;
}

async function readCache(file: string): Promise<CacheEntry | null> {
  try {
    return JSON.parse(await readFile(file, 'utf8')) as CacheEntry;
  } catch {
    return null;
  }
}

/**
 * GET a URL with an on-disk cache, per-host throttling and retries on 429/5xx.
 * 404 is a normal answer ("no such taxon") and is cached; other failures throw.
 */
export async function get(url: string, options: FetchOptions = {}): Promise<Response> {
  const file = path.join(CACHE_DIR, `${createHash('sha1').update(url).digest('hex')}.json`);
  if (!options.noCache && !refresh) {
    const hit = await readCache(file);
    if (hit) return { status: hit.status, body: hit.body, fromCache: true };
  }

  const host = new URL(url).host;
  let lastError: unknown;
  for (let attempt = 0; attempt < 5; attempt++) {
    await throttle(host);
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json, image/svg+xml, */*' },
        signal: AbortSignal.timeout(45_000),
        redirect: 'follow',
      });
      if (res.status === 429 || res.status >= 500) {
        lastError = new Error(`HTTP ${res.status} for ${url}`);
        await new Promise((r) => setTimeout(r, 1500 * 2 ** attempt));
        continue;
      }
      const body = options.binary ? Buffer.from(await res.arrayBuffer()).toString('base64') : await res.text();
      if (!options.noCache) {
        await mkdir(CACHE_DIR, { recursive: true });
        const entry: CacheEntry = { url, status: res.status, body, fetchedAt: new Date().toISOString() };
        await writeFile(file, JSON.stringify(entry));
      }
      return { status: res.status, body, fromCache: false };
    } catch (err) {
      lastError = err;
      await new Promise((r) => setTimeout(r, 1500 * 2 ** attempt));
    }
  }
  throw new Error(`Giving up on ${url}: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

/** GET and parse JSON. Returns null for 404, empty bodies, and PBDB's "no match" 400s. */
export async function getJson<T>(url: string, options?: FetchOptions): Promise<T | null> {
  const res = await get(url, options);
  if (res.status === 404) return null;
  if (res.status >= 400) {
    // PBDB answers a failed lookup with 400 + a warnings array; treat as "not found".
    if (res.status === 400 && url.includes('paleobiodb.org')) return null;
    throw new Error(`HTTP ${res.status} for ${url}: ${res.body.slice(0, 200)}`);
  }
  // Some endpoints answer "nothing here" with a 200/204 and an empty body.
  if (res.body.trim() === '') return null;
  return JSON.parse(res.body) as T;
}

/** Run `fn` over `items` with at most `limit` in flight, keeping result order. */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}
