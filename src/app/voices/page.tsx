import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { accountIds, accounts } from "@/lib/accounts";

const categoryMap = [
  ["Music", "CITY JAM on Threads in this build. Instagram and the LinkedIn Page keep the same voice for later."],
  ["Dating / love", "No brand is named. Every comment is a handoff."],
  ["Corporate music industry", "No brand is named. It is outside the CITY JAM voice, so every comment is a handoff."],
  ["AI agents and Innovation Philosophie", "Pat on X, and Pat's personal LinkedIn."],
];

export default function VoicesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-medium">Voice guides</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          The voice is how an account talks. The goal decides what that talk is for. CITY JAM
          comments are for independent music, a reply from the other person, or a waitlist sign-up
          when they asked how to join. Pat&apos;s comments are for a serious conversation about his
          work. A reply that uses another account&apos;s subjects fails before it can reach him.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {categoryMap.map(([category, brand]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle>{category}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-6">{brand}</CardContent>
          </Card>
        ))}
      </div>
      <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
        A public reply never names HINABI, KURATA, or HINA.BAND, and never shares those profiles.
        AIFF stays outside the CITY JAM voice.
      </p>
      <div className="flex flex-col gap-4">
        {[...accountIds]
          .sort((a, b) => (accounts[a].phase === accounts[b].phase ? 0 : accounts[a].phase === "now" ? -1 : 1))
          .map((id) => {
          const account = accounts[id];
          return (
            <Card key={id}>
              <CardHeader>
                <CardTitle>{account.label}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm leading-6">
                <p className="text-muted-foreground">
                  {account.phase === "now" ? "In this build." : "Kept for the next slice."}
                </p>
                <p>{account.speaksAs}</p>
                <div className="flex flex-wrap gap-2">
                  {account.subjects.map((subject) => (
                    <Badge key={subject} variant="secondary">
                      {subject}
                    </Badge>
                  ))}
                </div>
                <div>
                  <p className="font-medium">Hands off</p>
                  <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                    {account.handsOff.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                {account.samples.length > 0 ? (
                  <div>
                    <p className="font-medium">Lines for Pat to accept</p>
                    <ul className="mt-1 flex flex-col gap-2 text-muted-foreground">
                      {account.samples.map((sample) => (
                        <li key={sample} className="border-l border-border pl-3">
                          {sample}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
