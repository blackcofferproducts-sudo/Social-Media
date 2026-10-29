import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { accounts } from "./accounts";
import { fixtures, placeOf } from "./fixtures";
import { roboticPhrase } from "./comment-model";
import { draftReply, loadSheet, nearestIds } from "./train";
import {
  analyse,
  commentBrief,
  decide,
  evaluateGate,
  hardFails,
  namesAreSet,
  PASS_MARK,
  rateImpact,
  scoreTester,
} from "./policy";

const names = { a: "Amina Shah", b: "Leo Park" };
const passing = { hardFail: false, communication: 2, engagement: 2, rationality: 2 };

describe("training sheet", () => {
  const sheet = loadSheet();

  it("reads 56 labeled rows", () => {
    assert.equal(sheet.length, 56);
    assert.equal(sheet.filter((row) => row.type === "convo").length, 20);
  });

  it("drafts every row from the intent, with no link and no review voice", () => {
    const trained = fixtures.filter((fixture) => fixture.training);
    assert.equal(trained.length, 56);
    for (const fixture of trained) {
      assert.ok(fixture.suggestedDraft.length > 20, fixture.id);
      assert.equal(roboticPhrase(fixture.suggestedDraft), null, fixture.suggestedDraft);
      assert.equal(/https?:\/\/|easy to follow|for that slot|clear offer/i.test(fixture.suggestedDraft), false);
      assert.deepEqual(
        hardFails(fixture.suggestedDraft, fixture.accountId, "own", fixture.comment),
        [],
      );
    }
  });

  it("answers the join question without a link and tells the truth about a draft", () => {
    const join = draftReply("how do i actually join?? is there an app or is it just this page", "Answer the question plainly: how to join and where the App fits, no links", "Joining or programme fit");
    assert.match(join, /app/i);
    assert.doesNotMatch(join, /https?:|i won't/i);
    const bot = draftReply("is this another AI thing", "Calm and honest; if asked whether replies are automated, answer truthfully or escalate to Pat", "Mild sceptic");
    assert.match(bot, /Pat reads/);
    const leeds = draftReply("are Certified Studios only in big cities? im in Leeds", "Answer honestly about coverage without inventing locations or numbers", "Studio or recording");
    assert.match(leeds, /can't tell you about Leeds/);
    assert.doesNotMatch(leeds, /Leeds is covered|Leeds is not|won't say yes or no/);
  });

  it("gives a fuller reply when the question needs one, and leaves a simple thanks short", () => {
    const fuller = ["train-v18", "train-v03", "train-c30", "train-v02", "train-c32", "train-c04"];
    for (const id of fuller) {
      const fixture = fixtures.find((item) => item.id === id);
      assert.ok(fixture, id);
      assert.ok(fixture.suggestedDraft.length > 90, fixture.suggestedDraft);
      const sentences = fixture.suggestedDraft.split(/[.?!]/).filter((part) => part.trim().length > 0);
      assert.ok(sentences.length >= 2, `${id} ${fixture.suggestedDraft}`);
    }
    const thanks = fixtures.find((item) => item.id === "train-c01");
    assert.ok(thanks);
    assert.ok(thanks.suggestedDraft.length < 80);
  });

  it("finds a neighbour in the same kind of comment", () => {
    const near = nearestIds(sheet, "C04");
    assert.ok(near.length === 2);
    assert.ok(near.every((id) => id !== "C04"));
  });
});

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

  it("lets a plain answer stand, keeps the waitlist link for a join ask, and keeps targets out", () => {
    const music = fixtures.find((item) => item.id === "threads-music");
    assert.ok(music);
    const noQuestion = hardFails("Yes. People who put their own music out.", music.accountId, "own", music.comment);
    assert.deepEqual(noQuestion, []);
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

  it("keeps a comment on a song about a loss on the song", () => {
    const folk = fixtures.find((item) => item.id === "out-threads-folk-friday");
    assert.ok(folk);
    assert.deepEqual(hardFails(folk.suggestedDraft, folk.accountId, "others", folk.comment), []);
    assert.equal(folk.suggestedDraft, "Branding Iron. I'll put that on.");
    assert.doesNotMatch(
      folk.suggestedDraft,
      /daughter|accident|springsteen|\?|easy to follow|for that slot|that's a lot|playing it anyway/i,
    );
    const graded = hardFails(
      "One tune each Friday is easy to follow. Branding Iron is a heavy song for that slot.",
      folk.accountId,
      "others",
      folk.comment,
    );
    assert.ok(graded.some((fail) => fail.includes("easy to follow")));
    const judged = hardFails(
      "Branding Iron. That's a lot for a Friday, I'm playing it anyway.",
      folk.accountId,
      "others",
      folk.comment,
    );
    assert.ok(judged.some((fail) => fail.includes("that's a lot for")));
    const brief = commentBrief({
      accountId: folk.accountId,
      text: folk.comment,
      place: "others",
    });
    assert.match(brief.goal, /song they named/);
    assert.match(brief.engagement, /already answered/);
    assert.match(brief.rationality, /Do not retell it/);
  });

  it("scores likely impact out of 10, and marks a repeated choice lower", () => {
    const folk = fixtures.find((item) => item.id === "out-threads-folk-friday");
    assert.ok(folk);
    const stated = rateImpact({
      accountId: folk.accountId,
      category: folk.category,
      signal: folk.signal,
      comment: folk.comment,
      draft: folk.suggestedDraft,
      place: "others",
    });
    const repeated = rateImpact({
      accountId: folk.accountId,
      category: folk.category,
      signal: folk.signal,
      comment: folk.comment,
      draft:
        "Are you asking people to start with this recording, or with another track from The Fabled City?",
      place: "others",
    });
    assert.ok(stated.score >= 7 && stated.score <= 8, `statement scored ${stated.score}`);
    assert.ok(repeated.score < stated.score, `repeated ${repeated.score} vs statement ${stated.score}`);
    assert.ok(repeated.score <= 10 && stated.score <= 10);
    assert.match(repeated.notes.join(" "), /already made/);

    const spam = fixtures.find((item) => item.id === "out-threads-spam");
    assert.ok(spam);
    const none = rateImpact({
      accountId: spam.accountId,
      category: spam.category,
      signal: spam.signal,
      comment: spam.comment,
      draft: "No thanks.",
      place: "others",
    });
    assert.equal(none.score, 0);
    assert.equal(none.band, "None");

    const music = "Could you recommend some good music, a playlist, or an underrated artist?";
    const direct = rateImpact({
      accountId: "threads",
      category: "music",
      signal: "ordinary",
      comment: music,
      draft: "Try Berwyn if you want someone a bit under the radar. Start with Dear Immigration.",
      place: "others",
    });
    const scene = rateImpact({
      accountId: "threads",
      category: "music",
      signal: "ordinary",
      comment: music,
      draft:
        "That playlist is the thing I can actually see, same songs dropping in before you have decided. It makes me want to put one new artist in front of it. Try English Teacher and start with The World's Biggest Paving Slab, talky and bright. The next couple of tracks sit beside it. You will know in a minute if you want the rest.",
      place: "others",
    });
    assert.ok(direct.score >= 7, `direct recommendation scored ${direct.score}`);
    assert.equal(direct.band, "Sound");
    assert.ok(scene.score < direct.score, `scene ${scene.score} vs direct ${direct.score}`);
    assert.match(scene.notes.join(" "), /scene/);
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
