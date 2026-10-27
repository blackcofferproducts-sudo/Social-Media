import { notFound } from "next/navigation";
import { ArrivalDrafts } from "@/components/arrival-drafts";
import { ReviewDesk } from "@/components/review-desk";
import { needsModelDraft, WRITING_NOTE } from "@/lib/draft-status";
import { fixtureById } from "@/lib/fixtures";
import { getDesk, markWriting, sentToday } from "@/lib/store";

export default async function CommentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const fixture = fixtureById(id);
  if (!fixture) notFound();
  const desk = getDesk();
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
