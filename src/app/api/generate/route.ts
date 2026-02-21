import { NextRequest, NextResponse } from 'next/server';
import { WorldLabsClient, GenerateRequest } from '@/lib/worldlabs';

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.WORLDLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'WORLDLABS_API_KEY not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      prompt,
      imageUrl,
      imageBase64,
      images,
      quality = 'draft',
      name,
      isPano = false,
      seed,
    } = body;

    const client = new WorldLabsClient(apiKey);
    const model = quality === 'professional' ? 'Marble 0.1-plus' : 'Marble 0.1-mini';

    let generateRequest: GenerateRequest;

    if (images && Array.isArray(images) && images.length > 0) {
      // Multi-image generation
      generateRequest = {
        world_prompt: {
          type: 'multi-image',
          multi_image_prompt: images.map((img: { base64: string; azimuth: number }) => ({
            azimuth: img.azimuth,
            content: {
              source: 'data_base64' as const,
              data_base64: img.base64,
            },
          })),
          text_prompt: prompt || undefined,
        },
        model,
        display_name: name || `Spatia Environment - ${new Date().toISOString().split('T')[0]}`,
        tags: ['environment', 'spatia'],
        ...(seed != null && seed !== '' ? { seed: Number(seed) } : {}),
      };
    } else if (imageUrl || imageBase64) {
      // Image-based generation
      generateRequest = {
        world_prompt: {
          type: 'image',
          image_prompt: imageUrl
            ? { source: 'uri', uri: imageUrl }
            : { source: 'data_base64', data_base64: imageBase64 },
          text_prompt: prompt || undefined,
          is_pano: isPano,
        },
        model,
        display_name: name || `Spatia Environment - ${new Date().toISOString().split('T')[0]}`,
        tags: ['environment', 'spatia'],
        ...(seed != null && seed !== '' ? { seed: Number(seed) } : {}),
      };
    } else if (prompt) {
      // Text-based generation
      generateRequest = {
        world_prompt: {
          type: 'text',
          text_prompt: prompt,
        },
        model,
        display_name: name || `Spatia Environment - ${new Date().toISOString().split('T')[0]}`,
        tags: ['environment', 'spatia'],
        ...(seed != null && seed !== '' ? { seed: Number(seed) } : {}),
      };
    } else {
      return NextResponse.json(
        { error: 'Either prompt, image, or multi-image input is required' },
        { status: 400 }
      );
    }

    const operation = await client.generateWorld(generateRequest);

    return NextResponse.json({
      operationId: operation.operation_id,
      model,
      createdAt: operation.created_at,
    });
  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    );
  }
}
