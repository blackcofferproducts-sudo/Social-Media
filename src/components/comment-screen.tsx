"use client";

import { ArrivalDrafts } from "@/components/arrival-drafts";
import { useDesk } from "@/components/desk-provider";
import { ReviewDesk } from "@/components/review-desk";
import { needsModelDraft } from "@/lib/draft-status";
import type { Fixture } from "@/lib/fixture";
import { resolveFixture, sentToday, type CommentRecord } from "@/lib/desk";

export function CommentScreen({
  id,
  fallbackFixture,
  fallbackRecord,
  fallbackNames,
  fallbackSent,
}: {
  id: string;
  fallbackFixture: Fixture | null;
  fallbackRecord: CommentRecord | null;
  fallbackNames: { a: string; b: string };
  fallbackSent: number;
}) {
  const { desk, ready } = useDesk();
  const fixture = resolveFixture(desk, id) ?? fallbackFixture;
  const record = desk.comments[id] ?? fallbackRecord;
  if (!fixture || !record) {
    return (
      <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
        {ready ? "This comment is not saved in this browser." : "Loading this comment."}
      </p>
    );
  }
  const names = ready ? desk.testerNames : fallbackNames;
  const sent = ready ? sentToday(desk, fixture.accountId) : fallbackSent;
  const draftOnServer =
    fallbackFixture && fallbackRecord ? needsModelDraft(fallbackFixture, fallbackRecord) : false;

  return (
    <>
      {draftOnServer ? <ArrivalDrafts focusId={id} once /> : null}
      <ReviewDesk fixture={fixture} record={record} testerNames={names} sentToday={sent} />
    </>
  );
}
