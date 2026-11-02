import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const CACHE_DIR = resolve(process.cwd(), ".cache");

/**
 * Download a URL to .cache/<name> once and return its bytes. Delete the file
 * (or the whole .cache dir) to force a refresh.
 */
export async function cachedDownload(name: string, url: string, init?: RequestInit): Promise<Buffer> {
  mkdirSync(CACHE_DIR, { recursive: true });
  const p = resolve(CACHE_DIR, name);
  if (existsSync(p)) return readFileSync(p);
  process.stderr.write(`  downloading ${url}\n`);
  let res: Response | undefined;
  for (let attempt = 0; attempt < 6; attempt++) {
    res = await fetch(url, { headers: { "User-Agent": "quiet-parks-pipeline" }, ...init });
    if (res.status !== 429 && res.status < 500) break;
    const wait = 10_000 * 2 ** attempt;
    process.stderr.write(`  ${res.status} from ${new URL(url).host}; retrying in ${wait / 1000}s\n`);
    await sleep(wait);
  }
  if (!res || !res.ok) throw new Error(`GET ${url} -> ${res?.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(p, buf);
  return buf;
}

export async function cachedJson<T>(name: string, url: string, init?: RequestInit): Promise<T> {
  const buf = await cachedDownload(name, url, init);
  return JSON.parse(buf.toString("utf8")) as T;
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
