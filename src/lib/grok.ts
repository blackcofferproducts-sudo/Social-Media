import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { roboticPhrase } from "./comment-model";
import type { Fixture } from "./fixture";
import { placeOf } from "./fixture";
import { hardFails } from "./policy";

export const GROK_MODEL = "grok-4.7";
const ENDPOINT = "https://api.x.ai/v1/chat/completions";

function localEnv(name: string) {
  const current = process.env[name]?.trim();
  if (current) return current;
  try {
    const file = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
    for (const line of file.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 1 || trimmed.slice(0, eq).trim() !== name) continue;
      const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
      if (!value) return "";
      process.env[name] = value;
      return value;
    }
  } catch {
    return "";
  }
  return "";
}

export function grokModelName() {
  return localEnv("GROK_MODEL") || GROK_MODEL;
}

export function grokReady() {
  return Boolean(localEnv("XAI_API_KEY"));
}

export function cursorReady() {
  return Boolean(localEnv("CURSOR_API_KEY"));
}

export function drafterReady() {
  return grokReady() || cursorReady();
}

export function drafterName() {
  if (grokReady()) return grokModelName();
  if (cursorReady()) return "Cursor";
  return grokModelName();
}

export function grokPrompt(fixture: Fixture, speaker = "Grok 4.7") {
  const place = placeOf(fixture);
  const training = fixture.training;
  const system = [
    `You are ${speaker} writing one short public reply for CITY JAM on Threads.`,
    "Sound like a person who typed it. One reaction to something they actually said.",
    "British English. Spoken. One or two sentences when they only reacted. Up to three sentences when they asked how something works. Do not write a paragraph. No slogan, no summary of their post, and no grade of the song or the post.",
    "Do not say: I won't, I will not, I'd be happy, certainly, delve, as an AI, easy to follow, for that slot, that's a lot for, playing it anyway.",
    "No links. No waitlist URL. No follower counts. No fees, city lists, checklists, back pay, placements, or programme dates that you were not given.",
    "If a fact is missing, say you do not have it, in one spoken sentence. Do not announce a rule.",
    "If they ask whether the reply is automated, say someone drafts this and Pat reads the words before it goes up.",
    "A question is only right when they left something open. Do not ask them to repeat a choice they already made.",
    "If the comment describes someone dying or a serious wish to die, return an empty string.",
    "Output only the reply text. No label, no quotes, no explanation.",
  ].join(" ");
  const lines = [
    `Account voice: a person on Threads for CITY JAM.`,
    `Where it sits: ${place === "others" ? "a comment on someone else's post" : "a reply on CITY JAM's own post"}.`,
    `Their post: ${fixture.post}`,
    `Their comment: ${fixture.comment}`,
  ];
  if (training) {
    lines.push(`Sheet row: ${training.sheetId}. Category: ${training.sheetCategory}.`);
    lines.push(`What the reply must do: ${training.intent}`);
  }
  if (training && /join|waitlist|\bapp\b/i.test(`${training.intent} ${fixture.comment}`)) {
    lines.push(
      "Known: there is an app, and they join in the app. This page is the post, not the sign-up. You have no link to give.",
    );
  }
  lines.push("Write the reply.");
  return { system, user: lines.join("\n") };
}

export function cleanReply(raw: string) {
  let text = raw.trim();
  text = text.replace(/^```[a-z]*\n?/i, "").replace(/```$/, "").trim();
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("“") && text.endsWith("”"))
  ) {
    text = text.slice(1, -1).trim();
  }
  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length > 0) {
    lines[0] = lines[0].replace(/^(?:here(?:'|’)s(?: the reply)?|reply|comment|draft)\s*:\s*/i, "");
  }
  text = lines.filter(Boolean).join(" ");
  return text.replace(/\s+/g, " ").trim();
}

export function replyText(body: unknown) {
  if (!body || typeof body !== "object") return "";
  const choice = (body as { choices?: Array<{ message?: { content?: unknown } }> }).choices?.[0];
  const content = choice?.message?.content;
  if (typeof content === "string") return cleanReply(content);
  if (Array.isArray(content)) {
    const text = content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part && typeof part.text === "string") return part.text;
        return "";
      })
      .join(" ");
    return cleanReply(text);
  }
  return "";
}

