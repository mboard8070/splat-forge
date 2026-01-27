import { NextRequest, NextResponse } from 'next/server';
import { WorldLabsClient } from '@/lib/worldlabs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ operationId: string }> }
) {
  try {
    const apiKey = process.env.WORLDLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'WORLDLABS_API_KEY not configured' },
        { status: 500 }
      );
    }

    const { operationId } = await params;
    const client = new WorldLabsClient(apiKey);
    const operation = await client.getOperation(operationId);

    return NextResponse.json({
      done: operation.done,
      progress: operation.metadata?.progress_percentage ?? 0,
      worldId: operation.metadata?.world_id,
      error: operation.error,
      world: operation.response,
      createdAt: operation.created_at,
      updatedAt: operation.updated_at,
    });
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Status check failed' },
      { status: 500 }
    );
  }
}
