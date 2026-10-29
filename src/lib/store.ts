import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { TesterScore } from "./policy";
import { fixtures } from "./fixtures";
import {
  addIncomingTo,
  applySeed,
  capSummary,
  gateFor,
  kolkataDay,
  normaliseDesk,
  resolveFixture as resolveIncoming,
  STORE_VERSION,
  type CommentRecord,
  type DeskState,
} from "./desk";

export type { CommentRecord, DeskState, DraftSource, Outcome, SendRecord } from "./desk";
export {
  absorbDesk,
  addIncomingTo,
  applySeed,
  capSummary,
  gateFor,
  kolkataDay,
  mergeDesk,
  normaliseDesk,
  sentToday,
  STORE_VERSION,
} from "./desk";

export function resolveFixture(state: DeskState, id: string) {
  return resolveIncoming(state, id) ?? fixtures.find((item) => item.id === id);
}

const bundledPath = path.join(process.cwd(), "data", "desk-state.json");
const scratchPath = path.join(os.tmpdir(), "cityjam-desk-state.json");
let activePath: string | null = null;

function directoryIsWritable(dir: string) {
  try {
    fs.mkdirSync(dir, { recursive: true });
    const probe = path.join(dir, ".desk-write-probe");
    fs.writeFileSync(probe, "ok");
    fs.unlinkSync(probe);
    return true;
  } catch {
    return false;
  }
}

function deskFile() {
  if (activePath) return activePath;
  activePath = directoryIsWritable(path.dirname(bundledPath)) ? bundledPath : scratchPath;
  return activePath;
}

export function deskUsesScratchFile() {
  return deskFile() !== bundledPath;
}

function readDesk(): DeskState {
  const filePath = deskFile();
  if (!fs.existsSync(filePath)) return normaliseDesk(null);
  try {
    return normaliseDesk(JSON.parse(fs.readFileSync(filePath, "utf8")) as DeskState);
  } catch {
    return normaliseDesk(null);
  }
}

export function getDesk(): DeskState {
  return applySeed(readDesk(), fixtures);
}

export function commitDesk(state: DeskState) {
  return writeDesk(state);
}

function writeDesk(state: DeskState) {
  const next = { ...state, version: STORE_VERSION, revision: state.revision + 1 };
  try {
    const filePath = deskFile();
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(next, null, 2));
  } catch {
    // Vercel does not keep this file. The browser copy is the one that stays.
  }
  return next;
}

export function addIncoming(fixture: Parameters<typeof addIncomingTo>[1], reply?: { text: string; model: string }) {
  return writeDesk(addIncomingTo(getDesk(), fixture, reply));
}

function updateFrom(state: DeskState, commentId: string, change: (state: DeskState, record: CommentRecord) => void) {
  const record = state.comments[commentId];
  if (!record) return writeDesk(state);
  const comments = { ...state.comments, [commentId]: { ...record } };
  const next = { ...state, comments, sends: [...state.sends] };
  change(next, comments[commentId]);
  return writeDesk(next);
}

function update(commentId: string, change: (state: DeskState, record: CommentRecord) => void) {
  return updateFrom(getDesk(), commentId, change);
}

export function saveTesterNamesOn(snapshot: DeskState, a: string, b: string) {
  const state = normaliseDesk(snapshot);
  return writeDesk({ ...state, testerNames: { a: a.trim(), b: b.trim() } });
}

export function saveDraftOn(snapshot: DeskState, commentId: string, draft: string) {
  return updateFrom(normaliseDesk(snapshot), commentId, (_state, record) => {
    if (record.outcome !== "open") return;
    if (record.draft === draft) return;
    record.draft = draft;
    record.source = "edited";
    record.model = null;
    record.grokNote = null;
    record.testerA = null;
    record.testerB = null;
    record.approvedText = null;
  });
}

export function saveScoreOn(snapshot: DeskState, commentId: string, seat: "a" | "b", score: TesterScore) {
  return updateFrom(normaliseDesk(snapshot), commentId, (state, record) => {
    if (record.outcome !== "open") return;
    if (seat === "a") record.testerA = score;
    else record.testerB = score;
    const gate = gateFor(state, commentId, kolkataDay(), resolveFixture);
    if (!gate?.readyForPat || record.approvedText !== record.draft) record.approvedText = null;
  });
}

export function approveOn(snapshot: DeskState, commentId: string) {
  return updateFrom(normaliseDesk(snapshot), commentId, (state, record) => {
    const gate = gateFor(state, commentId, kolkataDay(), resolveFixture);
    if (!gate?.readyForPat) return;
    record.approvedText = record.draft;
  });
}

