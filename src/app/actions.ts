"use server";

import { revalidatePath } from "next/cache";
import { draftNext } from "@/lib/auto-draft";
import { askDrafter } from "@/lib/grok";
import { askLive, type LiveReplyResult } from "@/lib/live-reply";
import { fixtureById } from "@/lib/fixtures";
import type { TesterScore } from "@/lib/policy";
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

export async function liveReplyAction(_prev: LiveReplyResult, formData: FormData): Promise<LiveReplyResult> {
  return askLive(
    String(formData.get("post") ?? ""),
    String(formData.get("comment") ?? ""),
    String(formData.get("place") ?? ""),
  );
}

export async function draftNextAction(focusId?: string, scope?: "others" | "replies") {
  const status = await draftNext(focusId, scope);
  if (status === "worked") refresh(focusId);
  return status;
}

export async function draftWithGrokAction(formData: FormData) {
  const commentId = String(formData.get("commentId") ?? "");
  const fixture = fixtureById(commentId);
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
