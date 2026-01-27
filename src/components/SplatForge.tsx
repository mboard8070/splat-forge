'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Upload, 
  Sparkles, 
  Download, 
  Loader2, 
  Image as ImageIcon,
  Type,
  Zap,
  Crown,
  Package,
  Box,
  Sun,
  Gamepad2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Trash2,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { CREDIT_COSTS } from '@/lib/worldlabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SplatViewer } from '@/components/SplatViewer';
import { UnrealExport } from '@/components/UnrealExport';

interface GenerationJob {
  id: string;
  operationId: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  model: string;
  world?: {
    world_id: string;
    world_marble_url: string;
    assets?: {
      thumbnail_url?: string;
      imagery?: { pano_url?: string };
      splats?: { spz_urls?: Record<string, string> };
      mesh?: { collider_mesh_url?: string };
    };
  };
  error?: string;
  createdAt: string;
}

export function SplatForge() {
  const [mounted, setMounted] = useState(false);
  const [inputType, setInputType] = useState<'image' | 'text'>('image');
  const [quality, setQuality] = useState<'draft' | 'professional'>('draft');

  useEffect(() => {
    setMounted(true);
  }, []);
  const [prompt, setPrompt] = useState('');
  const [name, setName] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isPano, setIsPano] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerTitle, setViewerTitle] = useState('');
  const [unrealExportOpen, setUnrealExportOpen] = useState(false);
  const [unrealExportJob, setUnrealExportJob] = useState<GenerationJob | null>(null);

  // Dropzone setup
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setImagePreview(result);
        // Extract base64 data (remove data URL prefix)
        const base64 = result.split(',')[1];
        setImageBase64(base64);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.webp'],
    },
    maxFiles: 1,
    multiple: false,
  });

  // Poll for job status
  useEffect(() => {
    const pendingJobs = jobs.filter(j => j.status === 'pending' || j.status === 'running');
    if (pendingJobs.length === 0) return;

    const interval = setInterval(async () => {
      for (const job of pendingJobs) {
        try {
          const res = await fetch(`/api/status/${job.operationId}`);
          const data = await res.json();

          setJobs(prev => prev.map(j => {
            if (j.operationId !== job.operationId) return j;

            if (data.error) {
              return { ...j, status: 'failed', error: data.error.message || 'Generation failed' };
            }

            if (data.done && data.world) {
              toast.success(`"${j.name}" is ready!`);
              return { ...j, status: 'completed', progress: 100, world: data.world };
            }

            return { ...j, status: 'running', progress: data.progress || j.progress + 5 };
          }));
        } catch (error) {
          console.error('Polling error:', error);
        }
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [jobs]);

  const handleGenerate = async () => {
    if (inputType === 'image' && !imageBase64) {
      toast.error('Please upload an image first');
      return;
    }
    if (inputType === 'text' && !prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt || undefined,
          imageBase64: inputType === 'image' ? imageBase64 : undefined,
          quality,
          name: name || `Product ${new Date().toLocaleTimeString()}`,
          isPano,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const newJob: GenerationJob = {
        id: crypto.randomUUID(),
        operationId: data.operationId,
        name: name || `Product ${new Date().toLocaleTimeString()}`,
        status: 'pending',
        progress: 0,
        model: data.model,
        createdAt: new Date().toISOString(),
      };

      setJobs(prev => [newJob, ...prev]);
      toast.success('Generation started!');

      // Reset form
      setImagePreview(null);
      setImageBase64(null);
      setPrompt('');
      setName('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const removeJob = (id: string) => {
    setJobs(prev => prev.filter(j => j.id !== id));
  };

  const getCreditCost = () => {
    const model = quality === 'professional' ? 'Marble 0.1-plus' : 'Marble 0.1-mini';
    const costs = CREDIT_COSTS[model];
    if (inputType === 'text') return costs.text;
    if (isPano) return costs.image_pano;
    return costs.image;
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Splat Forge</h1>
              <p className="text-xs text-slate-400">3D Gaussian Splat Generator</p>
            </div>
          </div>
          <Badge variant="outline" className="border-violet-500/50 text-violet-300">
            Powered by World Labs
          </Badge>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Panel - Input */}
          <div className="space-y-6">
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Package className="w-5 h-5 text-violet-400" />
                  Create Product Splat
                </CardTitle>
                <CardDescription>
                  Generate photorealistic 3D splats from product images
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Input Type Tabs */}
                <Tabs value={inputType} onValueChange={(v) => setInputType(v as 'image' | 'text')}>
                  <TabsList className="grid grid-cols-2 bg-slate-800">
                    <TabsTrigger value="image" className="data-[state=active]:bg-violet-600">
                      <ImageIcon className="w-4 h-4 mr-2" />
                      Image
                    </TabsTrigger>
                    <TabsTrigger value="text" className="data-[state=active]:bg-violet-600">
                      <Type className="w-4 h-4 mr-2" />
                      Text Prompt
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="image" className="mt-4 space-y-4">
                    {/* Dropzone */}
                    <div
                      {...getRootProps()}
                      className={cn(
                        "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
                        isDragActive 
                          ? "border-violet-500 bg-violet-500/10" 
                          : "border-slate-700 hover:border-violet-500/50 hover:bg-slate-800/50",
                        imagePreview && "p-4"
                      )}
                    >
                      <input {...getInputProps()} />
                      {imagePreview ? (
                        <div className="relative">
                          <img 
                            src={imagePreview} 
                            alt="Preview" 
                            className="max-h-64 mx-auto rounded-lg"
                          />
                          <Button
                            size="sm"
                            variant="destructive"
                            className="absolute top-2 right-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              setImagePreview(null);
                              setImageBase64(null);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <Upload className="w-12 h-12 mx-auto text-slate-500" />
                          <div>
                            <p className="text-white font-medium">Drop your product image here</p>
                            <p className="text-slate-400 text-sm mt-1">
                              or click to browse • JPG, PNG, WebP
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Pano toggle */}
                    <div className="flex items-center justify-between">
                      <Label htmlFor="isPano" className="text-slate-300">
                        Image is a 360° panorama
                      </Label>
                      <Switch
                        id="isPano"
                        checked={isPano}
                        onCheckedChange={setIsPano}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="text" className="mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="prompt" className="text-slate-300">
                        Describe your product scene
                      </Label>
                      <Input
                        id="prompt"
                        placeholder="A sleek shampoo bottle on a marble bathroom counter with soft morning light..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                      />
                    </div>
                  </TabsContent>
                </Tabs>

                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-300">
                    Project Name
                  </Label>
                  <Input
                    id="name"
                    placeholder="Spring Collection - Body Wash"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                  />
                </div>

                {/* Optional Prompt for Images */}
                {inputType === 'image' && (
                  <div className="space-y-2">
                    <Label htmlFor="imagePrompt" className="text-slate-300">
                      Style Guidance <span className="text-slate-500">(optional)</span>
                    </Label>
                    <Input
                      id="imagePrompt"
                      placeholder="Studio lighting, premium product photography..."
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                    />
                  </div>
                )}

                {/* Quality Toggle */}
                <div className="space-y-3">
                  <Label className="text-slate-300">Quality Level</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setQuality('draft')}
                      className={cn(
                        "p-4 rounded-xl border-2 transition-all text-left",
                        quality === 'draft'
                          ? "border-amber-500 bg-amber-500/10"
                          : "border-slate-700 hover:border-slate-600"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-5 h-5 text-amber-400" />
                        <span className="font-medium text-white">Draft</span>
                      </div>
                      <p className="text-xs text-slate-400">~30 seconds</p>
                      <p className="text-xs text-amber-400 mt-1">~{getCreditCost()} credits</p>
                    </button>
                    <button
                      onClick={() => setQuality('professional')}
                      className={cn(
                        "p-4 rounded-xl border-2 transition-all text-left",
                        quality === 'professional'
                          ? "border-violet-500 bg-violet-500/10"
                          : "border-slate-700 hover:border-slate-600"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Crown className="w-5 h-5 text-violet-400" />
                        <span className="font-medium text-white">Professional</span>
                      </div>
                      <p className="text-xs text-slate-400">~5 minutes</p>
                      <p className="text-xs text-violet-400 mt-1">~{quality === 'professional' ? getCreditCost() : CREDIT_COSTS['Marble 0.1-plus'][inputType === 'text' ? 'text' : isPano ? 'image_pano' : 'image']} credits</p>
                    </button>
                  </div>
                </div>

                {/* Generate Button */}
                <Button
                  size="lg"
                  className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500"
                  onClick={handleGenerate}
                  disabled={isGenerating || (inputType === 'image' && !imageBase64) || (inputType === 'text' && !prompt.trim())}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Starting Generation...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Generate Splat
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Export Info */}
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-lg">Export Formats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Box className="w-4 h-4 text-violet-400" />
                    <span>SPZ / PLY Splats</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Package className="w-4 h-4 text-emerald-400" />
                    <span>Collision Mesh (GLB)</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Sun className="w-4 h-4 text-amber-400" />
                    <span>360° Panorama → HDRI</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Gamepad2 className="w-4 h-4 text-blue-400" />
                    <span>Unreal Engine Ready</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Jobs */}
          <div className="space-y-6">
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-violet-400" />
                    Generation Queue
                  </span>
                  <Badge variant="secondary" className="bg-slate-800">
                    {jobs.filter(j => j.status === 'running' || j.status === 'pending').length} active
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {jobs.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No generations yet</p>
                    <p className="text-sm mt-1">Create your first product splat!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {jobs.map((job) => (
                      <div
                        key={job.id}
                        className={cn(
                          "p-4 rounded-xl border transition-all",
                          job.status === 'completed' && "border-emerald-500/50 bg-emerald-500/5",
                          job.status === 'failed' && "border-red-500/50 bg-red-500/5",
                          (job.status === 'pending' || job.status === 'running') && "border-slate-700 bg-slate-800/50"
                        )}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-medium text-white">{job.name}</h4>
                            <p className="text-xs text-slate-400">
                              {job.model} • {mounted ? new Date(job.createdAt).toLocaleTimeString() : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {job.status === 'completed' && (
                              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/50">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Ready
                              </Badge>
                            )}
                            {job.status === 'failed' && (
                              <Badge className="bg-red-500/20 text-red-300 border-red-500/50">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Failed
                              </Badge>
                            )}
                            {(job.status === 'pending' || job.status === 'running') && (
                              <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/50">
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                Processing
                              </Badge>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 text-slate-500 hover:text-red-400"
                              onClick={() => removeJob(job.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {(job.status === 'pending' || job.status === 'running') && (
                          <Progress value={Math.min(job.progress, 95)} className="h-2 bg-slate-700" />
                        )}

                        {job.status === 'failed' && job.error && (
                          <p className="text-sm text-red-400 mt-2">{job.error}</p>
                        )}

                        {job.status === 'completed' && job.world && (
                          <div className="space-y-3 mt-3">
                            {job.world.assets?.thumbnail_url && (
                              <img 
                                src={job.world.assets.thumbnail_url} 
                                alt={job.name}
                                className="w-full h-32 object-cover rounded-lg"
                              />
                            )}
                            <div className="flex flex-wrap gap-2">
                              {/* View 3D Button - opens splat viewer */}
                              {job.world.assets?.splats?.spz_urls && Object.values(job.world.assets.splats.spz_urls)[0] && (
                                <Button
                                  size="sm"
                                  className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500"
                                  onClick={() => {
                                    const splatUrl = Object.values(job.world!.assets!.splats!.spz_urls!)[0];
                                    setViewerUrl(splatUrl);
                                    setViewerTitle(job.name);
                                    setViewerOpen(true);
                                  }}
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  View 3D
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-slate-600 hover:bg-slate-800"
                                asChild
                              >
                                <a href={job.world.world_marble_url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="w-3 h-3 mr-1" />
                                  View in Marble
                                </a>
                              </Button>
                              {job.world.assets?.splats?.spz_urls && Object.entries(job.world.assets.splats.spz_urls).map(([key, url]) => (
                                <Button
                                  key={key}
                                  size="sm"
                                  variant="outline"
                                  className="border-violet-500/50 text-violet-300 hover:bg-violet-500/20"
                                  asChild
                                >
                                  <a href={url} download>
                                    <Download className="w-3 h-3 mr-1" />
                                    {key.toUpperCase()}
                                  </a>
                                </Button>
                              ))}
                              {job.world.assets?.mesh?.collider_mesh_url && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/20"
                                  asChild
                                >
                                  <a href={job.world.assets.mesh.collider_mesh_url} download>
                                    <Download className="w-3 h-3 mr-1" />
                                    Collider GLB
                                  </a>
                                </Button>
                              )}
                              {job.world.assets?.imagery?.pano_url && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-amber-500/50 text-amber-300 hover:bg-amber-500/20"
                                  asChild
                                >
                                  <a href={job.world.assets.imagery.pano_url} download>
                                    <Download className="w-3 h-3 mr-1" />
                                    360° Pano
                                  </a>
                                </Button>
                              )}
                              {/* Unreal Engine Export */}
                              <Button
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-500 text-white"
                                onClick={() => {
                                  setUnrealExportJob(job);
                                  setUnrealExportOpen(true);
                                }}
                              >
                                <Gamepad2 className="w-3 h-3 mr-1" />
                                UE5 Export
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Integration Guide */}
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <Gamepad2 className="w-5 h-5 text-blue-400" />
                  Unreal Engine Integration
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-400 space-y-2">
                <p>Recommended plugins for importing splats:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong className="text-white">XVERSE</strong> - Free, UE 5.1-5.5</li>
                  <li><strong className="text-white">Volinga</strong> - Paid, UE 5.1-5.6</li>
                  <li><strong className="text-white">Luma AI</strong> - Free, UE 5.1-5.3</li>
                </ul>
                <p className="text-xs mt-3 text-slate-500">
                  Note: World Labs uses OpenCV coordinates. Flip Y and Z axes (-1) when importing to Unreal.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Splat Viewer Modal */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-5xl h-[80vh] bg-slate-950 border-slate-800 p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="text-white flex items-center gap-2">
              <Eye className="w-5 h-5 text-violet-400" />
              {viewerTitle}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 p-4 pt-2">
            {viewerUrl && (
              <SplatViewer 
                splatUrl={viewerUrl} 
                className="w-full h-full min-h-[60vh]"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Unreal Engine Export Modal */}
      <Dialog open={unrealExportOpen} onOpenChange={setUnrealExportOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-950 border-slate-800 p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="text-white flex items-center gap-2">
              <Gamepad2 className="w-5 h-5 text-blue-400" />
              Export to Unreal Engine
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 pt-2">
            {unrealExportJob?.world?.assets && (
              <UnrealExport
                worldName={unrealExportJob.name}
                worldId={unrealExportJob.world.world_id}
                assets={unrealExportJob.world.assets}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