export function handoffOn(snapshot: DeskState, commentId: string) {
  return updateFrom(normaliseDesk(snapshot), commentId, (_state, record) => {
    if (record.outcome !== "open") return;
    record.outcome = "handed-off";
    record.approvedText = null;
  });
}

export function publishOn(snapshot: DeskState, commentId: string) {
  return updateFrom(normaliseDesk(snapshot), commentId, (state, record) => {
    const fixture = resolveFixture(state, commentId);
    const gate = gateFor(state, commentId, kolkataDay(), resolveFixture);
    if (!fixture || !gate?.canMockPublish) return;
    record.outcome = "mock-published";
    state.sends.push({ accountId: fixture.accountId, commentId, day: kolkataDay(), mode: "mock" });
  });
}

export function manualOn(snapshot: DeskState, commentId: string) {
  return updateFrom(normaliseDesk(snapshot), commentId, (state, record) => {
    const fixture = resolveFixture(state, commentId);
    const gate = gateFor(state, commentId, kolkataDay(), resolveFixture);
    if (!fixture || !gate?.canRecordManual) return;
    record.outcome = "posted-by-pat";
    state.sends.push({ accountId: fixture.accountId, commentId, day: kolkataDay(), mode: "manual" });
  });
}

export function saveTesterNames(a: string, b: string) {
  const state = getDesk();
  state.testerNames = { a: a.trim(), b: b.trim() };
  return writeDesk(state);
}

export function saveDraft(commentId: string, draft: string) {
  return update(commentId, (_state, record) => {
    if (record.outcome !== "open") return;
    if (record.draft === draft) return;
    record.draft = draft;
    record.source = "edited";
    record.model = null;
    record.grokNote = null;
    record.testerA = null;
    record.testerB = null;
    record.approvedText = null;
  });
}

export function saveGrokDraft(commentId: string, draft: string, model: string) {
  return update(commentId, (_state, record) => {
    if (record.outcome !== "open") return;
    record.draft = draft;
    record.source = "grok";
    record.model = model;
    record.grokNote = `${model} wrote this reply. The impact score is on the card. Testers score it, then Pat approves the exact text.`;
    record.testerA = null;
    record.testerB = null;
    record.approvedText = null;
  });
}

export function saveGrokNote(commentId: string, note: string) {
  return update(commentId, (_state, record) => {
    record.grokNote = note;
  });
}

export function markWriting(commentId: string, note: string) {
  return update(commentId, (_state, record) => {
    if (record.source !== "sheet" || record.outcome !== "open") return;
    record.grokNote = note;
  });
}

export function saveScore(commentId: string, seat: "a" | "b", score: TesterScore) {
  return update(commentId, (state, record) => {
    if (record.outcome !== "open") return;
    if (seat === "a") record.testerA = score;
    else record.testerB = score;
    const gate = gateFor(state, commentId, kolkataDay(), resolveFixture);
    if (!gate?.readyForPat || record.approvedText !== record.draft) {
      record.approvedText = null;
    }
  });
}

export function approveComment(commentId: string) {
  return update(commentId, (state, record) => {
    const gate = gateFor(state, commentId, kolkataDay(), resolveFixture);
    if (!gate?.readyForPat) return;
    record.approvedText = record.draft;
  });
}

export function handoffComment(commentId: string) {
  return update(commentId, (_state, record) => {
    if (record.outcome !== "open") return;
    record.outcome = "handed-off";
    record.approvedText = null;
  });
}

export function publishMock(commentId: string) {
  return update(commentId, (state, record) => {
    const fixture = resolveFixture(state, commentId);
    const gate = gateFor(state, commentId, kolkataDay(), resolveFixture);
    if (!fixture || !gate?.canMockPublish) return;
    record.outcome = "mock-published";
    state.sends.push({
      accountId: fixture.accountId,
      commentId,
      day: kolkataDay(),
      mode: "mock",
    });
  });
}

export function recordManualPost(commentId: string) {
  return update(commentId, (state, record) => {
    const fixture = resolveFixture(state, commentId);
    const gate = gateFor(state, commentId, kolkataDay(), resolveFixture);
    if (!fixture || !gate?.canRecordManual) return;
    record.outcome = "posted-by-pat";
    state.sends.push({
      accountId: fixture.accountId,
      commentId,
      day: kolkataDay(),
      mode: "manual",
    });
  });
}
