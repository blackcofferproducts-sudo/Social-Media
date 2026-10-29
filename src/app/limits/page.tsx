import { LimitsDesk } from "@/components/limits-desk";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const blanks = [
  "Momentive hive is not defined. It has no role until someone writes what it is, who is in it, and what it owns.",
  "This build is CITY JAM on Threads. The account behind the 10,000 followers is still for Pat to confirm. Threadify can keep scheduling posts.",
  "Dating / love and the corporate music industry have no brand. Those comments hand off.",
  "Instagram growth, LinkedIn resonance, and LinkedIn conversion have no numeric target.",
  "The two human testers are unnamed until they are saved on this page.",
  "Who pays for Cursor, and who pays for X API credits, is not named.",
  "The CITY JAM LinkedIn Page is the company page this desk knows. Any other page needs its own voice before it is added.",
];

export default function LimitsPage() {
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

      <LimitsDesk />

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
