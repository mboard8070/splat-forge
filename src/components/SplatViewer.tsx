'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Loader2, Maximize2, Minimize2, RotateCcw, Move3D } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SplatViewerProps {
  splatUrl: string;
  className?: string;
  onClose?: () => void;
}

export function SplatViewer({ splatUrl, className, onClose }: SplatViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerContainerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const mountedRef = useRef(true);

  const cleanupViewer = useCallback(() => {
    if (viewerRef.current) {
      try {
        viewerRef.current.dispose();
      } catch (e) {
        // Ignore dispose errors
      }
      viewerRef.current = null;
    }
    // Manually clear the viewer container
    if (viewerContainerRef.current) {
      viewerContainerRef.current.innerHTML = '';
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    
    if (!containerRef.current || !splatUrl) return;

    // Create a separate container for the viewer
    const viewerContainer = document.createElement('div');
    viewerContainer.style.width = '100%';
    viewerContainer.style.height = '100%';
    containerRef.current.appendChild(viewerContainer);
    viewerContainerRef.current = viewerContainer;

    const initViewer = async () => {
      try {
        if (!mountedRef.current) return;
        
        setIsLoading(true);
        setError(null);

        // Dynamically import to avoid SSR issues
        const GaussianSplats3D = await import('@mkkellogg/gaussian-splats-3d');
        
        if (!mountedRef.current || !viewerContainerRef.current) return;

        // Create viewer
        const viewer = new GaussianSplats3D.Viewer({
          rootElement: viewerContainerRef.current,
          cameraUp: [0, -1, 0],
          initialCameraPosition: [0, 0, 5],
          initialCameraLookAt: [0, 0, 0],
          selfDrivenMode: true,
          useBuiltInControls: true,
          dynamicScene: false,
          sharedMemoryForWorkers: false,
          antialiased: true,
          focalAdjustment: 1.0,
          logLevel: GaussianSplats3D.LogLevel.None,
        });

        viewerRef.current = viewer;

        // Load the splat
        await viewer.addSplatScene(splatUrl, {
          progressiveLoad: true,
          onProgress: (progress: number) => {
            if (mountedRef.current) {
              setLoadProgress(Math.round(progress * 100));
            }
          },
        });

        if (!mountedRef.current) {
          cleanupViewer();
          return;
        }

        await viewer.start();
        
        if (mountedRef.current) {
          setIsLoading(false);
        }
      } catch (err) {
        // Ignore "Scene disposed" errors - they happen during normal cleanup
        const errorMessage = err instanceof Error ? err.message : String(err);
        if (errorMessage.includes('disposed')) {
          return;
        }
        console.error('Splat viewer error:', err);
        if (mountedRef.current) {
          setError(errorMessage || 'Failed to load splat');
          setIsLoading(false);
        }
      }
    };

    initViewer();

    return () => {
      mountedRef.current = false;
      cleanupViewer();
      // Remove the viewer container from DOM
      if (viewerContainerRef.current && containerRef.current) {
        try {
          containerRef.current.removeChild(viewerContainerRef.current);
        } catch (e) {
          // Ignore if already removed
        }
        viewerContainerRef.current = null;
      }
    };
  }, [splatUrl, cleanupViewer]);

  const handleReset = () => {
    if (viewerRef.current?.camera) {
      viewerRef.current.camera.position.set(0, 0, 5);
      viewerRef.current.camera.lookAt(0, 0, 0);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div 
      className={cn(
        "relative bg-slate-950 rounded-xl overflow-hidden",
        className
      )}
    >
      {/* Viewer container */}
      <div 
        ref={containerRef} 
        className="w-full h-full min-h-[300px]"
        style={{ background: 'radial-gradient(ellipse at center, #1a1a2e 0%, #0f0f1a 100%)' }}
      />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-sm">
          <Loader2 className="w-10 h-10 text-violet-400 animate-spin mb-4" />
          <p className="text-white font-medium">Loading Splat</p>
          <p className="text-slate-400 text-sm mt-1">{loadProgress}%</p>
          <div className="w-48 h-2 bg-slate-800 rounded-full mt-3 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-300"
              style={{ width: `${loadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90">
          <p className="text-red-400 font-medium">Failed to load splat</p>
          <p className="text-slate-500 text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Controls */}
      {!isLoading && !error && (
        <div className="absolute top-3 right-3 flex gap-2">
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8 bg-slate-800/80 hover:bg-slate-700 backdrop-blur"
            onClick={handleReset}
            title="Reset view"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8 bg-slate-800/80 hover:bg-slate-700 backdrop-blur"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </Button>
        </div>
      )}

      {/* Controls hint */}
      {!isLoading && !error && (
        <div className="absolute bottom-3 left-3 flex items-center gap-2 text-xs text-slate-500">
          <Move3D className="w-4 h-4" />
          <span>Drag to rotate • Scroll to zoom • Shift+drag to pan</span>
        </div>
      )}
    </div>
  );
}
