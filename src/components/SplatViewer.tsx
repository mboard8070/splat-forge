'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Maximize2, Minimize2, RotateCcw, Move3D } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SplatViewerProps {
  splatUrl: string;
  className?: string;
}

export function SplatViewer({ splatUrl, className }: SplatViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<any>(null);
  const sceneRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const splatRef = useRef<any>(null);
  const animationRef = useRef<number | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !splatUrl) return;

    let mounted = true;
    const container = containerRef.current;

    const initViewer = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Dynamic imports for Three.js and Spark
        const THREE = await import('three');
        const { SplatMesh } = await import('@sparkjsdev/spark');
        const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');

        if (!mounted || !container) return;

        // Setup renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(0x0f0f1a, 1);
        container.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Setup scene
        const scene = new THREE.Scene();
        sceneRef.current = scene;

        // Setup camera
        const camera = new THREE.PerspectiveCamera(
          60,
          container.clientWidth / container.clientHeight,
          0.1,
          1000
        );
        camera.position.set(0, 0, 3);
        cameraRef.current = camera;

        // Setup controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.target.set(0, 0, 0);

        // Proxy the URL to avoid CORS
        const proxiedUrl = `/api/proxy?url=${encodeURIComponent(splatUrl)}`;

        // Load splat
        const splat = new SplatMesh({ url: proxiedUrl });
        
        // World Labs uses OpenCV coords - rotate to fix orientation
        splat.quaternion.set(1, 0, 0, 0); // 180 degree rotation around X
        
        scene.add(splat);
        splatRef.current = splat;

        // Wait for splat to load
        await new Promise<void>((resolve, reject) => {
          const checkLoaded = () => {
            if (!mounted) {
              reject(new Error('Unmounted'));
              return;
            }
            // SplatMesh should be ready after a few frames
            setTimeout(() => {
              if (mounted) resolve();
            }, 1000);
          };
          checkLoaded();
        });

        if (!mounted) return;
        setIsLoading(false);

        // Animation loop
        const animate = () => {
          if (!mounted) return;
          animationRef.current = requestAnimationFrame(animate);
          controls.update();
          renderer.render(scene, camera);
        };
        animate();

        // Handle resize
        const handleResize = () => {
          if (!container || !mounted) return;
          const width = container.clientWidth;
          const height = container.clientHeight;
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height);
        };
        window.addEventListener('resize', handleResize);

        return () => {
          window.removeEventListener('resize', handleResize);
        };

      } catch (err) {
        console.error('Splat viewer error:', err);
        if (mounted) {
          const msg = err instanceof Error ? err.message : 'Failed to load splat';
          if (!msg.includes('Unmounted')) {
            setError(msg);
          }
          setIsLoading(false);
        }
      }
    };

    initViewer();

    return () => {
      mounted = false;
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
      if (splatRef.current && sceneRef.current) {
        sceneRef.current.remove(splatRef.current);
      }
      
      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (rendererRef.current.domElement && container.contains(rendererRef.current.domElement)) {
          container.removeChild(rendererRef.current.domElement);
        }
      }
    };
  }, [splatUrl]);

  const handleReset = () => {
    if (cameraRef.current) {
      cameraRef.current.position.set(0, 0, 3);
      cameraRef.current.lookAt(0, 0, 0);
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
      <div 
        ref={containerRef} 
        className="w-full h-full min-h-[300px]"
        style={{ background: 'radial-gradient(ellipse at center, #1a1a2e 0%, #0f0f1a 100%)' }}
      />

      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-sm">
          <Loader2 className="w-10 h-10 text-violet-400 animate-spin mb-4" />
          <p className="text-white font-medium">Loading Splat...</p>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90">
          <p className="text-red-400 font-medium">Failed to load splat</p>
          <p className="text-slate-500 text-sm mt-1 max-w-md text-center px-4">{error}</p>
        </div>
      )}

      {!isLoading && !error && (
        <>
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
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
          </div>

          <div className="absolute bottom-3 left-3 flex items-center gap-2 text-xs text-slate-500">
            <Move3D className="w-4 h-4" />
            <span>Drag to rotate • Scroll to zoom • Right-drag to pan</span>
          </div>
        </>
      )}
    </div>
  );
}
