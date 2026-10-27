import { Agent, Cursor, JsonlLocalAgentStore, type ModelSelection } from "@cursor/sdk";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

async function readStdin() {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

function write(payload: unknown) {
  process.stdout.write(JSON.stringify(payload));
}

async function pickModel(apiKey: string): Promise<ModelSelection> {
  const models = await Cursor.models.list({ apiKey });
  const wanted = process.env.CURSOR_REPLY_MODEL?.trim();
  const named = wanted ? models.find((item) => item.id === wanted) : undefined;
  const grok =
    models.find((item) => item.id === "grok-4.7") ?? models.find((item) => /grok/i.test(item.id));
  const composer = models.find((item) => /composer/i.test(item.id));
  const chosen = named ?? grok ?? composer ?? models[0];
  if (!chosen) throw new Error("This Cursor key has no models available.");
  const variant = chosen.variants?.find((item) => item.isDefault) ?? chosen.variants?.[0];
  return { id: chosen.id, params: variant?.params };
}

function loadKey() {
  const current = process.env.CURSOR_API_KEY?.trim();
  if (current) return current;
  const roots = new Set<string>();
  const fromEnv = process.env.CITYJAM_ROOT?.trim();
  if (fromEnv) roots.add(fromEnv);
  roots.add(path.resolve(__dirname, ".."));
  let dir = process.cwd();
  for (let i = 0; i < 6; i += 1) {
    roots.add(dir);
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  for (const root of roots) {
    let text = "";
    try {
      text = fs.readFileSync(path.join(root, ".env.local"), "utf8");
    } catch {
      continue;
    }
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 1 || trimmed.slice(0, eq).trim() !== "CURSOR_API_KEY") continue;
      const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
      if (!value) continue;
      process.env.CURSOR_API_KEY = value;
      return value;
    }
  }
  return "";
}

async function main() {
  const key = loadKey();
  if (!key) {
    write({ ok: false, note: "CURSOR_API_KEY is not set." });
    return;
  }
  const input = JSON.parse(await readStdin()) as { system: string; user: string };
  const cwd = path.join(os.tmpdir(), "cityjam-reply-scratch");
  fs.mkdirSync(cwd, { recursive: true });
  const store = new JsonlLocalAgentStore(path.join(os.tmpdir(), "cityjam-cursor-agents"));
  const model = await pickModel(key);
  const result = await Agent.prompt(
    `${input.system}\n\nDo not use tools. Do not read or edit any file. Output only the reply text.\n\n${input.user}`,
    {
      apiKey: key,
      model,
      tools: [],
      mode: "agent",
      local: { cwd, store, settingSources: [] },
    },
  );
  const text = (result.result ?? "").trim();
  if (result.status !== "finished" || !text) {
    const message = result.error?.message ?? `Cursor run ${result.status}.`;
    write({ ok: false, note: message.replaceAll(key, "[key]").slice(0, 300) });
    return;
  }
  const modelId =
    result.model && typeof result.model === "object" && "id" in result.model ? String(result.model.id) : model.id;
  write({ ok: true, text, model: modelId });
}

main().catch((error: unknown) => {
  const key = process.env.CURSOR_API_KEY?.trim() ?? "";
  const message = error instanceof Error ? error.message : "Cursor could not be reached.";
  write({ ok: false, note: message.replaceAll(key, "[key]").slice(0, 300) });
});
