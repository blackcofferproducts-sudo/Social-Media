import { accounts, type AccountId } from "./accounts";
import { placeOf, type Fixture } from "./fixture";
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

export const STORE_VERSION = 4;

export type DeskState = {
  version: number;
  revision: number;
  testerNames: { a: string; b: string };
  comments: Record<string, CommentRecord>;
  sends: SendRecord[];
  incoming: Fixture[];
};

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

function emptyDesk(): DeskState {
  return {
    version: STORE_VERSION,
    revision: 0,
    testerNames: { a: "", b: "" },
    comments: {},
    sends: [],
    incoming: [],
  };
}

export function applySeed(state: DeskState, rows: { id: string; suggestedDraft: string }[]): DeskState {
  let comments = state.comments;
  let changed = false;
  for (const row of rows) {
    if (comments[row.id]) continue;
    if (!changed) {
      comments = { ...comments };
      changed = true;
    }
    comments[row.id] = blankComment(row.suggestedDraft);
  }
  return changed ? { ...state, comments } : state;
}

export function kolkataDay(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function normaliseDesk(saved?: Partial<DeskState> | null): DeskState {
  if (!saved || saved.version !== STORE_VERSION) return emptyDesk();
  return {
    version: STORE_VERSION,
    revision: saved.revision ?? 0,
    testerNames: saved.testerNames ?? { a: "", b: "" },
    sends: Array.isArray(saved.sends) ? saved.sends : [],
    incoming: Array.isArray(saved.incoming) ? saved.incoming : [],
    comments: Object.fromEntries(
      Object.entries(saved.comments ?? {}).map(([id, record]) => [id, normaliseRecord(record)]),
    ),
  };
}

export function mergeDesk(server: DeskState, browser: DeskState | null): DeskState {
  if (!browser || browser.version !== STORE_VERSION) return server;
  const incoming = [...browser.incoming];
  for (const item of server.incoming) {
    if (!incoming.some((row) => row.id === item.id)) incoming.push(item);
  }
  const preferBrowser = browser.revision >= server.revision;
  return normaliseDesk({
    version: STORE_VERSION,
    revision: Math.max(server.revision, browser.revision),
    testerNames:
      preferBrowser && (browser.testerNames.a.trim() || browser.testerNames.b.trim())
        ? browser.testerNames
        : server.testerNames,
    sends: preferBrowser ? browser.sends : server.sends,
    incoming,
    comments: preferBrowser
      ? { ...server.comments, ...browser.comments }
      : { ...browser.comments, ...server.comments },
  });
}

export function absorbDesk(current: DeskState, next: DeskState): DeskState {
  if (next.revision >= current.revision) return mergeDesk(current, next);
  return mergeDesk(next, current);
}

export function resolveFixture(state: DeskState, id: string) {
  return state.incoming.find((item) => item.id === id);
}

export function addIncomingTo(state: DeskState, fixture: Fixture, reply?: { text: string; model: string }): DeskState {
  if (state.incoming.some((item) => item.id === fixture.id)) return state;
  const record = blankComment(reply?.text ?? "");
  if (reply?.text) {
    record.source = "grok";
    record.model = reply.model;
    record.grokNote = `${reply.model} wrote this reply. The impact score is on the card. Testers score it, then Pat approves the exact text.`;
  }
  const existing = state.comments[fixture.id];
  return {
    ...state,
    incoming: [fixture, ...state.incoming],
    comments: {
      ...state.comments,
      [fixture.id]: existing && existing.source !== "sheet" ? existing : record,
    },
  };
}

export function sentToday(state: DeskState, accountId: AccountId, day = kolkataDay()) {
  return state.sends.filter((send) => send.accountId === accountId && send.day === day).length;
}

export function gateFor(
  state: DeskState,
  commentId: string,
  day = kolkataDay(),
  lookup: (state: DeskState, id: string) => Fixture | undefined = resolveFixture,
) {
  const fixture = lookup(state, commentId);
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

export function capSummary(state: DeskState, day = kolkataDay()) {
  return (Object.keys(accounts) as AccountId[]).map((accountId) => ({
    account: accounts[accountId],
    sent: sentToday(state, accountId, day),
  }));
}
