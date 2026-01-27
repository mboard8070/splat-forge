'use client';

import { useState } from 'react';
import { 
  Download, 
  Gamepad2, 
  Package, 
  Box, 
  AlertTriangle,
  Check,
  Copy,
  ExternalLink,
  FileCode,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface UnrealExportProps {
  worldName: string;
  assets: {
    splats?: { spz_urls?: Record<string, string> };
    mesh?: { collider_mesh_url?: string };
    imagery?: { pano_url?: string };
  };
  worldId: string;
}

// World Labs CDN URL patterns for PLY files (derived from SPZ URLs)
function getSplatUrls(spzUrls: Record<string, string> | undefined) {
  if (!spzUrls) return { spz: {}, ply: {} };
  
  const spz: Record<string, string> = {};
  const ply: Record<string, string> = {};
  
  Object.entries(spzUrls).forEach(([key, url]) => {
    spz[key] = url;
    // Convert SPZ URL to PLY URL (same path, different extension)
    ply[key] = url.replace('.spz', '.ply');
  });
  
  return { spz, ply };
}

export function UnrealExport({ worldName, assets, worldId }: UnrealExportProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const { spz, ply } = getSplatUrls(assets.splats?.spz_urls);

  const copyCoordinateCode = () => {
    const code = `// Coordinate conversion for World Labs splats in Unreal Engine
// Apply this transform when importing or in your Blueprint/C++

// Option 1: Scale transform (flip Y and Z)
FVector ConvertWorldLabsToUnreal(FVector WorldLabsPos) {
    return FVector(
        WorldLabsPos.X,      // X stays the same
        -WorldLabsPos.Y,     // Flip Y
        -WorldLabsPos.Z      // Flip Z
    );
}

// Option 2: Import settings
// When importing PLY/GLB, set scale to (1, -1, -1)`;
    
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    toast.success('Code copied to clipboard');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const downloadAll = async () => {
    // Download PLY (high res), Collider mesh, and pano
    const downloads: { url: string; name: string }[] = [];
    
    // Get the first PLY URL (usually 2m version)
    const plyEntries = Object.entries(ply);
    if (plyEntries.length > 0) {
      const [key, url] = plyEntries[0];
      downloads.push({ url, name: `${worldName}_splat_${key}.ply` });
    }
    
    if (assets.mesh?.collider_mesh_url) {
      downloads.push({ url: assets.mesh.collider_mesh_url, name: `${worldName}_collider.glb` });
    }
    
    if (assets.imagery?.pano_url) {
      downloads.push({ url: assets.imagery.pano_url, name: `${worldName}_hdri.png` });
    }

    toast.info(`Starting ${downloads.length} downloads...`);
    
    for (const { url, name } of downloads) {
      const link = document.createElement('a');
      link.href = url;
      link.download = name;
      link.click();
      await new Promise(r => setTimeout(r, 500)); // Stagger downloads
    }
  };

  return (
    <Card className="bg-slate-900/80 border-slate-700">
      <CardHeader className="pb-4">
        <CardTitle className="text-white flex items-center gap-2">
          <Gamepad2 className="w-5 h-5 text-blue-400" />
          Unreal Engine Export
        </CardTitle>
        <CardDescription>
          Export assets optimized for Unreal Engine 5
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Export */}
        <div className="p-4 bg-gradient-to-r from-blue-500/10 to-violet-500/10 rounded-xl border border-blue-500/30">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-white">Quick Export Bundle</h4>
            <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/50">
              Recommended
            </Badge>
          </div>
          <p className="text-sm text-slate-400 mb-4">
            Downloads PLY splat, collision mesh, and HDRI panorama in one click
          </p>
          <Button 
            onClick={downloadAll}
            className="w-full bg-blue-600 hover:bg-blue-500"
          >
            <Download className="w-4 h-4 mr-2" />
            Download UE5 Bundle
          </Button>
        </div>

        {/* Individual Downloads */}
        <Tabs defaultValue="splats" className="w-full">
          <TabsList className="grid grid-cols-3 bg-slate-800">
            <TabsTrigger value="splats" className="data-[state=active]:bg-violet-600">
              <Layers className="w-4 h-4 mr-1" />
              Splats
            </TabsTrigger>
            <TabsTrigger value="mesh" className="data-[state=active]:bg-emerald-600">
              <Box className="w-4 h-4 mr-1" />
              Mesh
            </TabsTrigger>
            <TabsTrigger value="hdri" className="data-[state=active]:bg-amber-600">
              <Package className="w-4 h-4 mr-1" />
              HDRI
            </TabsTrigger>
          </TabsList>

          <TabsContent value="splats" className="mt-4 space-y-3">
            <p className="text-xs text-slate-400">
              PLY format is recommended for Unreal Engine plugins
            </p>
            <div className="grid gap-2">
              {Object.entries(ply).map(([key, url]) => (
                <Button
                  key={key}
                  variant="outline"
                  className="justify-between border-violet-500/50 text-violet-300 hover:bg-violet-500/20"
                  asChild
                >
                  <a href={url} download>
                    <span className="flex items-center">
                      <Download className="w-4 h-4 mr-2" />
                      PLY ({key})
                    </span>
                    <Badge variant="secondary" className="bg-slate-800 text-xs">
                      {key.includes('2m') ? '~50MB' : '~15MB'}
                    </Badge>
                  </a>
                </Button>
              ))}
              {Object.entries(spz).map(([key, url]) => (
                <Button
                  key={`spz-${key}`}
                  variant="outline"
                  className="justify-between border-slate-600 text-slate-400 hover:bg-slate-800"
                  asChild
                >
                  <a href={url} download>
                    <span className="flex items-center">
                      <Download className="w-4 h-4 mr-2" />
                      SPZ ({key})
                    </span>
                    <Badge variant="secondary" className="bg-slate-800 text-xs">
                      Compressed
                    </Badge>
                  </a>
                </Button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="mesh" className="mt-4 space-y-3">
            <p className="text-xs text-slate-400">
              GLB collision mesh for physics interactions
            </p>
            {assets.mesh?.collider_mesh_url ? (
              <Button
                variant="outline"
                className="w-full justify-between border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/20"
                asChild
              >
                <a href={assets.mesh.collider_mesh_url} download>
                  <span className="flex items-center">
                    <Download className="w-4 h-4 mr-2" />
                    Collider Mesh (GLB)
                  </span>
                  <Badge variant="secondary" className="bg-slate-800 text-xs">
                    100-200k tris
                  </Badge>
                </a>
              </Button>
            ) : (
              <p className="text-sm text-slate-500">Collision mesh not available</p>
            )}
            <div className="p-3 bg-slate-800/50 rounded-lg text-xs text-slate-400">
              <strong className="text-white">Tip:</strong> Import GLB directly into UE5 as a Static Mesh.
              Use for collision volumes and simple physics.
            </div>
          </TabsContent>

          <TabsContent value="hdri" className="mt-4 space-y-3">
            <p className="text-xs text-slate-400">
              360° panorama for environment lighting
            </p>
            {assets.imagery?.pano_url ? (
              <>
                <Button
                  variant="outline"
                  className="w-full justify-between border-amber-500/50 text-amber-300 hover:bg-amber-500/20"
                  asChild
                >
                  <a href={assets.imagery.pano_url} download>
                    <span className="flex items-center">
                      <Download className="w-4 h-4 mr-2" />
                      360° Panorama (PNG)
                    </span>
                    <Badge variant="secondary" className="bg-slate-800 text-xs">
                      2560×1280
                    </Badge>
                  </a>
                </Button>
                <div className="p-3 bg-slate-800/50 rounded-lg text-xs text-slate-400">
                  <strong className="text-white">Convert to HDRI:</strong>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Open in Photoshop/GIMP</li>
                    <li>Adjust exposure if needed</li>
                    <li>Export as .hdr or .exr (32-bit)</li>
                    <li>Use as Sky Light cubemap in UE5</li>
                  </ol>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500">Panorama not available</p>
            )}
          </TabsContent>
        </Tabs>

        {/* Coordinate System Warning */}
        <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/30">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-300 mb-1">Coordinate System</h4>
              <p className="text-sm text-slate-400 mb-3">
                World Labs uses OpenCV coordinates. Apply scale transform <code className="text-amber-300">(1, -1, -1)</code> when importing.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="border-amber-500/50 text-amber-300 hover:bg-amber-500/20"
                onClick={copyCoordinateCode}
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3 h-3 mr-1" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 mr-1" />
                    Copy UE5 Transform Code
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Plugin Recommendations */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-white">Recommended Plugins</h4>
          <div className="grid gap-2">
            <a 
              href="https://github.com/xverse-engine/xverse-ue-plugin"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <div>
                <p className="font-medium text-white">XVERSE</p>
                <p className="text-xs text-slate-400">Free • UE 5.1-5.5</p>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-500" />
            </a>
            <a 
              href="https://volinga.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <div>
                <p className="font-medium text-white">Volinga</p>
                <p className="text-xs text-slate-400">Paid • UE 5.1-5.6</p>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-500" />
            </a>
            <a 
              href="https://lumalabs.ai/unreal"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <div>
                <p className="font-medium text-white">Luma AI</p>
                <p className="text-xs text-slate-400">Free • UE 5.1-5.3</p>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-500" />
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
