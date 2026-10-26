import { accounts, isCityJam, isPat, type AccountId, type SendMode } from "./accounts";

export type Place = "own" | "others";

export type Category =
  | "music"
  | "dating-love"
  | "corporate-music"
  | "agents"
  | "other";

export type Signal =
  | "ordinary"
  | "hostile"
  | "spam"
  | "sensitive"
  | "journalist"
  | "partner";

export type Decision = {
  action: "reply" | "handoff";
  reason: string;
};

export type TesterScore = {
  hardFail: boolean;
  communication: number;
  engagement: number;
  rationality: number;
};

export type CommentBrief = {
  communication: string;
  goal: string;
  engagement: string;
  rationality: string;
};

export const PASS_MARK = 5;
export const SCORE_MAX = 6;

const BLOCKLIST = ["hinabi", "kurata", "hina.band", "hina band", "hinaband"];

const AI_PHRASES = [
  "great question",
  "i'd be happy to",
  "i would be happy to",
  "i’d be happy to",
  "delve",
  "as an ai",
  "let me know if you need anything else",
  "it's worth noting",
  "it’s worth noting",
  "in today's world",
  "in today’s world",
  "certainly",
];

const AMERICAN: Array<[RegExp, string]> = [
  [/\bcolors?\b/i, "colour"],
  [/\bfavorites?\b/i, "favourite"],
  [/\borganiz(?:e|es|ed|ing)\b/i, "organise"],
  [/\bbehaviors?\b/i, "behaviour"],
  [/\bcenters?\b/i, "centre"],
];

export function containsBlocklist(text: string) {
  const haystack = text.toLowerCase();
  return BLOCKLIST.some((term) => haystack.includes(term));
}

