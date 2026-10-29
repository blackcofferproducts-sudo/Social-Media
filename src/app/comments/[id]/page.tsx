import { CommentScreen } from "@/components/comment-screen";
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
  const fixture = resolveFixture(desk, id) ?? null;
  let record = fixture ? (desk.comments[id] ?? null) : null;
  if (fixture && record && needsModelDraft(fixture, record)) {
    markWriting(id, WRITING_NOTE);
    record = { ...record, grokNote: WRITING_NOTE };
  }

  return (
    <CommentScreen
      id={id}
      fallbackFixture={fixture}
      fallbackRecord={record}
      fallbackNames={desk.testerNames}
      fallbackSent={fixture ? sentToday(desk, fixture.accountId) : 0}
    />
  );
}
