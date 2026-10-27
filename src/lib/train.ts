import fs from "node:fs";
import path from "node:path";
import type { Fixture } from "./fixture";

export type SheetExample = {
  id: string;
  type: "comment" | "convo";
  category: string;
  post: string;
  intent: string;
  userWordCount: number;
  turns: Array<{ kind: "user" | "gap"; speaker: string; text: string }>;
};

const CRISIS = /\b(?:kill myself|suicide|end my life|don't want to (?:live|be here)|do not want to (?:live|be here))\b/i;

const STOP = new Set(
  "this that with from your have been will they them their what when where which about just like into over after before because there here would could should today every each also than then some more most only same very much many really gonna wanna".split(
    " ",
  ),
);

export function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (quoted) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 1;
        } else quoted = false;
      } else field += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") field += char;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ""));
}

export function loadSheet(csv = readSheet()): SheetExample[] {
  const [header, ...rows] = parseCsv(csv);
  const col = (name: string) => header.findIndex((cell) => cell.trim() === name);
  const id = col("id");
  const type = col("type");
  const category = col("category");
  const post = col("platform_context");
  const text = col("text_or_turns");
  const intent = col("expected_engagement_intent");
  const words = col("user_word_count");
  return rows.map((cells) => ({
    id: cells[id].trim(),
    type: cells[type].trim() === "convo" ? "convo" : "comment",
    category: cells[category].trim(),
    post: cells[post].trim(),
    intent: cells[intent].trim(),
    userWordCount: Number(cells[words]) || 0,
    turns: parseTurns(cells[text].trim()),
  }));
}

function readSheet() {
  return fs.readFileSync(path.join(process.cwd(), "data/training/sample-engagement.csv"), "utf8");
}

export function parseTurns(raw: string): SheetExample["turns"] {
  return raw
    .split(/\s*\|\|\s*/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      if (/^\[AI REPLY HERE\]$/i.test(part)) return { kind: "gap" as const, speaker: "", text: "" };
      const matched = part.match(/^@(\S+):\s*([\s\S]*)$/);
      if (!matched) return { kind: "user" as const, speaker: "", text: part };
      return { kind: "user" as const, speaker: matched[1], text: matched[2].trim() };
    });
}

