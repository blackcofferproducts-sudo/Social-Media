import fs from "node:fs";
import path from "node:path";
import { accounts, type AccountId } from "./accounts";
import { fixtures } from "./fixtures";
import { evaluateGate, type TesterScore } from "./policy";

export type Outcome = "open" | "handed-off" | "mock-published" | "posted-by-pat";

export type CommentRecord = {
  draft: string;
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

export type DeskState = {
  revision: number;
  testerNames: { a: string; b: string };
  comments: Record<string, CommentRecord>;
  sends: SendRecord[];
};

const filePath = path.join(process.cwd(), "data", "desk-state.json");

function blankComment(draft: string): CommentRecord {
  return {
    draft,
    testerA: null,
    testerB: null,
    approvedText: null,
    outcome: "open",
  };
}

function seed(): DeskState {
  return {
    revision: 0,
    testerNames: { a: "", b: "" },
    comments: Object.fromEntries(
      fixtures.map((fixture) => [fixture.id, blankComment(fixture.suggestedDraft)]),
    ),
    sends: [],
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
  if (!fs.existsSync(filePath)) return base;
  try {
    const saved = JSON.parse(fs.readFileSync(filePath, "utf8")) as DeskState;
    return {
      revision: saved.revision ?? 0,
      testerNames: saved.testerNames ?? { a: "", b: "" },
      sends: Array.isArray(saved.sends) ? saved.sends : [],
      comments: {
        ...base.comments,
        ...saved.comments,
      },
    };
  } catch {
    return base;
  }
}

function writeDesk(state: DeskState) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const next = { ...state, revision: state.revision + 1 };
  fs.writeFileSync(filePath, JSON.stringify(next, null, 2));
  return next;
}

export function sentToday(state: DeskState, accountId: AccountId, day = kolkataDay()) {
  return state.sends.filter((send) => send.accountId === accountId && send.day === day).length;
}

export function gateFor(state: DeskState, commentId: string, day = kolkataDay()) {
  const fixture = fixtures.find((item) => item.id === commentId);
  const record = state.comments[commentId];
  if (!fixture || !record) return null;
  return evaluateGate({
    accountId: fixture.accountId,
    category: fixture.category,
    signal: fixture.signal,
    comment: fixture.comment,
    draft: record.draft,
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
    record.testerA = null;
    record.testerB = null;
    record.approvedText = null;
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
    const fixture = fixtures.find((item) => item.id === commentId);
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
    const fixture = fixtures.find((item) => item.id === commentId);
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
