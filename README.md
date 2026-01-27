# Splat Forge 🔮

Artist-friendly 3D Gaussian Splat generator powered by [World Labs Marble API](https://worldlabs.ai).

Generate photorealistic 3D splats from product images for use in:
- Unreal Engine
- Unity
- Blender
- Web viewers
- VR/AR experiences

## Features

- **Image-to-Splat** - Upload product photos, get 3D splats
- **Text-to-Splat** - Describe your scene, AI generates it
- **Draft/Professional modes** - Fast previews or production quality
- **Export formats**:
  - SPZ / PLY (Gaussian splats)
  - Collision mesh (GLB)
  - 360° Panorama (→ HDRI)
  - High-quality mesh (GLB)

## Quick Start

### 1. Get API Key

Sign up at [platform.worldlabs.ai](https://platform.worldlabs.ai) and get your API key.

### 2. Configure

```bash
cp .env.example .env
# Edit .env with your WORLDLABS_API_KEY
```

### 3. Run with Docker

```bash
docker compose build
docker compose up -d
```

Open http://localhost:3002

### Alternative: Local Development

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Credit Costs

| Input Type | Draft (~30s) | Professional (~5min) |
|-----------|-------------|---------------------|
| Text | 230 | 1,580 |
| Image (pano) | 150 | 1,500 |
| Image | 230 | 1,580 |
| Multi-image | 250 | 1,600 |
| Video | 250 | 1,600 |

$1 = 1,250 credits

## Unreal Engine Integration

Recommended plugins for importing Gaussian splats:

| Plugin | Price | UE Version |
|--------|-------|------------|
| [XVERSE](https://github.com/xverse-engine/xverse-ue-plugin) | Free | 5.1-5.5 |
| [Volinga](https://volinga.ai) | Paid | 5.1-5.6 |
| [Luma AI](https://lumalabs.ai/unreal) | Free | 5.1-5.3 |

### Coordinate System Note

World Labs uses OpenCV coordinates (+x left, +y down, +z forward).
Most DCC software uses OpenGL coordinates.

**To convert:** Scale Y and Z axes by -1 (keep X unchanged).

## HDRI from Panorama

The 360° panorama export (2560×1280 equirectangular PNG) can be converted to HDRI for lighting:

1. Download the panorama
2. Import into Blender/Photoshop
3. Convert to .hdr/.exr format
4. Use as environment map

## Tech Stack

- Next.js 15
- Tailwind CSS v4
- shadcn/ui
- World Labs Marble API

## License

MIT
