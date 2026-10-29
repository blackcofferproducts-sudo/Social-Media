import fs from "node:fs";
import path from "node:path";
import type { Fixture } from "./fixture";

export const THREADS_SEARCH_URL = "https://graph.threads.com/v1.0/keyword_search";

const DEFAULT_QUERY = "music";
const SEARCH_LIMIT = "5";
const SUCCESS_CACHE_MS = 5 * 60 * 1000;
const ERROR_CACHE_MS = 60 * 1000;

export type ThreadsSearchResult =
  | { ok: true; posts: Fixture[]; note: string }
  | { ok: false; note: string };

type SearchOptions = {
  token?: string;
  query?: string;
  fetchImpl?: typeof fetch;
  now?: number;
};

type CacheEntry = { at: number; ttl: number; result: ThreadsSearchResult };

let cache: CacheEntry | null = null;

export function clearThreadsSearchCache() {
  cache = null;
}

function envFiles() {
  const files = new Set<string>();
  let dir = process.cwd();
  for (let i = 0; i < 6; i += 1) {
    files.add(path.join(dir, ".env.local"));
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return [...files];
}

function readEnvFile(name: string) {
  for (const file of envFiles()) {
    let text = "";
    try {
      text = fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 1 || trimmed.slice(0, eq).trim() !== name) continue;
      const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
      if (!value) return "";
      process.env[name] = value;
      return value;
    }
  }
  return "";
}

function localEnv(name: string) {
  const current = process.env[name]?.trim();
  if (current) return current;
  return readEnvFile(name);
}

function redact(message: string, token: string) {
  const clean = (token ? message.split(token).join("") : message).replace(/\s+/g, " ").trim();
  return clean.slice(0, 280) || "Threads refused the search.";
}

function asRecord(value: unknown) {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

export function postsFromThreadsSearch(payload: unknown): Fixture[] {
  const body = asRecord(payload);
  const data = body?.data;
  if (!Array.isArray(data)) return [];
  const posts: Fixture[] = [];
  for (const item of data) {
    const row = asRecord(item);
    const id = typeof row?.id === "string" ? row.id.trim() : "";
    const text = typeof row?.text === "string" ? row.text.trim() : "";
    if (!id || !text) continue;
    const username = typeof row?.username === "string" ? row.username.trim() : "";
    posts.push({
      id: id.startsWith("threads-") ? id : `threads-${id}`,
      accountId: "threads",
      place: "others",
      author: username || "Threads",
      post: text,
      comment: text,
      category: "music",
      signal: "ordinary",
      expected: "reply",
      suggestedDraft: "",
    });
  }
  return posts;
}

export async function searchThreadsMusic(options: SearchOptions = {}): Promise<ThreadsSearchResult> {
  const now = options.now ?? Date.now();
  const useCache = !options.fetchImpl;
  if (useCache && cache && now - cache.at < cache.ttl) return cache.result;

  const token = (options.token !== undefined ? options.token : localEnv("THREADS_ACCESS_TOKEN")).trim();
  const query = (options.query ?? localEnv("THREADS_SEARCH_QUERY") ?? DEFAULT_QUERY).trim() || DEFAULT_QUERY;
  if (!token) {
    const result: ThreadsSearchResult = {
      ok: false,
      note: "Add THREADS_ACCESS_TOKEN to .env.local and restart the desk. The token needs threads_basic and threads_keyword_search. Until Meta approves that search permission, Threads only returns posts from the connected account.",
    };
    if (useCache) cache = { at: now, ttl: ERROR_CACHE_MS, result };
    return result;
  }

  const url = new URL(THREADS_SEARCH_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("search_type", "RECENT");
  url.searchParams.set("search_mode", "KEYWORD");
  url.searchParams.set("limit", SEARCH_LIMIT);
  url.searchParams.set("fields", "id,text,username");
  url.searchParams.set("access_token", token);

  let result: ThreadsSearchResult;
  try {
    const response = await (options.fetchImpl ?? fetch)(url, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
    const payload = (await response.json()) as unknown;
    const body = asRecord(payload);
    const error = asRecord(body?.error);
    const message = typeof error?.message === "string" ? error.message : "";
    if (!response.ok || message) {
      result = { ok: false, note: redact(message || `Threads returned ${response.status}.`, token) };
    } else {
      const posts = postsFromThreadsSearch(payload);
      result = {
        ok: true,
        posts,
        note: posts.length === 0 ? "Threads returned no music posts for this search." : "",
      };
    }
  } catch {
    result = { ok: false, note: "Threads could not be reached." };
  }

  if (useCache) cache = { at: now, ttl: result.ok ? SUCCESS_CACHE_MS : ERROR_CACHE_MS, result };
  return result;
}
