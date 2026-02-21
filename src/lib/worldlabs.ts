// World Labs Marble API client

const API_BASE = 'https://api.worldlabs.ai/marble/v1';

export interface WorldPrompt {
  type: 'text' | 'image' | 'multi-image' | 'video';
  text_prompt?: string;
  image_prompt?: {
    source: 'uri' | 'media_asset' | 'data_base64';
    uri?: string;
    media_asset_id?: string;
    data_base64?: string;
  };
  multi_image_prompt?: Array<{
    azimuth: number;
    content: {
      source: 'uri' | 'media_asset' | 'data_base64';
      uri?: string;
      media_asset_id?: string;
      data_base64?: string;
    };
  }>;
  is_pano?: boolean;
  disable_recaption?: boolean;
}

export interface GenerateRequest {
  world_prompt: WorldPrompt;
  display_name?: string;
  model: 'Marble 0.1-mini' | 'Marble 0.1-plus';
  tags?: string[];
  seed?: number;
  permission?: {
    public: boolean;
  };
}

export interface WorldAssets {
  thumbnail_url?: string;
  caption?: string;
  imagery?: {
    pano_url?: string;
  };
  splats?: {
    spz_urls?: Record<string, string>;
  };
  mesh?: {
    collider_mesh_url?: string;
  };
}

export interface World {
  world_id: string;
  display_name: string;
  world_marble_url: string;
  created_at?: string;
  updated_at?: string;
  model?: string;
  tags?: string[];
  assets?: WorldAssets;
  permission?: {
    public: boolean;
  };
}

export interface Operation {
  operation_id: string;
  done: boolean;
  created_at?: string;
  updated_at?: string;
  expires_at?: string;
  metadata?: {
    progress_percentage?: number;
    world_id?: string;
  };
  error?: {
    code?: number;
    message?: string;
  };
  response?: World;
}

export interface MediaAsset {
  media_asset_id: string;
  file_name: string;
  kind: 'image' | 'video';
  extension?: string;
  created_at: string;
}

export interface PrepareUploadResponse {
  media_asset: MediaAsset;
  upload_info: {
    upload_url: string;
    upload_method: string;
    required_headers?: Record<string, string>;
    curl_example?: string;
  };
}

export class WorldLabsClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'WLT-Api-Key': this.apiKey,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`World Labs API error (${response.status}): ${error}`);
    }

    return response.json();
  }

  // Start world generation
  async generateWorld(request: GenerateRequest): Promise<Operation> {
    return this.request<Operation>('/worlds:generate', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Poll operation status
  async getOperation(operationId: string): Promise<Operation> {
    return this.request<Operation>(`/operations/${operationId}`);
  }

  // Get world details
  async getWorld(worldId: string): Promise<World> {
    return this.request<World>(`/worlds/${worldId}`);
  }

  // List worlds
  async listWorlds(options?: {
    page_size?: number;
    page_token?: string;
    status?: 'SUCCEEDED' | 'PENDING' | 'FAILED' | 'RUNNING';
    model?: 'Marble 0.1-mini' | 'Marble 0.1-plus';
  }): Promise<{ worlds: World[]; next_page_token?: string }> {
    return this.request('/worlds:list', {
      method: 'POST',
      body: JSON.stringify(options || {}),
    });
  }

  // Prepare media upload
  async prepareUpload(
    fileName: string,
    kind: 'image' | 'video',
    extension?: string
  ): Promise<PrepareUploadResponse> {
    return this.request<PrepareUploadResponse>('/media-assets:prepare_upload', {
      method: 'POST',
      body: JSON.stringify({
        file_name: fileName,
        kind,
        extension,
      }),
    });
  }

  // Upload file to signed URL
  async uploadFile(
    uploadInfo: PrepareUploadResponse['upload_info'],
    file: ArrayBuffer,
    contentType: string
  ): Promise<void> {
    const headers: Record<string, string> = {
      'Content-Type': contentType,
      ...uploadInfo.required_headers,
    };

    const response = await fetch(uploadInfo.upload_url, {
      method: uploadInfo.upload_method,
      headers,
      body: new Uint8Array(file),
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.request('/');
      return true;
    } catch {
      return false;
    }
  }
}

// Credit costs
export const CREDIT_COSTS = {
  'Marble 0.1-mini': {
    text: 230,
    image_pano: 150,
    image: 230,
    multi_image: 250,
    video: 250,
  },
  'Marble 0.1-plus': {
    text: 1580,
    image_pano: 1500,
    image: 1580,
    multi_image: 1600,
    video: 1600,
  },
} as const;
