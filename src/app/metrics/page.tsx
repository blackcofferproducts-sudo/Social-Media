import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { liveAccountIds } from "@/lib/accounts";
import { fixtures } from "@/lib/fixtures";
import { getDesk } from "@/lib/store";

const targets = [
  {
    name: "CITY JAM waitlist",
    target: "50,000 sign-ups. 10,000 to 12,000 in the first seven days.",
    movedBy: "An approved Threads reply that tells someone how to join, with the threads waitlist link.",
    measured: "Waitlist count by day and by UTM source. This desk counts approved Threads replies that carried utm_source=threads. It does not invent sign-ups.",
  },
  {
    name: "Threads followers",
    target: "About 10,000 on the CITY JAM Threads account.",
    movedBy: "Comments that earn a reply, plus posts Threadify may still schedule. The follower number is not written into a comment.",
    measured: "Weekly follower count on that profile, and in Threadify. One number, not two.",
  },
  {
    name: "Later · Instagram growth",
    target: "No number yet.",
    movedBy: "CITY JAM comment replies after Pat's approval.",
    measured: "Instagram Insights: followers, profile visits, and reach, as a weekly change from a baseline.",
  },
  {
    name: "Later · LinkedIn resonance",
    target: "No number or definition yet.",
    movedBy: "Drafts Pat posts on his personal profile.",
    measured: "Proposed: comments that receive a human follow-up within seven days.",
  },
  {
    name: "Later · LinkedIn conversion",
    target: "No number yet.",
    movedBy: "CITY JAM Page replies that carry the approved link.",
    measured: "Waitlist sign-ups with utm_source=linkedin_company.",
  },
];

export default function MetricsPage() {
  const desk = getDesk();
  const records = fixtures.map((fixture) => ({
    fixture,
    record: desk.comments[fixture.id],
  }));
  const threads = records.filter((row) => liveAccountIds.includes(row.fixture.accountId));
  const published = threads.filter((row) => row.record?.outcome === "mock-published");
  const handed = threads.filter((row) => row.record?.outcome === "handed-off");
  const withLink = published.filter((row) => row.record.draft.includes("utm_source=threads"));
  const onOthers = records.filter(
    (row) =>
      (row.fixture.place ?? "own") === "others" &&
      (row.record?.outcome === "mock-published" || row.record?.outcome === "posted-by-pat"),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-medium">Metrics</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          A comment on someone else&apos;s post serves engagement: it counts here only after Pat
          approves it, and it is meant to earn a reply, not a follower number. A waitlist link
          serves the sign-up goal, and only on our own post when they asked how to join. This desk
          does not invent sign-ups or follower totals.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric value={String(published.length)} label="Threads mock publishes" />
        <Metric value={String(withLink.length)} label="Threads replies with the waitlist link" />
        <Metric value={String(handed.length)} label="Threads comments handed to a person" />
        <Metric value={String(onOthers.length)} label="Comments posted on other people's posts" />
      </div>
      <div className="flex flex-col gap-3">
        {targets.map((target) => (
          <Card key={target.name}>
            <CardHeader>
              <CardTitle>{target.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm leading-6">
              <p>{target.target}</p>
              <p className="text-muted-foreground">Moved by: {target.movedBy}</p>
              <p className="text-muted-foreground">Measured by: {target.measured}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{value}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">{label}</CardContent>
    </Card>
  );
}
