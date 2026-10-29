import { notFound } from "next/navigation";
import { ArrivalDrafts } from "@/components/arrival-drafts";
import { ReviewDesk } from "@/components/review-desk";
import { needsModelDraft, WRITING_NOTE } from "@/lib/draft-status";
import { getDesk, markWriting, resolveFixture, sentToday } from "@/lib/store";

export const maxDuration = 60;

export default async function CommentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const desk = getDesk();
  const fixture = resolveFixture(desk, id);
  if (!fixture) notFound();
  let record = desk.comments[id];
  if (!record) notFound();
  if (needsModelDraft(fixture, record)) {
    markWriting(id, WRITING_NOTE);
    record = { ...record, grokNote: WRITING_NOTE };
  }

  return (
    <>
      <ArrivalDrafts focusId={id} once />
      <ReviewDesk
        fixture={fixture}
        record={record}
        testerNames={desk.testerNames}
        sentToday={sentToday(desk, fixture.accountId)}
      />
    </>
  );
}
