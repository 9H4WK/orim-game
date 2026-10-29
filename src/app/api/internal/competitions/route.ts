import { competitionInput, createCompetition } from '@/server/competitions';
import { handle, json, parseBody, requireAdmin } from '@/server/http';

export const dynamic = 'force-dynamic';

/** Admin only: publish a competition with its full rules, budget and prize table */
export const POST = handle(async (req: Request) => {
  const actor = requireAdmin(req);
  const input = await parseBody(req, competitionInput);
  return json(await createCompetition(actor, input), 201);
});
