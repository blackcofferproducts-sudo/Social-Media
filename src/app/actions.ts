"use server";

import { revalidatePath } from "next/cache";
import {
  approveComment,
  handoffComment,
  publishMock,
  recordManualPost,
  saveDraft,
  saveScore,
  saveTesterNames,
} from "@/lib/store";
import type { TesterScore } from "@/lib/policy";

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
