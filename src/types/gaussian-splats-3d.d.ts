declare module '@mkkellogg/gaussian-splats-3d' {
  export enum LogLevel {
    None = 0,
    Error = 1,
    Warning = 2,
    Info = 3,
    Debug = 4
  }

  export interface ViewerOptions {
    rootElement?: HTMLElement | null;
    cameraUp?: [number, number, number];
    initialCameraPosition?: [number, number, number];
    initialCameraLookAt?: [number, number, number];
    selfDrivenMode?: boolean;
    useBuiltInControls?: boolean;
    dynamicScene?: boolean;
    sharedMemoryForWorkers?: boolean;
    antialiased?: boolean;
    focalAdjustment?: number;
    logLevel?: LogLevel;
  }

  export interface SplatSceneOptions {
    progressiveLoad?: boolean;
    onProgress?: (progress: number) => void;
  }

  export class Viewer {
    constructor(options?: ViewerOptions);
    addSplatScene(url: string, options?: SplatSceneOptions): Promise<void>;
    start(): Promise<void>;
    dispose(): void;
    camera?: {
      position: {
        set(x: number, y: number, z: number): void;
      };
      lookAt(x: number, y: number, z: number): void;
    };
  }
}
