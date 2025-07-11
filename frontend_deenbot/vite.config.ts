import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: '0.0.0.0',  // Accepte les connexions de toutes les interfaces réseau
    port: 3000,
    strictPort: false, // Allow fallback to another port if 3000 is occupied
    cors: true,        // Activer CORS pour le serveur de développement
    origin: '*',       // Allow access from any origin
  },
  preview: {
    host: '0.0.0.0',
    port: 3000
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