function words(text: string) {
  return new Set((text.toLowerCase().match(/[a-z][a-z']{3,}/g) ?? []).filter((word) => !STOP.has(word)));
}

export function nearestIds(examples: SheetExample[], id: string, limit = 2) {
  const current = examples.find((example) => example.id === id);
  if (!current) return [];
  const mine = words(userBlob(current));
  return examples
    .filter((example) => example.id !== id)
    .map((example) => {
      const theirs = words(userBlob(example));
      let shared = 0;
      for (const word of mine) if (theirs.has(word)) shared += 1;
      return { id: example.id, shared };
    })
    .sort((a, b) => b.shared - a.shared || a.id.localeCompare(b.id))
    .slice(0, limit)
    .map((item) => item.id);
}

function userBlob(example: SheetExample) {
  return example.turns
    .filter((turn) => turn.kind === "user")
    .map((turn) => turn.text)
    .join(" ");
}

export function isCrisis(text: string) {
  return CRISIS.test(text);
}

export function draftReply(userText: string, intent: string, category: string): string {
  if (isCrisis(userText)) return "";
  const said = userText.replace(/\s+/g, " ").trim();
  const lower = said.toLowerCase();
  const want = intent.toLowerCase();
  const lines: string[] = [];

  if (/\b(?:another ai|are you (?:a |an )?bot|automated)\b/.test(lower)) {
    lines.push(
      "If you mean this reply, a draft is prepared here and Pat approves the words before anything is posted.",
    );
  }
  if (/who actually listens|real people/.test(lower)) {
    lines.push("People listen to the tracks. A follower count doesn't get them heard.");
  }

  if (category.startsWith("Praise")) lines.push(...praise(lower, want));
  else if (category.startsWith("Joining")) lines.push(...joining(lower, want));
  else if (category.startsWith("Collaboration")) lines.push(...collab(lower, want));
  else if (category.startsWith("Studio")) lines.push(...studio(lower, want));
  else if (category.startsWith("Rights")) lines.push(...rights(lower, want));
  else if (category.startsWith("Release")) lines.push(...release(lower, want));
  else if (category.startsWith("Sync")) lines.push(...sync(lower, want));
  else if (category.startsWith("Gear")) lines.push(...gear(lower, want));
  else if (category.startsWith("Scene")) lines.push(...scene(lower, want));
  else if (category.startsWith("Feedback")) lines.push(...feedback(lower, want));
  else if (category.startsWith("Burnout")) lines.push(...burnout(lower, want));
  else if (category.startsWith("Mild")) lines.push(...sceptic(lower, want));

  if (/what they are working on this week/.test(want) && !lines.some((line) => line.includes("?"))) {
    lines.push("What are you working on this week?");
  }
  if (/what they are listening to/.test(want) && !lines.some((line) => line.includes("?"))) {
    lines.push("What are you listening to?");
  }
  if (/ask what they listen for/.test(want) && !lines.some((line) => line.includes("?"))) {
    lines.push("What are you listening for when you say it's done?");
  }
  if (/ask about their scene/.test(want) && !lines.some((line) => line.includes("?"))) {
    lines.push("Where are you actually managing to play?");
  }

  if (lines.filter(Boolean).length === 0) {
    lines.push("I won't guess past what you wrote. Pat should see it before a reply goes out.");
  }
  const draft = lines.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  if (/https?:\/\/|waitlist\.cityjam/i.test(draft)) {
    throw new Error(`Training draft included a link: ${draft}`);
  }
  return draft;
}

function praise(lower: string, want: string) {
  const lines: string[] = [];
  if (/energy i needed/.test(lower)) lines.push("Glad it landed today.");
  else if (/follower counts|numbers are tiny/.test(lower)) {
    lines.push("Getting turned down because the numbers are tiny is grim.");
  } else if (/best line/.test(lower)) lines.push("Glad that line stuck.");
  else if (/magazine|covers/.test(lower)) lines.push("I won't paste a link until Pat has approved one.");
  else if (/live stuff|releases/.test(lower)) {
    lines.push("It can cover a live show as well as a release. I won't invent the contents.");
  } else if (/thank/.test(want)) lines.push("Glad that landed.");
  if (/feature/.test(want)) {
    lines.push("If the record is finished, put that forward. The Feature listens to the sound, not the count.");
  }
  if (/magazine/.test(want) && !lines.some((line) => line.includes("link"))) {
    lines.push("I won't paste a link for the Magazine until one is approved.");
  }
  return lines;
}

function joining(lower: string, want: string) {
  const lines: string[] = [];
  if (/how do i actually join|is there an app/.test(lower)) {
    lines.push("Yes, there's an app. This page isn't the form. I won't paste a link or invent the taps.");
  } else if (/released stuff|just demos|join with just demos/.test(lower)) {
    lines.push("Demos are enough to join. The Feature is the one that wants a finished record.");
  } else if (/session bassist|not really an artist/.test(lower)) {
    lines.push("Creator Labs is for people putting their own music out. Session playing fits Marketplace better.");
  } else if (/difference between maestro and creator labs/.test(lower)) {
    lines.push("Creator Labs is for making and finishing your own music. Maestro is a different path, with a waitlist.");
  } else if (/maestro sounds like me|how do i get on that/.test(lower)) {
    lines.push("If Maestro is the fit, the waitlist is how you ask. I won't paste a link.");
  } else if (/teach guitar/.test(lower)) {
    lines.push("Teaching and producing a bit on the side can sit with Maestro. Creator Labs is the other path, for your own records.");
  } else if (/music ambassador/.test(lower)) {
    lines.push("You don't have to be a big artist. Play, jam, and share what you love. I won't talk earnings.");
  } else if (/34|late to start/.test(lower)) {
    lines.push("34 is not late. SKEWL//HAUS is the practical side. It isn't a clock that starts at 18.");
  } else if (/mixing and the business/.test(lower)) {
    lines.push("Mixing and the business side both fit. SKEWL//HAUS is that practical stuff, not a school timetable.");
  } else if (/skewl/.test(lower)) {
    lines.push("SKEWL//HAUS is for learning the work. It isn't a school that tells you you're late.");
  } else if (/creator labs, is that like a course|like a course/.test(lower)) {
    lines.push("Creator Labs is for working on your own music with other people around it. I won't dress it up as a certificate.");
  }
  if (/maestro/.test(want) && !lines.some((line) => /Maestro/.test(line))) {
    lines.push("Maestro has a waitlist. I won't paste a link.");
  }
  if (/creator labs/.test(want) && !lines.some((line) => /Creator Labs/.test(line))) {
    lines.push("Creator Labs is for people making their own music.");
  }
  if (/marketplace/.test(want) && !lines.some((line) => /Marketplace/.test(line))) {
    lines.push("Marketplace is where we point session players.");
  }
  if (/no links/.test(want) && !lines.some((line) => line.includes("link"))) {
    lines.push("I won't paste a link in the reply.");
  }
  if (/play, jam|ambassador/.test(want) && !lines.some((line) => /jam/.test(line))) {
    lines.push("You don't have to be a big artist. Play, jam, and share what you love. I won't talk earnings.");
  }
  return lines;
}

function collab(lower: string, want: string) {
  const lines: string[] = [];
  if (/singapore|\bhouse\b/.test(lower)) {
    lines.push("House from Singapore, remote included, is welcome here the same as anywhere else.");
  } else if (/remote is totally fine|vocal chain/.test(lower)) {
    lines.push("Remote, with a decent chain at home, is a clear brief.");
  } else if (/2-step|swung beat/.test(lower)) {
    lines.push("A vocal that can float on a swung beat is a real ask.");
  } else if (/lofi|boom bap|beats into the void/.test(lower)) {
    lines.push("Sending beats into the void gets old.");
  } else if (/manila|ballads/.test(lower)) {
    lines.push("A ballad that wants to go somewhere weirder is welcome here, same as anywhere else.");
  } else if (/neo soul|voice memos/.test(lower)) {
    lines.push("Five songs as voice memos is enough to start looking.");
  } else if (/live already|coming soon/.test(lower)) {
    lines.push("I can't tell you from here if Marketplace is open yet. I won't guess the date.");
  }
  if (/marketplace/.test(want)) {
    lines.push("Marketplace is where we point people who want to find each other. I won't promise you a match.");
  }
  if (/creator labs/.test(want) && !lines.some((line) => /Creator Labs/.test(line))) {
    lines.push("Creator Labs is the other room, for the music you're making yourself.");
  }
  if (/scene-neutral|regions equal/.test(want)) {
    lines.push("No city ranks above another here.");
  }
  return lines;
}

function studio(lower: string, want: string) {
  const lines: string[] = [];
  if (/leeds|only in big cities/.test(lower)) {
    lines.push("I won't say yes or no for Leeds. I don't have the city list, and I won't make one up.");
  } else   if (/what do you look at|what makes a studio|certified' tho/.test(lower)) {
    lines.push("I won't invent the checklist. Pat has to confirm what certified actually checks before we say it in public.");
  } else if (/brixton|getting our studio certified/.test(lower)) {
    lines.push("A two-room place can ask. I won't pretend size decides it.");
  } else if (/first time booking|terrified|what should i bring/.test(lower)) {
    lines.push("First-session nerves are normal. Bring the song so you can start it without hunting for it, and one sentence on what you want done.");
  }
  if (/skewl/.test(want)) lines.push("SKEWL//HAUS has the longer version of the prep.");
  if (/flag to pat|without inventing/.test(want) && !lines.some((line) => line.includes("Pat"))) {
    lines.push("If I'm not sure, this goes to Pat rather than a guess.");
  }
  return lines;
}

function rights(lower: string, want: string) {
  const lines: string[] = [];
  if (/who owns what|wrote the song|made the beat/.test(lower)) {
    lines.push("If you wrote the song, that's the composition. The beat recording is a separate thing. Write the split down before it goes anywhere.");
  } else if (/never registered|lost all|collection society/.test(lower)) {
    lines.push("Four years unregistered is not the same as it all being gone. I won't promise money you can claim back. Registering is still worth doing.");
  } else if (/nobody explains it like a human|confusing/.test(lower)) {
    lines.push("It is confusing. Ask the next bit that's actually stuck.");
  } else   if (/garage|four of us/.test(lower)) {
    lines.push("Four of you in a garage, and nothing written down, means any of you might have a claim. Proper advice before money changes hands. I'm not the lawyer.");
  } else if (/old band|who owns the songs|never signed/.test(lower)) {
    lines.push("If the band split and nobody signed anything, it isn't obvious who owns the songs. I'm not the lawyer.");
  } else if (/royalty statement|cannot read it|three columns|distributor/.test(lower)) {
    lines.push("Three columns that disagree are often counting different things, not three answers to one question. I won't guess which column is the real one from here.");
  }
  if (/skewl/.test(want)) lines.push("SKEWL//HAUS walks through it more slowly.");
  if (/no promises of back pay/.test(want) && !lines.some((line) => line.includes("promise"))) {
    lines.push("I won't promise back pay.");
  }
  return lines;
}

function release(lower: string, want: string) {
  const lines: string[] = [];
  if (/artwork|isrc|pitched/.test(lower)) {
    lines.push("If the distributor makes the ISRC, don't invent a second one. Pitching can be a short note to people who already care.");
  } else if (/how far ahead|5 days/.test(lower)) {
    lines.push("Five days is tight if you want anyone to hear it before the date. Pick a day you can actually finish. I won't give you a magic number of weeks.");
  } else if (/need a label|playlists/.test(lower)) {
    lines.push("You don't need a label to pitch. That still isn't a promise you'll land on a playlist.");
  } else if (/single every 6 weeks|drop an ep|stopping me releasing/.test(lower)) {
    lines.push("If the debate is stopping the release, put one song out. The EP can wait.");
  } else if (/first single|what am i forgetting/.test(lower)) {
    lines.push("Three weeks out, tell the people who already care, once the song and the artwork exist. I won't turn that into a checklist.");
  }
  if (/creator labs/.test(want) && !lines.some((line) => /Creator Labs/.test(line))) {
    lines.push("Creator Labs is there if you want people around the choice.");
  }
  if (/no stats|no guarantees/.test(want) && !/promise|magic number/.test(lines.join(" "))) {
    lines.push("I won't dress it up as a guaranteed result.");
  }
  return lines;
}

function sync(lower: string, want: string) {
  const lines: string[] = [];
  if (/zero connections|closed club/.test(lower)) {
    lines.push("Sync means someone uses the track in a film, an ad, or a game. No connections doesn't make that impossible, and it doesn't make it likely.");
  } else if (/instrumentals/.test(lower)) {
    lines.push("Instrumentals get used, and so do songs with vocals. Clean titles and writer names matter more than a rule about no singing.");
  } else if (/stems|bounced/.test(lower)) {
    lines.push("A bounced master is enough to start. Stems help later if they need to edit.");
  } else if (/student film|didn't get paid|did not get paid/.test(lower)) {
    lines.push("If you never agreed to the use, not being paid is a problem, not a favour you owe them.");
  } else if (/buyout/.test(lower)) {
    lines.push("A buyout usually means one fee for a stated use, instead of royalties later. I won't put a number on it. Read which uses they want.");
  }
  if (/sync programme/.test(want)) lines.push("The Sync programme is the path we have. I won't promise a placement.");
  if (/no figures/.test(want) && !lines.some((line) => line.includes("number"))) {
    lines.push("I won't invent a fee.");
  }
  return lines;
}

function gear(lower: string, want: string) {
  const lines: string[] = [];
  if (/wardrobe|laptop mic/.test(lower)) {
    lines.push("A wardrobe and a laptop mic still counts. If the song is there, the room isn't the verdict.");
  } else if (/vocals|too loud|buried/.test(lower)) {
    lines.push("Too loud, or buried under the synths, is the usual fight. Bring the vocal up until the words are clear, then stop before it sits on the track like a podcast.");
  } else if (/overcompress|bedroom mixes/.test(lower)) {
    lines.push("A lot of bedroom mixes are fine. If it won't breathe, the compressor is probably working too hard.");
  } else if (/sampler or groovebox/.test(lower)) {
    lines.push("If you're chopping records, a sampler matches that. A groovebox is the one box for drums and bass together. Either is a real start.");
  } else if (/chopping old records|live drums/.test(lower)) {
    lines.push("Chopping records plus a bit of live drums can live in a sampler. You don't have to buy both this week.");
  }
  if (/skewl/.test(want)) lines.push("SKEWL//HAUS if you want it talked through.");
  if (/brand-neutral/.test(want)) lines.push("I won't name a product to buy.");
  return lines;
}

function scene(lower: string, want: string) {
  const lines: string[] = [];
  if (/peckham|lewisham|south ideally/.test(lower)) {
    lines.push("Peckham and Lewisham way: say what you play, and people who are actually there can answer. I won't name a night.");
  } else if (/open jams|london people/.test(lower)) {
    lines.push("I won't name a night. I don't have one I can promise.");
  }
  if (/rent is killing|rehearsal space/.test(lower)) {
    lines.push("Rent swallowing the rooms is miserable. I won't invent a venue.");
  }
  if (/haven't found my people|havent found my people/.test(lower)) {
    lines.push("A year in and still no musical people is lonely. Say what you play and someone can answer.");
  }
  if (/afrobeats|jazz trio/.test(lower)) {
    lines.push("Afrobeats and a jazz trio is a real mix. I won't pretend I know your borough.");
  }
  if (/singapore/.test(lower)) lines.push("You're welcome here, same as anywhere else. If you're making something, say what it is.");
  if (/manila|same few venues/.test(lower)) lines.push("You're welcome here. If other people in Manila are around, they can say so.");
  if (/marketplace/.test(want)) lines.push("Marketplace and Creator Labs are where people find each other.");
  if (/do not promise or mention any london event/.test(want) && !lines.some((line) => line.includes("promise"))) {
    lines.push("I won't announce a London event.");
  }
  if (/regions equal|scene-neutral/.test(want) && !lines.some((line) => line.includes("same as anywhere"))) {
    lines.push("No city outranks another here.");
  }
  return lines;
}

function feedback(lower: string, want: string) {
  const lines: string[] = [];
  if (/grandad|mastered/.test(lower)) {
    lines.push("Finished, mixed, and mastered means you can put it forward. I won't ask you to cut the story out, and I can't promise it'll be covered.");
  } else if (/ears on my demo|only for finished|before i send it/.test(lower)) {
    lines.push("The Feature is for a finished record. A demo still in progress fits Creator Labs better.");
  } else if (/check my track|honest feedback|dreampop|would you listen/.test(lower)) {
    lines.push("I can't promise a personal breakdown under the post. If the track is finished, put the record forward. We listen to the sound.");
  } else if (/pls listen|please listen/.test(lower) || lower.length < 20) {
    lines.push("What did you make? I won't pretend I've already heard it.");
  }
  if (/feature/.test(want) && !lines.some((line) => /Feature/.test(line))) {
    lines.push("The Feature is how a finished record gets put forward. They listen to the sound.");
  }
  if (/creator labs/.test(want) && !lines.some((line) => /Creator Labs/.test(line))) {
    lines.push("Creator Labs is the place for work that isn't finished.");
  }
  if (/do not promise a personal review|no promises of coverage/.test(want) && !lines.some((line) => line.includes("promise"))) {
    lines.push("I won't promise a personal review.");
  }
  return lines;
}

function burnout(lower: string, want: string) {
  const lines: string[] = [];
  if (/10 years|dont even want to open the daw|don't even want to open/.test(lower)) {
    lines.push("Ten years in, and the DAW stays shut. You're not the only one.");
  } else if (/fun again|numbers and posting|posting schedules/.test(lower)) {
    lines.push("Yeah. It stops being fun when it turns into a posting schedule.");
  } else   if (/like a course/.test(lower)) {
    lines.push("Creator Labs is people working on their own music together. Not a certificate.");
  } else if (/thinking of quitting/.test(lower)) {
    lines.push("That's a heavy sentence. If this is heavier than the work, a person should take it, not a comment.");
  } else if (/not the music|pitching, posting|chasing people/.test(lower)) {
    lines.push("If it's the pitching and the chasing, that part wears people out. The songs can stay.");
  } else if (/holding (?:me|your career) back|streams are flat|people love the songs/.test(lower)) {
    lines.push("Loved at the gig and flat on the streams is a miserable gap. I won't name a product we haven't approved.");
  }
  if (/creator labs/.test(want) && !lines.some((line) => /Creator Labs/.test(line))) {
    lines.push("Creator Labs is where we point that kind of stuck.");
  }
  if (/skewl/.test(want) && !lines.some((line) => /SKEWL/.test(line))) {
    lines.push("SKEWL//HAUS is the slower explanation, when you want it.");
  }
  if (/toxic positivity/.test(want)) lines.push("I won't tell you to just be grateful.");
  return lines;
}

function sceptic(lower: string, want: string) {
  const lines: string[] = [];
  if (/selling you something|what's actually different|whats actually different/.test(lower)) {
    lines.push("Fair suspicion. What we can actually say is that the listen is the sound, not a pitch for your follower count.");
  } else if (/judge by looks|identity-blind/.test(lower) && /stop that|how do you/.test(lower)) {
    lines.push("The sound is what gets heard first here. That doesn't delete the rest of the industry.");
  } else   if (/story is part of my music/.test(lower)) {
    lines.push("The story can live in the song. Hearing the sound first doesn't mean the song has to be anonymous.");
  } else if (/don't care who i am|do not care who i am|identity-blind/.test(lower)) {
    lines.push("We don't ask who you are before we hear it. That's the whole of the rule.");
  } else if (/upwork|race to the bottom/.test(lower)) {
    lines.push("The nerves make sense. I won't talk fees in a comment. The point we will say is the sound, not a race.");
  }
  if (/de-escalate/.test(want) && lines.length === 0) lines.push("Fair question. I'll keep it plain.");
  return lines;
}

function handleOf(example: SheetExample) {
  const speaker = example.turns.find((turn) => turn.kind === "user" && turn.speaker)?.speaker;
  return speaker || example.id.toLowerCase();
}

function threadContext(example: SheetExample, drafted: string[]) {
  const users = example.turns.filter((turn) => turn.kind === "user");
  if (users.length < 2) return example.post;
  const earlier: string[] = [];
  let userIndex = 0;
  let draftIndex = 0;
  for (const turn of example.turns) {
    if (turn.kind === "user") {
      if (userIndex < drafted.length - 1) earlier.push(`${turn.speaker || "Them"}: ${turn.text}`);
      userIndex += 1;
    } else if (draftIndex < drafted.length - 1) {
      earlier.push(`CITY JAM: ${drafted[draftIndex] ?? ""}`);
      draftIndex += 1;
    } else draftIndex += 1;
  }
  if (earlier.length === 0) return example.post;
  return `${example.post}\n\nEarlier in the thread:\n${earlier.join("\n")}`;
}

export function trainFixtures(examples = loadSheet()): Fixture[] {
  return examples.map((example) => {
    const users = example.turns.filter((turn) => turn.kind === "user");
    const drafted = users.map((user) => draftReply(user.text, example.intent, example.category));
    const lastUser = users[users.length - 1];
    const crisis = users.some((user) => isCrisis(user.text));
    const latest = drafted[drafted.length - 1] ?? "";
    return {
      id: `train-${example.id.toLowerCase()}`,
      accountId: "threads",
      author: handleOf(example),
      post: threadContext(example, drafted),
      comment: lastUser?.text ?? "",
      category: "music",
      signal: crisis ? "sensitive" : "ordinary",
      expected: crisis ? "handoff" : "reply",
      suggestedDraft: crisis ? "" : latest,
      place: "own",
      training: {
        sheetId: example.id,
        sheetCategory: example.category,
        intent: example.intent,
        nearest: nearestIds(examples, example.id),
      },
    };
  });
}

export const trainedFixtures = trainFixtures();
