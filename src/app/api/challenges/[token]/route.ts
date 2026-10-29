import { publicChallenge } from '@/server/challenges';
import { handle, json } from '@/server/http';
import { currentPlayer } from '@/server/identity';
import { listInvitations } from '@/server/sms';

export const dynamic = 'force-dynamic';

export const GET = handle(async (_req: Request, ctx: { params: Promise<{ token: string }> }) => {
  const { token } = await ctx.params;
  const viewer = await currentPlayer();
  const challenge = await publicChallenge(token, viewer);
  const invitations = challenge.isCreator && viewer ? await listInvitations(token, viewer) : [];
  return json({ ...challenge, invitations });
});
