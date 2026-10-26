import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { accounts } from "./accounts";
import { fixtures, placeOf } from "./fixtures";
import {
  analyse,
  decide,
  evaluateGate,
  hardFails,
  namesAreSet,
  PASS_MARK,
  scoreTester,
} from "./policy";

const names = { a: "Amina Shah", b: "Leo Park" };
const passing = { hardFail: false, communication: 2, engagement: 2, rationality: 2 };

describe("disposition", () => {
  for (const fixture of fixtures) {
    it(`${fixture.id} is a ${fixture.expected}`, () => {
      const decision = decide({
        accountId: fixture.accountId,
        category: fixture.category,
        signal: fixture.signal,
        text: fixture.comment,
      });
      assert.equal(decision.action, fixture.expected);
    });
  }
});

describe("gold replies", () => {
  const replies = fixtures.filter((fixture) => fixture.expected === "reply");

  it("passes the automated checks", () => {
    for (const fixture of replies) {
      assert.deepEqual(
        hardFails(fixture.suggestedDraft, fixture.accountId, placeOf(fixture), fixture.comment),
        [],
      );
    }
  });

  it("varies the length across the set", () => {
    const lengths = replies.map((fixture) => fixture.suggestedDraft.length);
    const spread = Math.max(...lengths) - Math.min(...lengths);
    assert.ok(spread >= 50, `length spread was ${spread}`);
  });
});

describe("pass mark", () => {
  it("passes at 5 out of 6 with no hard fail", () => {
    assert.equal(
      scoreTester({ hardFail: false, communication: 2, engagement: 1, rationality: 2 }).passed,
      true,
    );
    assert.equal(
      scoreTester({ hardFail: false, communication: 2, engagement: 1, rationality: 2 }).points,
      PASS_MARK,
    );
  });

  it("fails at 4, and fails a hard fail even at 6", () => {
    assert.equal(
      scoreTester({ hardFail: false, communication: 2, engagement: 1, rationality: 1 }).passed,
      false,
    );
    assert.equal(
      scoreTester({ hardFail: true, communication: 2, engagement: 2, rationality: 2 }).passed,
      false,
    );
  });

  it("requires a question, keeps the waitlist link for a join ask, and keeps targets out", () => {
    const music = fixtures.find((item) => item.id === "threads-music");
    assert.ok(music);
    const noQuestion = hardFails("Yes. People who put their own music out.", music.accountId, "own", music.comment);
    assert.ok(noQuestion.some((fail) => fail.startsWith("Engagement:")));
    const withLink = hardFails(
      "Yes. Add your name here: https://waitlist.cityjam.example/?utm_source=threads",
      music.accountId,
      "own",
      music.comment,
    );
    assert.ok(withLink.some((fail) => fail.startsWith("Goal:")));
    const join = fixtures.find((item) => item.id === "threads-waitlist");
    assert.ok(join);
    const missingLink = hardFails("Not yet. It is on a waitlist.", join.accountId, "own", join.comment);
    assert.ok(missingLink.some((fail) => fail.includes("one waitlist link")));
    const leaked = hardFails("We are aiming for 10,000 followers.", "threads", "others", "Nice song?");
    assert.ok(leaked.some((fail) => fail.startsWith("Rationality:")));
  });

  it("rejects a link dropped onto someone else's post", () => {
    const fails = hardFails(
      "Add your name here: https://waitlist.cityjam.example/?utm_source=threads",
      "threads",
      "others",
    );
    assert.ok(fails.some((fail) => fail.includes("does not carry a link")));
  });

  it("rejects stock phrasing, American spelling, the blocklist, and the wrong voice", () => {
    const draft = "I'd be happy to help. The color is lovely, and HINABI can delve into AIFF.";
    const fails = hardFails(draft, "cityjam-instagram");
    assert.ok(fails.some((fail) => fail.includes("Stock AI")));
    assert.ok(fails.some((fail) => fail.includes("British English")));
    assert.ok(fails.some((fail) => fail.includes("Blocklist")));
    assert.ok(fails.some((fail) => fail.includes("AIFF")));
  });
});

describe("Pat's gate", () => {
  const fixture = fixtures.find((item) => item.id === "ig-music-short");
  assert.ok(fixture);

  const base = {
    accountId: fixture.accountId,
    category: fixture.category,
    signal: fixture.signal,
    comment: fixture.comment,
    draft: fixture.suggestedDraft,
    testerNames: names,
    testerA: passing,
    testerB: passing,
    approvedText: null,
    sentToday: 0,
    outcome: "open" as const,
  };

  it("stays shut while tester names are blank", () => {
    const gate = evaluateGate({ ...base, testerNames: { a: "", b: "" } });
    assert.equal(namesAreSet({ a: "", b: "" }), false);
    assert.equal(gate.readyForPat, false);
    assert.equal(gate.canMockPublish, false);
  });

  it("needs both testers, then Pat's exact text", () => {
    const oneTester = evaluateGate({ ...base, testerB: null });
    assert.equal(oneTester.readyForPat, false);
    const ready = evaluateGate(base);
    assert.equal(ready.readyForPat, true);
    assert.equal(ready.approved, false);
    const approved = evaluateGate({ ...base, approvedText: fixture.suggestedDraft });
    assert.equal(approved.canMockPublish, true);
    const edited = evaluateGate({
      ...base,
      draft: `${fixture.suggestedDraft} Thanks.`,
      approvedText: fixture.suggestedDraft,
    });
    assert.equal(edited.approved, false);
    assert.equal(edited.canMockPublish, false);
  });

  it("stops at the daily cap, mock-publishes an approved Threads reply, and keeps draft-only accounts off the mock", () => {
    const capped = evaluateGate({
      ...base,
      approvedText: fixture.suggestedDraft,
      sentToday: accounts["cityjam-instagram"].dailyCap,
    });
    assert.equal(capped.canMockPublish, false);

    const threads = fixtures.find((item) => item.id === "threads-music");
    assert.ok(threads);
    const threadsGate = evaluateGate({
      ...base,
      accountId: threads.accountId,
      category: threads.category,
      signal: threads.signal,
      comment: threads.comment,
      draft: threads.suggestedDraft,
      approvedText: threads.suggestedDraft,
    });
    assert.equal(threadsGate.decision.action, "reply");
    assert.equal(threadsGate.canMockPublish, true);
    assert.equal(threadsGate.canRecordManual, false);
    const reading = analyse({
      accountId: threads.accountId,
      category: threads.category,
      signal: threads.signal,
      text: threads.comment,
    });
    assert.equal(reading.sentiment, "Positive");
    assert.equal(reading.strategy, "Answer the music question. Keep the waitlist link out until they ask how to join.");

    const pat = fixtures.find((item) => item.id === "x-agents-short");
    assert.ok(pat);
    const manual = evaluateGate({
      ...base,
      accountId: pat.accountId,
      category: pat.category,
      signal: pat.signal,
      comment: pat.comment,
      draft: pat.suggestedDraft,
      approvedText: pat.suggestedDraft,
    });
    assert.equal(manual.canMockPublish, false);
    assert.equal(manual.canRecordManual, true);
  });
});
