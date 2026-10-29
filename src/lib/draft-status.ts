import type { Fixture } from "./fixture";
import type { CommentRecord } from "./desk";

export const WRITING_NOTE = "This comment came in. Grok is writing the reply.";

export type ModelPhase = "handoff" | "writing" | "ready" | "failed" | "queued" | "edited";

export function needsModelDraft(fixture: Fixture | undefined, record: CommentRecord | undefined) {
  if (!fixture || !record) return false;
  if (fixture.expected !== "reply") return false;
  if (record.outcome !== "open") return false;
  if (record.source !== "sheet") return false;
  if (record.grokNote && record.grokNote !== WRITING_NOTE) return false;
  return true;
}

export function modelPhase(fixture: Fixture, record: CommentRecord): ModelPhase {
  if (fixture.expected === "handoff" || record.outcome === "handed-off") return "handoff";
  if (record.source === "edited") return "edited";
  if (record.source === "grok") return "ready";
  if (record.grokNote === WRITING_NOTE) return "writing";
  if (record.grokNote) return "failed";
  return "queued";
}
