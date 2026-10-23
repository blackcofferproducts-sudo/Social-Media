import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fixtures } from "@/lib/fixtures";
import { getDesk } from "@/lib/store";

const targets = [
  {
    name: "CITY JAM waitlist",
    target: "50,000 sign-ups. 10,000 to 12,000 in the first seven days.",
    movedBy: "An approved CITY JAM reply that tells someone how to join, with one approved link.",
    measured: "Waitlist count by day and by UTM source. This desk counts how many approved replies carried the stand-in link. It does not invent sign-ups.",
  },
  {
    name: "Threads followers",
    target: "About 10,000 on the account Pat names.",
    movedBy: "Threadify posts and scheduling. This desk does not publish Threads replies.",
    measured: "Weekly follower count on that profile, and in Threadify. One number, not two.",
  },
  {
    name: "Instagram growth",
    target: "No number yet.",
    movedBy: "CITY JAM comment replies after Pat's approval.",
    measured: "Instagram Insights: followers, profile visits, and reach, as a weekly change from a baseline.",
  },
  {
    name: "LinkedIn resonance",
    target: "No number or definition yet.",
    movedBy: "Drafts Pat posts on his personal profile.",
    measured: "Proposed: comments that receive a human follow-up within seven days.",
  },
  {
    name: "LinkedIn conversion",
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
  const published = records.filter((row) => row.record?.outcome === "mock-published");
  const manual = records.filter((row) => row.record?.outcome === "posted-by-pat");
  const handed = records.filter((row) => row.record?.outcome === "handed-off");
  const withLink = published.filter((row) => row.record.draft.includes("waitlist.cityjam.example"));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-medium">Metrics</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          The waitlist and the follower total are company targets. This desk is accountable for
          replies Pat approved, and for links those replies carried. Sample network totals are not
          shown, because none are connected.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric value={String(published.length)} label="Mock publishes" />
        <Metric value={String(manual.length)} label="Posted by Pat, recorded" />
        <Metric value={String(withLink.length)} label="Approved replies with the waitlist link" />
        <Metric value={String(handed.length)} label="Handed to a person" />
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