export function findAiPhrases(text: string) {
  const haystack = text.toLowerCase();
  return AI_PHRASES.filter((phrase) => {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?:^|[^a-z])${escaped}(?:[^a-z]|$)`, "i").test(haystack);
  });
}

export function findAmericanSpellings(text: string) {
  return AMERICAN.flatMap(([pattern, british]) => {
    const match = text.match(pattern);
    if (!match) return [];
    return [`${match[0]} (use ${british})`];
  });
}

export function decide(input: {
  accountId: AccountId;
  category: Category;
  signal: Signal;
  text: string;
}): Decision {
  if (containsBlocklist(input.text)) {
    return {
      action: "handoff",
      reason: "Hand off. A public reply would have to use a name on the blocklist.",
    };
  }
  if (input.signal === "hostile") {
    return {
      action: "handoff",
      reason: "Hand off. Hostile comments are for a person, not a public reply.",
    };
  }
  if (input.signal === "spam") {
    return { action: "handoff", reason: "Hand off. Spam gets no reply." };
  }
  if (input.signal === "sensitive") {
    return {
      action: "handoff",
      reason: "Hand off. A person decides whether anyone answers a sensitive comment.",
    };
  }
  if (input.signal === "journalist") {
    return {
      action: "handoff",
      reason: "Hand off. The desk does not give interviews or figures.",
    };
  }
  if (input.signal === "partner") {
    return {
      action: "handoff",
      reason: "Hand off. A commercial approach goes to a person. The desk offers no terms.",
    };
  }
  if (input.category === "dating-love") {
    return {
      action: "handoff",
      reason: "Hand off. Dating and love has no brand assigned.",
    };
  }
  if (input.category === "corporate-music") {
    return {
      action: "handoff",
      reason:
        "Hand off. The corporate music industry has no brand assigned, and it sits outside the CITY JAM voice.",
    };
  }
  if (isPat(input.accountId)) {
    if (input.category !== "agents") {
      return {
        action: "handoff",
        reason: "Hand off. Pat's accounts answer his work, AI agents, and Innovation Philosophie.",
      };
    }
    return { action: "reply", reason: "This sits inside Pat's voice." };
  }
  if (isCityJam(input.accountId)) {
    if (input.category !== "music") {
      return {
        action: "handoff",
        reason: "Hand off. CITY JAM answers independent music and the app's consumer features.",
      };
    }
    return { action: "reply", reason: "This sits inside the CITY JAM voice." };
  }
  return { action: "handoff", reason: "Hand off. No voice covers this comment." };
}

export type Analysis = {
  sentiment: "Positive" | "Neutral" | "Negative" | "Mixed";
  intent: string;
  topics: string[];
  strategy: string;
};

export function analyse(input: {
  accountId: AccountId;
  category: Category;
  signal: Signal;
  text: string;
  place?: Place;
}): Analysis {
  const decision = decide(input);
  const topics =
    input.category === "music"
      ? ["Independent music", "CITY JAM"]
      : input.category === "dating-love"
        ? ["Dating / love"]
        : input.category === "corporate-music"
          ? ["Corporate music industry"]
          : input.category === "agents"
            ? ["AI agents", "Innovation Philosophie"]
            : ["Outside the voice guides"];
  const askingToJoin = asksToJoin(input.text);
  let sentiment: Analysis["sentiment"] = "Neutral";
  let intent = "Comment";
  if (input.signal === "hostile") {
    sentiment = "Negative";
    intent = "Accusation";
  } else if (input.signal === "sensitive") {
    sentiment = "Mixed";
    intent = "Personal disclosure";
  } else if (input.signal === "spam") {
    intent = "Spam";
  } else if (input.signal === "journalist") {
    intent = "Press request";
  } else if (input.signal === "partner") {
    intent = "Partnership approach";
  } else if (input.category === "dating-love") {
    intent = "Dating question";
  } else if (input.category === "corporate-music") {
    intent = "Vendor evaluation";
  } else if (input.category === "music") {
    sentiment = "Positive";
    intent = askingToJoin ? "Asks how to join" : "Question about the music";
  } else if (input.category === "agents") {
    sentiment = "Positive";
    intent = "Question about the work";
  }
  const strategy =
    decision.action === "handoff"
      ? "Hand to a person. Do not post."
      : commentBrief(input).goal;
  return { sentiment, intent, topics, strategy };
}

export function asksToJoin(text: string) {
  return /waitlist|open yet|is the app open|how do i join|add my name/i.test(text);
}

export function describesALoss(text: string) {
  return /\b(?:daughter|son|died|death|killed|accident|suicide|funeral|grief)\b/i.test(text);
}

export function commentBrief(input: {
  accountId: AccountId;
  text: string;
  place?: Place;
}): CommentBrief {
  const place = input.place ?? "own";
  const joining = asksToJoin(input.text) && place === "own" && isCityJam(input.accountId);
  const loss = describesALoss(input.text);
  const communication = isPat(input.accountId)
    ? "Pat, in the first person. One plain point about the detail they raised. No slogan."
    : "CITY JAM. One plain point about their music or the app. No slogan, and not Pat's voice.";
  const goal = isPat(input.accountId)
    ? "A conversation about his work, agents, and Innovation Philosophie. Not a CITY JAM sign-up."
    : loss && place === "others"
      ? "A reply about the song they named. Not a comment on the loss, and no link."
      : joining
        ? "They asked how to join. Use the one waitlist link, so a sign-up can be counted. No follower target."
        : place === "others"
          ? "A reply from them. That is the engagement. No link, and no follower or sign-up number."
          : "Answer the music question. Keep the waitlist link out until they ask how to join.";
  const engagement = joining
    ? "The link is the next step. Do not add a second ask."
    : loss
      ? "Respond to the song they named. A question is wrong when they already answered it. Do not ask them to recount the loss."
      : "Respond to something they actually said. Ask a question only when the post left it open.";
  const rationality = loss
    ? "They already said what happened. Do not retell it, and do not use it to get a reply. Say only what the post supports."
    : "Only say what their post supports. Do not promise followers, sign-ups, or any other result. If a public reply would be a guess, hand it to a person.";
  return { communication, goal, engagement, rationality };
}

export function hardFails(
  draft: string,
  accountId: AccountId,
  place: Place = "own",
  sourceText = "",
) {
  const fails: string[] = [];
  const joining = asksToJoin(sourceText) && place === "own" && isCityJam(accountId);
  if (place === "others" && /https?:\/\/|waitlist\.cityjam/i.test(draft)) {
    fails.push("A comment on someone else's post does not carry a link.");
  }
  if (joining && !/waitlist\.cityjam/i.test(draft)) {
    fails.push("Goal: they asked how to join, so use the one waitlist link.");
  }
  if (!joining && place !== "others" && /waitlist\.cityjam/i.test(draft)) {
    fails.push("Goal: the waitlist link is only for someone who asked how to join.");
  }
  if (/\b(?:10[,.]?000|50[,.]?000|10k|50k)\b/i.test(draft)) {
    fails.push("Rationality: internal targets stay out of a public reply.");
  }
  if (/\b(?:guaranteed|go viral|blow up)\b/i.test(draft)) {
    fails.push("Rationality: do not promise a result.");
  }
  if (containsBlocklist(draft)) {
    fails.push("Blocklist: the reply uses a forbidden name or profile.");
  }
  for (const phrase of findAiPhrases(draft)) {
    fails.push(`Stock AI phrasing: “${phrase}”.`);
  }
  for (const spelling of findAmericanSpellings(draft)) {
    fails.push(`British English: ${spelling}.`);
  }
  if (isCityJam(accountId) && /\bAIFF\b/.test(draft)) {
    fails.push("AIFF is outside the CITY JAM voice.");
  }
  if (isCityJam(accountId) && /innovation philosophie|I build agents/i.test(draft)) {
    fails.push("This reads as Pat's voice on a CITY JAM account.");
  }
  if (isPat(accountId) && /CITY JAM|waitlist\.cityjam/i.test(draft)) {
    fails.push("This reads as a CITY JAM reply on Pat's account.");
  }
  if (!isCityJam(accountId) && /waitlist\.cityjam/i.test(draft)) {
    fails.push("The waitlist link is only for a CITY JAM account.");
  }
  return fails;
}

const IMPACT_STOP = new Set(
  `this that with from your have been will they them their what when where which about just like into over after before because there here would could should today every each also were than then some more most only same very much many were been`.split(
    /\s+/,
  ),
);

function impactWords(text: string) {
  return new Set(
    (text.toLowerCase().match(/[a-z][a-z']{3,}/g) ?? []).filter((word) => !IMPACT_STOP.has(word)),
  );
}

function sharedWords(draft: string, source: string) {
  const sourceWords = impactWords(source);
  let count = 0;
  for (const word of impactWords(draft)) {
    if (sourceWords.has(word)) count += 1;
  }
  return count;
}

function questionRepeats(draft: string, source: string) {
  const mark = draft.indexOf("?");
  if (mark < 0) return false;
  const start = Math.max(draft.lastIndexOf(".", mark), draft.lastIndexOf("!", mark)) + 1;
  const question = draft.slice(start, mark);
  if (!/\bor\b/i.test(question)) return false;
  const sourceWords = impactWords(source);
  for (const word of impactWords(question)) {
    if (sourceWords.has(word)) return true;
  }
  return false;
}

export type Impact = {
  score: number;
  band: "None" | "Low" | "Limited" | "Sound" | "Strong";
  notes: string[];
};

export function rateImpact(input: {
  accountId: AccountId;
  category: Category;
  signal: Signal;
  comment: string;
  draft: string;
  place?: Place;
}): Impact {
  const decision = decide({
    accountId: input.accountId,
    category: input.category,
    signal: input.signal,
    text: input.comment,
  });
  if (decision.action === "handoff" || input.draft.trim() === "") {
    return {
      score: 0,
      band: "None",
      notes: ["No public comment, so there is no impact to count."],
    };
  }

  const place = input.place ?? "own";
  const notes: string[] = [];
  let score = 0;
  const shared = sharedWords(input.draft, input.comment);
  if (shared >= 2) {
    score += 3;
    notes.push("It uses details from their post, so they can see it was written for them.");
  } else if (shared === 1) {
    score += 2;
    notes.push("It picks up one detail from their post.");
  } else {
    notes.push("It does not use a detail from their post, so it is easy to ignore.");
  }

  const fails = hardFails(input.draft, input.accountId, place, input.comment);
  const goalFail = fails.find((fail) => /Goal:|does not carry a link|voice|waitlist link is only/i.test(fail));
  if (goalFail) notes.push(goalFail);
  else {
    score += 2;
    notes.push("It fits the goal for this account.");
  }

  if (questionRepeats(input.draft, input.comment)) {
    score = Math.max(0, score - 2);
    notes.push("The question asks for a choice the post already made, so a reply is unlikely.");
  } else if (input.draft.includes("?")) {
    score += 3;
    notes.push("It asks something the post left open, so a reply is more likely.");
  } else if (shared >= 1) {
    score += 1;
    notes.push("It answers the post without asking them to explain it again. A reply is possible, not requested.");
  } else {
    notes.push("There is little reason for them to answer.");
  }

  const retells =
    describesALoss(input.comment) &&
    /\b(?:daughter|son|died|death|killed|accident|suicide|funeral|grief)\b/i.test(input.draft);
  const unsafe = fails.find((fail) => /Rationality|Blocklist|Stock AI|British English/i.test(fail));
  if (retells) notes.push("It retells the loss. That costs trust, so the impact is poor.");
  else if (unsafe) notes.push(unsafe);
  else {
    score += 2;
    notes.push("It only says what their post supports. This is not a count of replies or followers.");
  }

  const clamped = Math.max(0, Math.min(10, score));
  const band = clamped === 0 ? "None" : clamped <= 4 ? "Low" : clamped <= 6 ? "Limited" : clamped <= 8 ? "Sound" : "Strong";
  return { score: clamped, band, notes };
}

export function scoreTester(score: TesterScore) {
  const communication = score.communication;
  const engagement = score.engagement;
  const rationality = score.rationality;
  const marks = [communication, engagement, rationality];
  const marksValid = marks.every((mark) => mark === 0 || mark === 1 || mark === 2);
  const points = marksValid ? communication + engagement + rationality : 0;
  const problems: string[] = [];
  if (score.hardFail) problems.push("Tester marked a hard fail.");
  if (!marksValid) problems.push("Each scored check must be 0, 1, or 2.");
  const passed = problems.length === 0 && points >= PASS_MARK;
  return { points, passed, problems };
}

export function namesAreSet(names: { a: string; b: string }) {
  const a = names.a.trim();
  const b = names.b.trim();
  return a.length >= 2 && b.length >= 2 && a.toLowerCase() !== b.toLowerCase();
}

export type GateInput = {
  accountId: AccountId;
  category: Category;
  signal: Signal;
  comment: string;
  draft: string;
  place?: Place;
  testerNames: { a: string; b: string };
  testerA: TesterScore | null;
  testerB: TesterScore | null;
  approvedText: string | null;
  sentToday: number;
  outcome: "open" | "handed-off" | "mock-published" | "posted-by-pat";
};

export type Gate = {
  decision: Decision;
  draftFails: string[];
  testerA: ReturnType<typeof scoreTester> | null;
  testerB: ReturnType<typeof scoreTester> | null;
  namesReady: boolean;
  readyForPat: boolean;
  approved: boolean;
  canMockPublish: boolean;
  canRecordManual: boolean;
  headline: string;
};

export function evaluateGate(input: GateInput): Gate {
  const account = accounts[input.accountId];
  const decision = decide({
    accountId: input.accountId,
    category: input.category,
    signal: input.signal,
    text: input.comment,
  });
  const draftFails =
    decision.action === "handoff"
      ? []
      : [
          ...hardFails(input.draft, input.accountId, input.place ?? "own", input.comment),
          ...(input.draft.trim() === "" ? ["The reply is empty."] : []),
        ];
  const testerA = input.testerA ? scoreTester(input.testerA) : null;
  const testerB = input.testerB ? scoreTester(input.testerB) : null;
  const namesReady = namesAreSet(input.testerNames);
  const bothPassed = Boolean(testerA?.passed && testerB?.passed);
  const readyForPat =
    decision.action === "reply" &&
    draftFails.length === 0 &&
    namesReady &&
    bothPassed &&
    input.outcome === "open";
  const approved =
    readyForPat && input.approvedText !== null && input.approvedText === input.draft;
  const underCap = input.sentToday < account.dailyCap;
  const canMockPublish = approved && account.send === "mock" && underCap;
  const canRecordManual = approved && account.send === "draft-only" && underCap;

  return {
    decision,
    draftFails,
    testerA,
    testerB,
    namesReady,
    readyForPat,
    approved,
    canMockPublish,
    canRecordManual,
    headline: headline({
      outcome: input.outcome,
      decision,
      draftFails,
      namesReady,
      bothPassed,
      testersPresent: Boolean(input.testerA && input.testerB),
      approved,
      send: account.send,
      underCap,
      sentToday: input.sentToday,
      cap: account.dailyCap,
    }),
  };
}

function headline(input: {
  outcome: GateInput["outcome"];
  decision: Decision;
  draftFails: string[];
  namesReady: boolean;
  bothPassed: boolean;
  testersPresent: boolean;
  approved: boolean;
  send: SendMode;
  underCap: boolean;
  sentToday: number;
  cap: number;
}) {
  if (input.outcome === "handed-off") return "Handed to a person. Nothing was sent.";
  if (input.outcome === "mock-published") return "Recorded on the mock account. No live network was called.";
  if (input.outcome === "posted-by-pat") return "Recorded as posted by Pat himself. The API was not called.";
  if (input.decision.action === "handoff") return input.decision.reason;
  if (input.draftFails.length > 0) return input.draftFails[0];
  if (!input.namesReady) {
    return "Tester names are blank, so this cannot reach Pat.";
  }
  if (!input.testersPresent || !input.bothPassed) {
    return `Both testers need a pass of ${PASS_MARK} out of ${SCORE_MAX}, with no hard fail.`;
  }
  if (!input.approved) return "Waiting for Pat to approve this exact text.";
  if (input.send === "threadify") return "Threadify owns the send.";
  if (!input.underCap) {
    return `Daily cap reached (${input.sentToday} of ${input.cap}).`;
  }
  if (input.send === "draft-only") return "Pat has approved it. He posts this one himself.";
  return "Pat has approved it. A mock publish is open.";
}
