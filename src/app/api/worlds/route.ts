import { NextRequest, NextResponse } from 'next/server';
import { WorldLabsClient } from '@/lib/worldlabs';

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.WORLDLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'WORLDLABS_API_KEY not configured' },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const pageToken = searchParams.get('pageToken') || undefined;
    const status = searchParams.get('status') as 'SUCCEEDED' | 'PENDING' | 'FAILED' | 'RUNNING' | undefined;

    const client = new WorldLabsClient(apiKey);
    const result = await client.listWorlds({
      page_size: pageSize,
      page_token: pageToken,
      status: status || 'SUCCEEDED',
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('List worlds error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list worlds' },
      { status: 500 }
    );
  }
}
