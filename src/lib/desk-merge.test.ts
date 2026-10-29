import assert from "node:assert/strict";
import test from "node:test";
import { absorbDesk, addIncomingTo, mergeDesk, normaliseDesk, type DeskState } from "./desk";
import type { Fixture } from "./fixture";

function desk(partial: Partial<DeskState> & Pick<DeskState, "revision">): DeskState {
  return normaliseDesk({
    version: 4,
    testerNames: { a: "", b: "" },
    comments: {},
    sends: [],
    incoming: [],
    ...partial,
  });
}

const entered: Fixture = {
  id: "entered-keep",
  accountId: "threads",
  author: "Entered",
  post: "Name one quiet song.",
  comment: "Name one quiet song.",
  category: "music",
  signal: "ordinary",
  expected: "reply",
  suggestedDraft: "",
  place: "others",
};

test("a saved comment stays when the server copy is empty", () => {
  const server = desk({ revision: 0 });
  const browser = addIncomingTo(desk({ revision: 2 }), entered, { text: "Futile Devices.", model: "grok-4.7" });
  const merged = mergeDesk(server, browser);
  assert.equal(merged.incoming.some((item) => item.id === "entered-keep"), true);
  assert.equal(merged.comments["entered-keep"]?.draft, "Futile Devices.");
  assert.equal(merged.comments["entered-keep"]?.source, "grok");
});

test("a comment only on the server is kept beside the browser list", () => {
  const server = addIncomingTo(desk({ revision: 1 }), { ...entered, id: "threads-1", comment: "From Threads." });
  const browser = addIncomingTo(desk({ revision: 4 }), entered, { text: "Kept.", model: "grok-4.7" });
  const merged = mergeDesk(server, browser);
  assert.deepEqual(
    merged.incoming.map((item) => item.id).sort(),
    ["entered-keep", "threads-1"],
  );
  assert.equal(merged.comments["entered-keep"]?.draft, "Kept.");
});

test("the newer reply wins when both copies have the same comment", () => {
  const server = addIncomingTo(desk({ revision: 3 }), entered, { text: "Server reply.", model: "grok-4.7" });
  const browser = addIncomingTo(desk({ revision: 5 }), entered, { text: "Browser reply.", model: "grok-4.7" });
  const merged = mergeDesk(server, browser);
  assert.equal(merged.comments["entered-keep"]?.draft, "Browser reply.");
});

test("an older snapshot does not drop a comment saved while it was in flight", () => {
  const saved = addIncomingTo(desk({ revision: 6 }), entered, { text: "Stay.", model: "grok-4.7" });
  const stale = desk({ revision: 4 });
  const merged = absorbDesk(saved, stale);
  assert.equal(merged.comments["entered-keep"]?.draft, "Stay.");
  assert.equal(merged.incoming.some((item) => item.id === "entered-keep"), true);
});

test("a wrong store version is ignored", () => {
  const server = addIncomingTo(desk({ revision: 1 }), entered, { text: "Stay.", model: "grok-4.7" });
  const merged = mergeDesk(server, { ...desk({ revision: 9 }), version: 1 });
  assert.equal(merged.comments["entered-keep"]?.draft, "Stay.");
});

test("adding a comment does not treat the sample sheet as already saved", () => {
  const seeded = desk({
    revision: 0,
    comments: {
      "ig-music-short": {
        draft: "Sheet line.",
        source: "sheet",
        model: null,
        grokNote: null,
        testerA: null,
        testerB: null,
        approvedText: null,
        outcome: "open",
      },
    },
  });
  const next = addIncomingTo(seeded, entered, { text: "Named.", model: "grok-4.7" });
  assert.equal(next.incoming[0]?.id, "entered-keep");
  assert.equal(next.comments["entered-keep"]?.draft, "Named.");
  assert.equal(next.comments["ig-music-short"]?.source, "sheet");
  assert.equal(next.comments["ig-music-short"]?.draft, "Sheet line.");
});
