"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  approveAction,
  handoffAction,
  manualAction,
  publishAction,
  saveDraftAction,
  saveScoreAction,
} from "@/app/actions";
import { modelPhase } from "@/lib/draft-status";
import { accounts } from "@/lib/accounts";
import { placeOf, type Fixture } from "@/lib/fixture";
import { categoryLabel, signalLabel } from "@/lib/labels";
import {
  analyse,
  commentBrief,
  evaluateGate,
  PASS_MARK,
  rateImpact,
  SCORE_MAX,
  type TesterScore,
} from "@/lib/policy";
import type { CommentRecord } from "@/lib/store";

const marks = [
  { name: "communication", label: "Communication. 2 sounds like a person. 0 sounds like a review." },
  {
    name: "engagement",
    label: "Engagement. 2 responds to something they said. 0 asks a question they already answered.",
  },
  { name: "rationality", label: "Rationality. 2 follows from their post and the goal. 0 guesses or promises a result." },
] as const;

export function ReviewDesk({
  fixture,
  record,
  testerNames,
  sentToday,
}: {
  fixture: Fixture;
  record: CommentRecord;
  testerNames: { a: string; b: string };
  sentToday: number;
}) {
  const [draft, setDraft] = useState(record.draft);
  useEffect(() => {
    setDraft(record.draft);
  }, [record.draft, record.source]);
  const account = accounts[fixture.accountId];
  const onOthers = placeOf(fixture) === "others";
  const brief = commentBrief({
    accountId: fixture.accountId,
    text: fixture.comment,
    place: placeOf(fixture),
  });
  const reading = analyse({
    accountId: fixture.accountId,
    category: fixture.category,
    signal: fixture.signal,
    text: fixture.comment,
    place: placeOf(fixture),
  });
  const phase = modelPhase(fixture, record);
  const hold = phase === "writing" || phase === "queued";
  const shown = hold ? "" : draft;
  const dirty = !hold && draft !== record.draft;
  const gate = evaluateGate({
    accountId: fixture.accountId,
    category: fixture.category,
    signal: fixture.signal,
    comment: fixture.comment,
    draft: shown,
    place: placeOf(fixture),
    testerNames,
    testerA: dirty ? null : record.testerA,
    testerB: dirty ? null : record.testerB,
    approvedText: dirty ? null : record.approvedText,
    sentToday,
    outcome: record.outcome,
  });
  const closed = record.outcome !== "open";
  const impact = rateImpact({
    accountId: fixture.accountId,
    category: fixture.category,
    signal: fixture.signal,
    comment: fixture.comment,
    draft: shown,
    place: placeOf(fixture),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{account.short}</Badge>
          <Badge variant="outline">{categoryLabel[fixture.category]}</Badge>
          <Badge variant="outline">{onOthers ? "On their post" : "On our post"}</Badge>
          <Badge variant="outline">{signalLabel[fixture.signal]}</Badge>
        </div>
        {fixture.training ? (
          <Card>
            <CardHeader>
              <CardTitle>From the sheet · {fixture.training.sheetId}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm leading-6">
              <p>{fixture.training.sheetCategory}</p>
              <p>{fixture.training.intent}</p>
              <p className="text-muted-foreground">
                Nearest other rows: {fixture.training.nearest.join(", ") || "none"}.
              </p>
            </CardContent>
          </Card>
        ) : null}
        <Card>
          <CardHeader>
            <CardTitle>Reading</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm leading-6">
            <p>Sentiment: {reading.sentiment}</p>
            <p>Intent: {reading.intent}</p>
            <p>Topics: {reading.topics.join(", ")}</p>
            <p>Move: {reading.strategy}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{onOthers ? "Where it sits" : "Post"}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-6">{fixture.post}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{onOthers ? `${fixture.author} wrote` : fixture.author}</CardTitle>
          </CardHeader>
          <CardContent className="text-base leading-7">{fixture.comment}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>What this comment is for</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm leading-6">
            <p>
              <span className="font-medium">Communication. </span>
              {brief.communication}
            </p>
            <p>
              <span className="font-medium">Goal. </span>
              {brief.goal}
            </p>
            <p>
              <span className="font-medium">Engagement. </span>
              {brief.engagement}
            </p>
            <p>
              <span className="font-medium">Rationality. </span>
              {brief.rationality}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Voice for this account</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm leading-6">
            <p>{account.speaksAs}</p>
            {account.samples.length > 0 ? (
              <ul className="flex flex-col gap-2 border-l border-border pl-3 text-muted-foreground">
                {account.samples.map((sample) => (
                  <li key={sample}>{sample}</li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">No public sample. Threads stays in Threadify.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>
              {hold ? "Likely impact" : `Likely impact ${impact.score}/10`}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm leading-6">
            {hold ? (
              <p>The score appears when the reply is in. It is a reading of that text, not a count of replies.</p>
            ) : (
              <>
                <p>
                  {impact.band}. This is a reading of the draft. It is not a count of replies, followers,
                  or sign-ups.
                </p>
                <ul className="flex flex-col gap-1 text-muted-foreground">
                  {impact.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              {gate.decision.action === "handoff"
                ? "No public comment"
                : onOthers
                  ? "Comment on their post"
                  : "Public reply"}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm leading-6">{gate.headline}</p>
            <p className="text-sm leading-6 text-muted-foreground">
              {phase === "handoff"
                ? "This one is a handoff. It does not go to the model."
                : phase === "failed"
                  ? record.grokNote
                  : phase === "edited"
                    ? "This wording was edited on the desk. Testers score it, then Pat approves the exact text."
                    : phase === "ready"
                      ? `${record.model ?? "Grok 4.7"} wrote this reply. Testers score it, then Pat approves the exact text.`
                      : "This comment came in. Grok 4.7 is writing the reply. It then waits here for a score and Pat's approval."}
            </p>
            {gate.draftFails.length > 0 ? (
              <ul className="flex flex-col gap-1 text-sm text-destructive">
                {gate.draftFails.map((fail) => (
                  <li key={fail}>{fail}</li>
                ))}
              </ul>
            ) : null}
            <form action={saveDraftAction} className="flex flex-col gap-3">
              <input type="hidden" name="commentId" value={fixture.id} />
              <Label htmlFor="draft">{onOthers ? "Comment" : "Draft"}</Label>
              <Textarea
                id="draft"
                name="draft"
                value={shown}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={hold ? "Grok is writing the reply…" : ""}
                disabled={closed || hold || gate.decision.action === "handoff"}
                className="min-h-36"
              />
              {dirty ? (
                <p className="text-sm text-muted-foreground">
                  Unsaved. Saving clears both tester scores and Pat&apos;s approval.
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button type="submit" variant="outline" disabled={closed || !dirty}>
                  Save draft
                </Button>
              </div>
            </form>
            <form action={handoffAction}>
              <input type="hidden" name="commentId" value={fixture.id} />
              <Button type="submit" variant="secondary" disabled={closed}>
                Hand to a person
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          <ScoreCard
            seat="a"
            title={testerNames.a.trim() || "Tester A, unnamed"}
            commentId={fixture.id}
            score={record.testerA}
            result={dirty ? null : gate.testerA}
            disabled={closed || dirty || hold || gate.decision.action === "handoff"}
          />
          <ScoreCard
            seat="b"
            title={testerNames.b.trim() || "Tester B, unnamed"}
            commentId={fixture.id}
            score={record.testerB}
            result={dirty ? null : gate.testerB}
            disabled={closed || dirty || hold || gate.decision.action === "handoff"}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pat&apos;s approval</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm leading-6">
            <p>
              Pass mark is {PASS_MARK} out of {SCORE_MAX}, on communication, engagement, and
              rationality. The goal is fixed on the card. A draft that fights it fails before
              scoring. Testers do not approve. Any edit after this point needs both testers and Pat
              again.
            </p>
            <p>
              {account.short}: {sentToday} of {account.dailyCap} used today, Asia/Kolkata.
            </p>
            <div className="flex flex-wrap gap-2">
              <form action={approveAction}>
                <input type="hidden" name="commentId" value={fixture.id} />
                <Button type="submit" disabled={closed || dirty || !gate.readyForPat || gate.approved}>
                  Pat approves this text
                </Button>
              </form>
              <form action={publishAction}>
                <input type="hidden" name="commentId" value={fixture.id} />
                <Button type="submit" variant="outline" disabled={!gate.canMockPublish}>
                  {onOthers ? "Post the comment on the mock account" : `Publish to the mock ${account.platform} account`}
                </Button>
              </form>
              <form action={manualAction}>
                <input type="hidden" name="commentId" value={fixture.id} />
                <Button type="submit" variant="outline" disabled={!gate.canRecordManual}>
                  Record that Pat posted it
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ScoreCard({
  seat,
  title,
  commentId,
  score,
  result,
  disabled,
}: {
  seat: "a" | "b";
  title: string;
  commentId: string;
  score: TesterScore | null;
  result: { points: number; passed: boolean } | null;
  disabled: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={saveScoreAction} className="flex flex-col gap-3">
          <input type="hidden" name="commentId" value={commentId} />
          <input type="hidden" name="seat" value={seat} />
          {marks.map((mark) => (
            <label key={mark.name} className="flex flex-col gap-1 text-sm">
              {mark.label}
              <select
                name={mark.name}
                defaultValue={String(score?.[mark.name] ?? 0)}
                disabled={disabled}
                className="h-8 rounded-lg border border-input bg-transparent px-2"
              >
                <option value="0">0</option>
                <option value="1">1</option>
                <option value="2">2</option>
              </select>
            </label>
          ))}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="hardFail" defaultChecked={score?.hardFail ?? false} disabled={disabled} />
            Hard fail
          </label>
          {result ? (
            <p className="text-sm text-muted-foreground">
              {result.points} / {SCORE_MAX}
              {result.passed ? ". Pass." : ". Below the pass mark."}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Not scored on this text.</p>
          )}
          <Button type="submit" variant="outline" disabled={disabled}>
            Save score
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
