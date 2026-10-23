import { Badge } from "@/components/ui/badge";
import { accounts, liveAccountIds } from "@/lib/accounts";
import { fixtures } from "@/lib/fixtures";
import { decide, hardFails, PASS_MARK, SCORE_MAX } from "@/lib/policy";

const rejected =
  "I'd be happy to help. The color is lovely, and HINABI can delve into AIFF with Innovation Philosophie.";

export default function TestsPage() {
  const rows = fixtures.map((fixture) => {
    const decision = decide({
      accountId: fixture.accountId,
      category: fixture.category,
      signal: fixture.signal,
      text: fixture.comment,
    });
    const draftProblems =
      fixture.expected === "reply" ? hardFails(fixture.suggestedDraft, fixture.accountId) : [];
    const matched = decision.action === fixture.expected && draftProblems.length === 0;
    return { fixture, decision, draftProblems, matched };
  });
  const matched = rows.filter((row) => row.matched).length;
  const rejectedFails = hardFails(rejected, "cityjam-instagram");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-medium">Test pack</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          {matched} of {rows.length} cases match the expected handoff or reply. The Threads rows are
          the ones in this build. The others are kept for the next slice. A human round still needs
          both testers at {PASS_MARK} out of {SCORE_MAX} before Pat sees a reply. One blocklist leak
          fails the round. At least 9 of 10 ordinary replies must pass, and every handoff must hand
          off.
        </p>
      </div>
      <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-muted/60 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Account</th>
              <th className="px-3 py-2 font-medium">Case</th>
              <th className="px-3 py-2 font-medium">Expected</th>
              <th className="px-3 py-2 font-medium">Desk</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.fixture.id} className="border-t border-border align-top">
                <td className="px-3 py-3 whitespace-nowrap">
                  {accounts[row.fixture.accountId].short}
                  {liveAccountIds.includes(row.fixture.accountId) ? "" : " · later"}
                </td>
                <td className="px-3 py-3">
                  <p>{row.fixture.comment}</p>
                  {row.fixture.suggestedDraft ? (
                    <p className="mt-1 text-muted-foreground">{row.fixture.suggestedDraft}</p>
                  ) : (
                    <p className="mt-1 text-muted-foreground">No public reply.</p>
                  )}
                </td>
                <td className="px-3 py-3 whitespace-nowrap">{row.fixture.expected}</td>
                <td className="px-3 py-3">
                  <Badge variant={row.matched ? "secondary" : "destructive"}>{row.decision.action}</Badge>
                  <p className="mt-1 text-muted-foreground">{row.decision.reason}</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <h2 className="font-heading text-lg font-medium">A reply that must fail</h2>
        <p className="mt-2 text-sm leading-6">{rejected}</p>
        <ul className="mt-3 flex flex-col gap-1 text-sm text-destructive">
          {rejectedFails.map((fail) => (
            <li key={fail}>{fail}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
