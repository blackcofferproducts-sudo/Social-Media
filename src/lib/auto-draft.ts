import { needsModelDraft, WRITING_NOTE } from "./draft-status";
import { fixtures } from "./fixtures";
import { askDrafter } from "./grok";
import { placeOf } from "./fixture";
import { getDesk, markWriting, resolveFixture, saveGrokDraft, saveGrokNote } from "./store";

const inflight = new Set<string>();

function inScope(id: string, scope?: "others" | "replies") {
  const fixture = resolveFixture(getDesk(), id);
  if (!fixture) return false;
  if (!scope) return true;
  const place = placeOf(fixture);
  if (scope === "others") return place === "others";
  return place === "own" && fixture.accountId === "threads";
}

function nextId(focusId?: string, scope?: "others" | "replies") {
  const desk = getDesk();
  if (focusId) {
    const focus = resolveFixture(desk, focusId);
    if (focus && needsModelDraft(focus, desk.comments[focus.id])) return focus.id;
    return undefined;
  }
  return fixtures.find(
    (fixture) => inScope(fixture.id, scope) && needsModelDraft(fixture, desk.comments[fixture.id]),
  )?.id;
}

export async function draftNext(
  focusId?: string,
  scope?: "others" | "replies",
): Promise<"done" | "worked" | "busy"> {
  if (inflight.size > 0) return "busy";
  const id = nextId(focusId, scope);
  if (!id) return "done";
  const fixture = resolveFixture(getDesk(), id);
  if (!fixture) return "done";
  inflight.add(id);
  markWriting(id, WRITING_NOTE);
  try {
    const result = await askDrafter(fixture);
    if (result.ok) saveGrokDraft(id, result.text, result.model);
    else saveGrokNote(id, result.note);
    return "worked";
  } catch (error) {
    const message = error instanceof Error ? error.message : "The model could not be reached.";
    saveGrokNote(id, message.slice(0, 300));
    return "worked";
  } finally {
    inflight.delete(id);
  }
}
