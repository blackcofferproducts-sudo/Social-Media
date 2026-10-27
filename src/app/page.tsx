import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { accountIds, accounts } from "@/lib/accounts";
import { fixtures, placeOf } from "@/lib/fixtures";
import { categoryLabel, signalLabel } from "@/lib/labels";
import { rateImpact } from "@/lib/policy";
import { gateFor, getDesk } from "@/lib/store";

export default async function QueuePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; account?: string }>;
}) {
  const params = await searchParams;
  const view = params.view === "replies" ? "replies" : "others";
  const selected = accountIds.find((id) => id === params.account);
  const desk = getDesk();
  const rows = fixtures.filter((fixture) => {
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
          supports. No follower numbers, and no promised result. Replies on our Threads include
          56 comments from the engagement sheet. The draft follows that row&apos;s intent and the
          words they used. It is not a stored sentence, and it is not a fine-tuned neural net.
        </p>
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
      <ul className="flex flex-col gap-3">
        {rows.map((fixture) => {
          const gate = gateFor(desk, fixture.id);
          const impact = rateImpact({
            accountId: fixture.accountId,
            category: fixture.category,
            signal: fixture.signal,
            comment: fixture.comment,
            draft: desk.comments[fixture.id]?.draft ?? "",
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
                    <Badge variant="outline">{signalLabel[fixture.signal]}</Badge>
                    {fixture.training ? (
                      <Badge variant="outline">
                        {fixture.training.sheetId} · {fixture.training.sheetCategory}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-sm leading-6">{fixture.comment}</p>
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
