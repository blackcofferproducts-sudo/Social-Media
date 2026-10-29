"use server";

import { revalidatePath } from "next/cache";
import { needsModelDraft } from "@/lib/draft-status";
import { draftNext } from "@/lib/auto-draft";
import { askDrafter } from "@/lib/grok";
import { askLive, enteredComment, type LiveReplyResult } from "@/lib/live-reply";
import { searchThreadsMusic } from "@/lib/threads";
import {
  addIncomingTo,
  approveOn,
  commitDesk,
  getDesk,
  handoffOn,
  manualOn,
  normaliseDesk,
  publishOn,
  resolveFixture,
  saveDraftOn,
  saveScoreOn,
  saveTesterNamesOn,
  type DeskState,
} from "@/lib/store";
import { decide, type TesterScore } from "@/lib/policy";
import {
  approveComment,
  handoffComment,
  publishMock,
  recordManualPost,
  saveDraft,
  saveGrokDraft,
  saveGrokNote,
  saveScore,
  saveTesterNames,
} from "@/lib/store";

function refresh(commentId?: string) {
  revalidatePath("/");
  revalidatePath("/limits");
  revalidatePath("/metrics");
  revalidatePath("/tests");
  if (commentId) revalidatePath(`/comments/${commentId}`);
}

function scoreFrom(formData: FormData): TesterScore {
  return {
    hardFail: formData.get("hardFail") === "on",
    communication: Number(formData.get("communication")),
    engagement: Number(formData.get("engagement")),
    rationality: Number(formData.get("rationality")),
  };
}

export async function saveNamesAction(formData: FormData) {
  saveTesterNames(String(formData.get("testerA") ?? ""), String(formData.get("testerB") ?? ""));
  refresh();
}

export async function saveNamesOnDesk(snapshot: DeskState, formData: FormData) {
  const next = saveTesterNamesOn(snapshot, String(formData.get("testerA") ?? ""), String(formData.get("testerB") ?? ""));
  refresh();
  return next;
}

