import { NextRequest, NextResponse } from 'next/server';
import { WorldLabsClient } from '@/lib/worldlabs';

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.WORLDLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'WORLDLABS_API_KEY not configured' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const client = new WorldLabsClient(apiKey);
    
    // Get file extension
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const kind = file.type.startsWith('video/') ? 'video' : 'image';
    
    // Prepare upload
    const { media_asset, upload_info } = await client.prepareUpload(
      file.name,
      kind,
      extension
    );

    // Upload the file
    const buffer = await file.arrayBuffer();
    await client.uploadFile(upload_info, buffer, file.type);

    return NextResponse.json({
      mediaAssetId: media_asset.media_asset_id,
      fileName: media_asset.file_name,
      kind: media_asset.kind,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
