"use client";

import Link from "next/link";
import { ArrivalDrafts } from "@/components/arrival-drafts";
import { EnterComment } from "@/components/enter-comment";
import { MusicIntake } from "@/components/music-intake";
import { Badge } from "@/components/ui/badge";
import { accountIds, accounts } from "@/lib/accounts";
import { modelPhase } from "@/lib/draft-status";
import { placeOf } from "@/lib/fixture";
import { categoryLabel, signalLabel } from "@/lib/labels";
import { rateImpact } from "@/lib/policy";
import { gateFor } from "@/lib/desk";
import { useDesk } from "@/components/desk-provider";

export function QueueScreen({
  view,
  account,
  browserCopy,
}: {
  view: "others" | "replies";
  account?: string;
  browserCopy: boolean;
}) {
  const { desk, ready } = useDesk();
  const selected = accountIds.find((id) => id === account);
  const list = desk.incoming.filter((fixture) => {
    const place = placeOf(fixture);
    if (view === "replies") return place === "own" && fixture.accountId === "threads";
    if (place !== "others") return false;
    return !selected || fixture.accountId === selected;
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-medium">Queue</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Each comment is held to four things. Communication: talk like a person on that account,
          one point, no slogan. Goal: on someone else&apos;s post, earn a reply; on our post, answer
          them, and use the waitlist link only if they asked how to join. Engagement: respond to
          something they said. Ask a question only when the post left it open. Rationality: say only what their post
          supports. No follower numbers, and no promised result. When a comment comes in, Grok 4.7
          writes the reply. The desk scores the likely impact. Testers score it, and Pat approves
          the exact text before anything is mock-published.
        </p>
        {browserCopy ? (
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Comments you save stay in this browser. A refresh keeps them. Another browser does not
            see them.
          </p>
        ) : null}
        <EnterComment key={view} place={view === "replies" ? "own" : "others"} />
        {view === "others" ? <MusicIntake /> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <Filter href="/" current={view === "others"} label="On other people's posts" />
        <Filter href="/?view=replies" current={view === "replies"} label="Replies on our Threads" />
      </div>
      {view === "others" ? (
        <div className="flex flex-wrap gap-2">
          <Filter href="/" current={!selected} label="All channels" />
          {accountIds.map((id) => (
            <Filter
              key={id}
              href={`/?account=${id}`}
              current={selected === id}
              label={accounts[id].short}
            />
          ))}
        </div>
      ) : null}
      <ArrivalDrafts scope={view === "replies" ? "replies" : "others"} />
      {!ready ? (
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">Loading saved comments.</p>
      ) : null}
      {ready && list.length === 0 ? (
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          {view === "replies"
            ? "No replies are waiting on our Threads posts."
            : "No comments are waiting. A comment you save shows up here."}
        </p>
      ) : null}
      <ul className="flex flex-col gap-3">
        {list.map((fixture) => {
          const record = desk.comments[fixture.id];
          const phase = record ? modelPhase(fixture, record) : "queued";
          const gate = gateFor(desk, fixture.id);
          const fromThreads = fixture.id.startsWith("threads-");
          const entered = fixture.id.startsWith("entered-");
          const impact = rateImpact({
            accountId: fixture.accountId,
            category: fixture.category,
            signal: fixture.signal,
            comment: fixture.comment,
            draft: record?.draft ?? "",
            place: placeOf(fixture),
          });
          return (
            <li key={fixture.id}>
              <Link
                href={`/comments/${fixture.id}`}
                className="flex flex-col gap-2 rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10 hover:bg-muted/40 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{accounts[fixture.accountId].short}</Badge>
                    {fromThreads ? <Badge variant="outline">Threads</Badge> : null}
                    {entered ? <Badge variant="outline">Entered</Badge> : null}
                    <Badge variant="outline">{signalLabel[fixture.signal]}</Badge>
                    {fixture.training ? (
                      <Badge variant="outline">
                        {fixture.training.sheetId} · {fixture.training.sheetCategory}
                      </Badge>
                    ) : null}
                    {phase === "writing" || phase === "queued" ? (
                      <Badge variant="outline">Writing the reply</Badge>
                    ) : null}
                    {phase === "ready" ? <Badge variant="outline">Waiting for score</Badge> : null}
                  </div>
                  <p className="text-sm leading-6">{fixture.comment}</p>
                  {record?.draft ? (
                    <p className="text-sm leading-6 text-muted-foreground">Reply: {record.draft}</p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">{categoryLabel[fixture.category]}</p>
                </div>
                <p className="max-w-xs shrink-0 text-sm text-muted-foreground sm:text-right">
                  <span className="font-medium text-foreground">{impact.score}/10</span>
                  {". "}
                  {gate?.headline}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Filter({ href, label, current }: { href: string; label: string; current: boolean }) {
  return (
    <Link
      href={href}
      className={
        current
          ? "rounded-md bg-primary px-2.5 py-1 text-sm text-primary-foreground"
          : "rounded-md px-2.5 py-1 text-sm text-muted-foreground ring-1 ring-border"
      }
    >
      {label}
    </Link>
  );
}