export function rejectReply(draft: string, fixture: Fixture) {
  const robotic = roboticPhrase(draft);
  if (robotic) return `Stock phrasing: ${robotic}.`;
  const fails = hardFails(draft, fixture.accountId, placeOf(fixture), fixture.comment);
  if (fails.length > 0) return fails[0];
  if (/https?:\/\/|waitlist\.cityjam/i.test(draft)) return "The reply included a link.";
  if (draft.trim().length < 12) return "The reply was too short to post.";
  return null;
}

type FetchLike = typeof fetch;

export async function askGrok(fixture: Fixture, fetchImpl: FetchLike = fetch) {
  const key = localEnv("XAI_API_KEY");
  if (!key) {
    return {
      ok: false as const,
      note: "Grok 4.7 is the drafter, and XAI_API_KEY is not set. The sheet voice is standing in until you add the key.",
    };
  }
  if (fixture.expected === "handoff") {
    return {
      ok: false as const,
      note: "This comment is a handoff. Grok does not write a public reply.",
    };
  }
  const model = grokModelName();
  const prompt = grokPrompt(fixture);
  let rejection = "Grok did not return a reply that can be scored.";
  let last = "";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const user =
      attempt === 0 ? prompt.user : `${prompt.user}\n\nYour last reply was rejected: ${rejection}\nWrite a different reply.`;
    const response = await fetchImpl(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        reasoning_effort: "low",
        max_completion_tokens: 220,
        messages: [
          { role: "system", content: prompt.system },
          { role: "user", content: user },
        ],
      }),
      signal: AbortSignal.timeout(60_000),
    });
    const raw = await response.text();
    if (!response.ok) {
      const detail = raw.replaceAll(key, "[key]").slice(0, 240);
      return { ok: false as const, note: `Grok ${model} returned ${response.status}. ${detail}` };
    }
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return { ok: false as const, note: `Grok ${model} returned text that was not a reply.` };
    }
    last = replyText(body);
    const problem = rejectReply(last, fixture);
    if (!problem) return { ok: true as const, text: last, model };
    rejection = problem;
  }
  return {
    ok: false as const,
    note: `Grok ${model} replied, and the desk kept the previous text. ${rejection} Last try: ${last.slice(0, 180)}`,
  };
}

export async function askCursor(fixture: Fixture) {
  const key = localEnv("CURSOR_API_KEY");
  if (!key) {
    return { ok: false as const, note: "CURSOR_API_KEY is not set." };
  }
  if (fixture.expected === "handoff") {
    return { ok: false as const, note: "This comment is a handoff. Cursor does not write a public reply." };
  }
  const prompt = grokPrompt(fixture, "Cursor");
  const script = path.join(process.cwd(), "scripts/cursor-reply.ts");
  const child = spawn("npx", ["tsx", script], {
    cwd: process.cwd(),
    env: process.env,
    stdio: ["pipe", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });
  child.stdin.end(JSON.stringify({ system: prompt.system, user: prompt.user }));
  const finished = await new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve) => {
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
    }, 120_000);
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal });
    });
  });
  const hide = (text: string) => text.replaceAll(key, "[key]").slice(0, 300);
  let parsed: { ok?: boolean; text?: string; model?: string; note?: string } | null = null;
  try {
    parsed = JSON.parse(stdout.trim() || "{}");
  } catch {
    parsed = null;
  }
  if (!parsed?.ok || !parsed.text) {
    const detail = hide(parsed?.note || stderr || stdout || `Cursor exited ${finished.code ?? finished.signal}.`);
    return { ok: false as const, note: `Cursor could not write the reply. ${detail}` };
  }
  const text = cleanReply(parsed.text);
  const problem = rejectReply(text, fixture);
  if (problem) {
    return {
      ok: false as const,
      note: `Cursor replied, and the desk kept the previous text. ${problem} Last try: ${text.slice(0, 180)}`,
    };
  }
  return { ok: true as const, text, model: parsed.model?.trim() || "Cursor" };
}

export async function askDrafter(fixture: Fixture) {
  if (grokReady()) return askGrok(fixture);
  if (cursorReady()) return askCursor(fixture);
  return {
    ok: false as const,
    note: "No model key is set. Add XAI_API_KEY for Grok 4.7. The sheet voice is standing in.",
  };
}
