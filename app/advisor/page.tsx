import { getFinancialSnapshot } from "./actions";
import { buildSystemPrompt } from "./prompt";
import { AdvisorChat } from "./chat";

export const dynamic = "force-dynamic";

export default async function AdvisorPage() {
  const snapshot = await getFinancialSnapshot();
  const systemPrompt = buildSystemPrompt(snapshot);

  return (
    <AdvisorChat systemPrompt={systemPrompt} monthName={snapshot.monthName} />
  );
}
