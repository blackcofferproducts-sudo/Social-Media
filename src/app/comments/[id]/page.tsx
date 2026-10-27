import { notFound } from "next/navigation";
import { ReviewDesk } from "@/components/review-desk";
import { fixtureById } from "@/lib/fixtures";
import { grokModelName, grokReady } from "@/lib/grok";
import { getDesk, sentToday } from "@/lib/store";

export default async function CommentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const fixture = fixtureById(id);
  if (!fixture) notFound();
  const desk = getDesk();
  const record = desk.comments[id];
  if (!record) notFound();

  return (
    <ReviewDesk
      fixture={fixture}
      record={record}
      testerNames={desk.testerNames}
      sentToday={sentToday(desk, fixture.accountId)}
      grokReady={grokReady()}
      grokModel={grokModelName()}
    />
  );
}