export async function saveCommentAction(snapshot: DeskState, formData: FormData) {
  const read = enteredComment(
    String(formData.get("comment") ?? ""),
    String(formData.get("place") ?? ""),
    `entered-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
  );
  if (!read.ok) return { ok: false as const, note: read.note, place: "others" as const, reply: "", desk: snapshot };
  const decision = decide({
    accountId: read.fixture.accountId,
    category: read.fixture.category,
    signal: read.fixture.signal,
    text: read.fixture.comment,
  });
  const place = read.fixture.place ?? "others";
  if (decision.action === "handoff") {
    return { ok: false as const, note: decision.reason, place, reply: "", desk: snapshot };
  }
  let drafted: { text: string; model: string };
  try {
    const result = await askDrafter(read.fixture);
    if (!result.ok) {
      return { ok: false as const, note: result.note, place, reply: "", desk: snapshot };
    }
    drafted = { text: result.text, model: result.model };
  } catch (error) {
    const message = error instanceof Error ? error.message : "The model could not be reached.";
    return { ok: false as const, note: message.slice(0, 300), place, reply: "", desk: snapshot };
  }
  const desk = commitDesk(addIncomingTo(normaliseDesk(snapshot), read.fixture, drafted));
  refresh(read.fixture.id);
  return {
    ok: true as const,
    note: "Saved. The reply is in the list below.",
    place,
    reply: drafted.text,
    desk,
  };
}

export async function liveReplyAction(_prev: LiveReplyResult, formData: FormData): Promise<LiveReplyResult> {
  return askLive(
    String(formData.get("post") ?? ""),
    String(formData.get("comment") ?? ""),
    String(formData.get("place") ?? ""),
  );
}

export type MusicPull = {
  status: "done" | "fetched" | "worked" | "busy" | "error";
  note: string;
};

export async function pullMusicAction(snapshot: DeskState): Promise<MusicPull & { desk: DeskState }> {
  let desk = normaliseDesk(snapshot);
  const waiting = desk.incoming.find((item) => needsModelDraft(item, desk.comments[item.id]));
  if (waiting) {
    try {
      const result = await askDrafter(waiting);
      const record = { ...desk.comments[waiting.id] };
      if (result.ok) {
        record.draft = result.text;
        record.source = "grok";
        record.model = result.model;
        record.grokNote = `${result.model} wrote this reply. The impact score is on the card. Testers score it, then Pat approves the exact text.`;
        record.testerA = null;
        record.testerB = null;
        record.approvedText = null;
      } else {
        record.grokNote = result.note;
      }
      desk = { ...desk, comments: { ...desk.comments, [waiting.id]: record } };
    } catch (error) {
      const message = error instanceof Error ? error.message : "The model could not be reached.";
      const record = { ...desk.comments[waiting.id], grokNote: message.slice(0, 300) };
      desk = { ...desk, comments: { ...desk.comments, [waiting.id]: record } };
    }
    desk = commitDesk(desk);
    refresh(waiting.id);
    return { status: "worked", note: "A reply is written. Checking for the next post.", desk };
  }
  const result = await searchThreadsMusic();
  if (!result.ok) return { status: "error", note: result.note, desk };
  const seen = new Set(desk.incoming.map((item) => item.id));
  const fresh = result.posts.filter((post) => !seen.has(post.id));
  if (fresh.length === 0) {
    return { status: "done", note: result.note || "No new music posts from Threads.", desk };
  }
  for (const post of fresh) desk = addIncomingTo(desk, post);
  desk = commitDesk(desk);
  refresh();
  return {
    status: "fetched",
    note: fresh.length === 1 ? "A music post came in from Threads." : "Music posts came in from Threads.",
    desk,
  };
}

export async function saveDraftOnDesk(snapshot: DeskState, formData: FormData) {
  const next = saveDraftOn(snapshot, String(formData.get("commentId") ?? ""), String(formData.get("draft") ?? ""));
  refresh(String(formData.get("commentId") ?? ""));
  return next;
}

export async function saveScoreOnDesk(snapshot: DeskState, formData: FormData) {
  const commentId = String(formData.get("commentId") ?? "");
  const seat = formData.get("seat") === "b" ? "b" : "a";
  const next = saveScoreOn(snapshot, commentId, seat, scoreFrom(formData));
  refresh(commentId);
  return next;
}

export async function approveOnDesk(snapshot: DeskState, formData: FormData) {
  const commentId = String(formData.get("commentId") ?? "");
  const next = approveOn(snapshot, commentId);
  refresh(commentId);
  return next;
}

export async function handoffOnDesk(snapshot: DeskState, formData: FormData) {
  const commentId = String(formData.get("commentId") ?? "");
  const next = handoffOn(snapshot, commentId);
  refresh(commentId);
  return next;
}

export async function publishOnDesk(snapshot: DeskState, formData: FormData) {
  const commentId = String(formData.get("commentId") ?? "");
  const next = publishOn(snapshot, commentId);
  refresh(commentId);
  return next;
}

export async function manualOnDesk(snapshot: DeskState, formData: FormData) {
  const commentId = String(formData.get("commentId") ?? "");
  const next = manualOn(snapshot, commentId);
  refresh(commentId);
  return next;
}

export async function draftNextAction(focusId?: string, scope?: "others" | "replies") {
  const status = await draftNext(focusId, scope);
  if (status === "worked") refresh(focusId);
  return status;
}

export async function draftWithGrokAction(formData: FormData) {
  const commentId = String(formData.get("commentId") ?? "");
  const fixture = resolveFixture(getDesk(), commentId);
  if (!fixture) return;
  try {
    const result = await askDrafter(fixture);
    if (result.ok) saveGrokDraft(commentId, result.text, result.model);
    else saveGrokNote(commentId, result.note);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Grok could not be reached.";
    saveGrokNote(commentId, message.slice(0, 300));
  }
  refresh(commentId);
}

export async function saveDraftAction(formData: FormData) {
  const commentId = String(formData.get("commentId") ?? "");
  saveDraft(commentId, String(formData.get("draft") ?? ""));
  refresh(commentId);
}

export async function saveScoreAction(formData: FormData) {
  const commentId = String(formData.get("commentId") ?? "");
  const seat = formData.get("seat") === "b" ? "b" : "a";
  saveScore(commentId, seat, scoreFrom(formData));
  refresh(commentId);
}

export async function approveAction(formData: FormData) {
  const commentId = String(formData.get("commentId") ?? "");
  approveComment(commentId);
  refresh(commentId);
}

export async function handoffAction(formData: FormData) {
  const commentId = String(formData.get("commentId") ?? "");
  handoffComment(commentId);
  refresh(commentId);
}

export async function publishAction(formData: FormData) {
  const commentId = String(formData.get("commentId") ?? "");
  publishMock(commentId);
  refresh(commentId);
}

export async function manualAction(formData: FormData) {
  const commentId = String(formData.get("commentId") ?? "");
  recordManualPost(commentId);
  refresh(commentId);
}
