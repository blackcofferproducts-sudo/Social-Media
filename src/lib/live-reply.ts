import type { Fixture } from "./fixture";
import { askDrafter } from "./grok";
import { decide, rateImpact } from "./policy";

export type LiveReplyResult = {
  reply: string;
  note: string;
  impact: string;
};

const empty = { reply: "", note: "", impact: "" };

export function readLiveInput(post: string, comment: string, placeRaw: string) {
  const cleanPost = post.trim().slice(0, 4000);
  const cleanComment = comment.trim().slice(0, 4000);
  if (!cleanPost || !cleanComment) {
    return {
      ok: false as const,
      result: { ...empty, note: "Add both the post and the comment." },
    };
  }
  const place = placeRaw === "own" ? "own" : "others";
  const fixture: Fixture = {
    id: "live",
    accountId: "threads",
    author: "Live",
    post: cleanPost,
    comment: cleanComment,
    category: "music",
    signal: "ordinary",
    expected: "reply",
    suggestedDraft: "",
    place,
  };
  return { ok: true as const, fixture };
}

export async function askLive(post: string, comment: string, placeRaw: string): Promise<LiveReplyResult> {
  const read = readLiveInput(post, comment, placeRaw);
  if (!read.ok) return read.result;
  const decision = decide({
    accountId: "threads",
    category: "music",
    signal: "ordinary",
    text: read.fixture.comment,
  });
  if (decision.action === "handoff") {
    return { ...empty, note: decision.reason };
  }
  const result = await askDrafter(read.fixture);
  if (!result.ok) return { ...empty, note: result.note };
  const impact = rateImpact({
    accountId: "threads",
    category: "music",
    signal: "ordinary",
    comment: read.fixture.comment,
    draft: result.text,
    place: read.fixture.place ?? "others",
  });
  return {
    reply: result.text,
    note: "",
    impact: `${impact.score}/10 · ${impact.band}`,
  };
}
