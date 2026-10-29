import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { accounts, type AccountId } from "./accounts";
import { fixtures, placeOf } from "./fixtures";
import type { Fixture } from "./fixture";
import { evaluateGate, type TesterScore } from "./policy";

export type Outcome = "open" | "handed-off" | "mock-published" | "posted-by-pat";

export type DraftSource = "sheet" | "grok" | "edited";

export type CommentRecord = {
  draft: string;
  source: DraftSource;
  model: string | null;
  grokNote: string | null;
  testerA: TesterScore | null;
  testerB: TesterScore | null;
  approvedText: string | null;
  outcome: Outcome;
};

export type SendRecord = {
  accountId: AccountId;
  commentId: string;
  day: string;
  mode: "mock" | "manual";
};

const STORE_VERSION = 4;

export type DeskState = {
  version: number;
  revision: number;
  testerNames: { a: string; b: string };
  comments: Record<string, CommentRecord>;
  sends: SendRecord[];
  incoming: Fixture[];
};

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

function blankComment(draft: string): CommentRecord {
  return {
    draft,
    source: "sheet",
    model: null,
    grokNote: null,
    testerA: null,
    testerB: null,
    approvedText: null,
    outcome: "open",
  };
}

function normaliseRecord(record: Partial<CommentRecord> & { draft?: string }): CommentRecord {
  const source = record.source === "grok" || record.source === "edited" ? record.source : "sheet";
  return {
    draft: record.draft ?? "",
    source,
    model: record.model ?? null,
    grokNote: record.grokNote ?? null,
    testerA: record.testerA ?? null,
    testerB: record.testerB ?? null,
    approvedText: record.approvedText ?? null,
    outcome: record.outcome ?? "open",
  };
}

function seed(): DeskState {
  return {
    version: STORE_VERSION,
    revision: 0,
    testerNames: { a: "", b: "" },
    comments: Object.fromEntries(
      fixtures.map((fixture) => [fixture.id, blankComment(fixture.suggestedDraft)]),
    ),
    sends: [],
    incoming: [],
  };
}

export function kolkataDay(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function getDesk(): DeskState {
  const base = seed();
  const filePath = deskFile();
  if (!fs.existsSync(filePath)) return base;
  try {
    const saved = JSON.parse(fs.readFileSync(filePath, "utf8")) as DeskState;
    if (saved.version !== STORE_VERSION) return base;
    return {
      version: STORE_VERSION,
      revision: saved.revision ?? 0,
      testerNames: saved.testerNames ?? { a: "", b: "" },
      sends: Array.isArray(saved.sends) ? saved.sends : [],
      incoming: Array.isArray(saved.incoming) ? saved.incoming : [],
      comments: Object.fromEntries(
        Object.entries({ ...base.comments, ...saved.comments }).map(([id, record]) => [
          id,
          normaliseRecord(record),
        ]),
      ),
    };
  } catch {
    return base;
  }
}

function writeDesk(state: DeskState) {
  const filePath = deskFile();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const next = { ...state, version: STORE_VERSION, revision: state.revision + 1 };
  fs.writeFileSync(filePath, JSON.stringify(next, null, 2));
  return next;
}

export function resolveFixture(state: DeskState, id: string) {
  return state.incoming.find((item) => item.id === id) ?? fixtures.find((item) => item.id === id);
}

export function addIncoming(fixture: Fixture, reply?: { text: string; model: string }) {
  const state = getDesk();
  if (state.incoming.some((item) => item.id === fixture.id) || state.comments[fixture.id]) {
    return state;
  }
  state.incoming.unshift(fixture);
  const record = blankComment(reply?.text ?? "");
  if (reply?.text) {
    record.source = "grok";
    record.model = reply.model;
    record.grokNote = `${reply.model} wrote this reply. The impact score is on the card. Testers score it, then Pat approves the exact text.`;
  }
  state.comments[fixture.id] = record;
  return writeDesk(state);
}

export function sentToday(state: DeskState, accountId: AccountId, day = kolkataDay()) {
  return state.sends.filter((send) => send.accountId === accountId && send.day === day).length;
}

export function gateFor(state: DeskState, commentId: string, day = kolkataDay()) {
  const fixture = resolveFixture(state, commentId);
  const record = state.comments[commentId];
  if (!fixture || !record) return null;
  return evaluateGate({
    accountId: fixture.accountId,
    category: fixture.category,
    signal: fixture.signal,
    comment: fixture.comment,
    draft: record.draft,
    place: placeOf(fixture),
    testerNames: state.testerNames,
    testerA: record.testerA,
    testerB: record.testerB,
    approvedText: record.approvedText,
    sentToday: sentToday(state, fixture.accountId, day),
    outcome: record.outcome,
  });
}

function update(commentId: string, change: (state: DeskState, record: CommentRecord) => void) {
  const state = getDesk();
  const record = state.comments[commentId];
  if (!record) return state;
  change(state, record);
  return writeDesk(state);
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
    const gate = gateFor(state, commentId);
    if (!gate?.readyForPat || record.approvedText !== record.draft) {
      record.approvedText = null;
    }
  });
}

export function approveComment(commentId: string) {
  return update(commentId, (state, record) => {
    const gate = gateFor(state, commentId);
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
    const gate = gateFor(state, commentId);
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
    const gate = gateFor(state, commentId);
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

export function capSummary(state: DeskState, day = kolkataDay()) {
  return (Object.keys(accounts) as AccountId[]).map((accountId) => ({
    account: accounts[accountId],
    sent: sentToday(state, accountId, day),
  }));
}
