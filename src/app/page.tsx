import { QueueScreen } from "@/components/queue-screen";
import { accountIds } from "@/lib/accounts";
import { deskUsesScratchFile } from "@/lib/store";

export const maxDuration = 60;

export default async function QueuePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; account?: string }>;
}) {
  const params = await searchParams;
  const view = params.view === "replies" ? "replies" : "others";
  const account = accountIds.find((id) => id === params.account);
  return <QueueScreen view={view} account={account} browserCopy={deskUsesScratchFile() || process.env.VERCEL === "1"} />;
}
