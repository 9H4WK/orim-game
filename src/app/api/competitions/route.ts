import { listCompetitions } from '@/server/competitions';
import { handle, json } from '@/server/http';

export const dynamic = 'force-dynamic';

export const GET = handle(async () => json({ competitions: await listCompetitions() }));
