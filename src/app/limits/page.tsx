import { saveNamesAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { accountIds, accounts } from "@/lib/accounts";
import { namesAreSet } from "@/lib/policy";
import { capSummary, getDesk } from "@/lib/store";

const blanks = [
  "Momentive hive is not defined. It has no role until someone writes what it is, who is in it, and what it owns.",
  "The Threads account behind the 10,000 followers is not named. Threadify keeps that account's posts and replies unless Pat says otherwise.",
  "Dating / love and the corporate music industry have no brand. Those comments hand off.",
  "Instagram growth, LinkedIn resonance, and LinkedIn conversion have no numeric target.",
  "The two human testers are unnamed until they are saved on this page.",
  "Who pays for Cursor, and who pays for X API credits, is not named.",
  "The CITY JAM LinkedIn Page is the company page this desk knows. Any other page needs its own voice before it is added.",
];

export default function LimitsPage() {
  const desk = getDesk();
  const named = namesAreSet(desk.testerNames);
  const caps = capSummary(desk);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-medium">Limits and access</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Connections use each platform&apos;s own authorisation, or a Page admin role. The desk
          does not ask for passwords. Caps reset at midnight, Asia/Kolkata, and sit under the
          platform ceiling.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tester names</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={saveNamesAction} className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor="testerA">Tester A</Label>
              <Input id="testerA" name="testerA" defaultValue={desk.testerNames.a} autoComplete="name" />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="testerB">Tester B</Label>
              <Input id="testerB" name="testerB" defaultValue={desk.testerNames.b} autoComplete="name" />
            </div>
            <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
              <Button type="submit">Save names</Button>
              <p className="text-sm text-muted-foreground">
                {named
                  ? "Both names are written down. They filter replies. They do not approve them."
                  : "Until two different names are saved, Pat's approval stays shut."}
              </p>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        {accountIds.map((id) => {
          const account = accounts[id];
          const usage = caps.find((row) => row.account.id === id);
          return (
            <Card key={id}>
              <CardHeader>
                <CardTitle>
                  {account.label} · {usage?.sent ?? 0} / {account.dailyCap} today
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm leading-6">
                <p>{account.api}</p>
                <p className="text-muted-foreground">{account.ceiling}</p>
                <p className="text-muted-foreground">{account.access}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cursor</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm leading-6">
          <p>
            Building this desk uses Cloud Agents. Those need Premium on The X Subscription, at $30
            a month, or a Teams seat at the same Premium tier. Free and Plus do not include Cloud
            Agents. Someone who already has a legacy Pro plan can use that.
          </p>
          <p className="text-muted-foreground">
            The payer is not named. They sign in through Cursor&apos;s own login. X API credits are
            a separate bill, and that payer is unnamed too.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Still open</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-2 text-sm leading-6">
            {blanks.map((blank) => (
              <li key={blank}>{blank}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
