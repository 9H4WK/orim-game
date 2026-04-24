import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ids = searchParams.get('ids') || 'So11111111111111111111111111111111111111112';

  console.log(`[Price API] Fetching pulse for: ${ids}`);

  try {
    // Jupiter v2 is deprecated (404), upgrading to v3
    const response = await fetch(`https://api.jup.ag/price/v3?ids=${ids}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; ORIM-Labyrinth/1.0)'
      },
      cache: 'no-store'
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Price API] Jupiter Error: ${response.status} - ${errorText}`);
      return NextResponse.json({ error: `Jupiter returned ${response.status}` }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[Price API] Critical Proxy Failure:', error);
    return NextResponse.json(
      { error: 'Market pulse lost: ' + error.message },
      { status: 500 }
    );
  }
}
