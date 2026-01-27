import { SplatForge } from '@/components/SplatForge';
import { Toaster } from '@/components/ui/sonner';

export default function Home() {
  return (
    <>
      <SplatForge />
      <Toaster 
        position="bottom-right" 
        theme="dark"
        toastOptions={{
          style: {
            background: '#1e293b',
            border: '1px solid #334155',
          },
        }}
      />
    </>
  );
}
