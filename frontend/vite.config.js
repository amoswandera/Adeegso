import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current directory and all parent directories
  const env = loadEnv(mode, process.cwd(), '');
  
  // Log environment variables for debugging
  console.log('Vite Environment Variables:', {
    VITE_API_URL: env.VITE_API_URL,
    VITE_WEBSOCKET_URL: env.VITE_WEBSOCKET_URL,
    VITE_BACKEND_URL: env.VITE_BACKEND_URL
  });

  return {
    plugins: [react()],
    server: {
      port: 5173,
      host: '127.0.0.1',
      cors: true,
      proxy: {
        // Proxy API requests to the backend
        '/api': {
          target: env.VITE_BACKEND_URL || 'http://localhost:8000',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, ''),
          configure: (proxy, _options) => {
            proxy.on('error', (err, req, res) => {
              console.error('Proxy Error:', err);
              if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
              }
              res.end(JSON.stringify({ error: 'Proxy Error', details: err.message }));
            });
            
            proxy.on('proxyReq', (proxyReq, req, res) => {
              console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} -> ${proxyReq.path}`);
            });
            
            proxy.on('proxyRes', (proxyRes, req, res) => {
              console.log(`[${new Date().toISOString()}] ${proxyRes.statusCode} ${req.method} ${req.url}`);
            });
          },
        },
        // Proxy WebSocket connections
        '/ws': {
          target: env.VITE_WEBSOCKET_URL || 'ws://localhost:8000',
          ws: true,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path
        }
      },
    },
    define: {
      'process.env': env,
    },
  };
});
