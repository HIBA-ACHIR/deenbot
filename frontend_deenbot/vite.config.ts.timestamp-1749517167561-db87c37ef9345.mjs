// vite.config.ts
import { defineConfig } from "file:///C:/Users/Hibatallah/Downloads/deenbotfinal/frontend/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/Hibatallah/Downloads/deenbotfinal/frontend/node_modules/@vitejs/plugin-react-swc/index.mjs";
import path from "path";
import { componentTagger } from "file:///C:/Users/Hibatallah/Downloads/deenbotfinal/frontend/node_modules/lovable-tagger/dist/index.js";
var __vite_injected_original_dirname = "C:\\Users\\Hibatallah\\Downloads\\deenbotfinal\\frontend";
var vite_config_default = defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    // Accepte les connexions de toutes les interfaces réseau
    port: 3e3,
    strictPort: false,
    // Allow fallback to another port if 3000 is occupied
    cors: true,
    // Activer CORS pour le serveur de développement
    origin: "*"
    // Allow access from any origin
  },
  preview: {
    host: "0.0.0.0",
    port: 3e3
  },
  plugins: [
    react(),
    mode === "development" && componentTagger()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxIaWJhdGFsbGFoXFxcXERvd25sb2Fkc1xcXFxkZWVuYm90ZmluYWxcXFxcZnJvbnRlbmRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXEhpYmF0YWxsYWhcXFxcRG93bmxvYWRzXFxcXGRlZW5ib3RmaW5hbFxcXFxmcm9udGVuZFxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvSGliYXRhbGxhaC9Eb3dubG9hZHMvZGVlbmJvdGZpbmFsL2Zyb250ZW5kL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcbmltcG9ydCByZWFjdCBmcm9tIFwiQHZpdGVqcy9wbHVnaW4tcmVhY3Qtc3djXCI7XG5pbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xuaW1wb3J0IHsgY29tcG9uZW50VGFnZ2VyIH0gZnJvbSBcImxvdmFibGUtdGFnZ2VyXCI7XG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiAoe1xuICBzZXJ2ZXI6IHtcbiAgICBob3N0OiAnMC4wLjAuMCcsICAvLyBBY2NlcHRlIGxlcyBjb25uZXhpb25zIGRlIHRvdXRlcyBsZXMgaW50ZXJmYWNlcyByXHUwMEU5c2VhdVxuICAgIHBvcnQ6IDMwMDAsXG4gICAgc3RyaWN0UG9ydDogZmFsc2UsIC8vIEFsbG93IGZhbGxiYWNrIHRvIGFub3RoZXIgcG9ydCBpZiAzMDAwIGlzIG9jY3VwaWVkXG4gICAgY29yczogdHJ1ZSwgICAgICAgIC8vIEFjdGl2ZXIgQ09SUyBwb3VyIGxlIHNlcnZldXIgZGUgZFx1MDBFOXZlbG9wcGVtZW50XG4gICAgb3JpZ2luOiAnKicsICAgICAgIC8vIEFsbG93IGFjY2VzcyBmcm9tIGFueSBvcmlnaW5cbiAgfSxcbiAgcHJldmlldzoge1xuICAgIGhvc3Q6ICcwLjAuMC4wJyxcbiAgICBwb3J0OiAzMDAwXG4gIH0sXG4gIHBsdWdpbnM6IFtcbiAgICByZWFjdCgpLFxuICAgIG1vZGUgPT09ICdkZXZlbG9wbWVudCcgJiZcbiAgICBjb21wb25lbnRUYWdnZXIoKSxcbiAgXS5maWx0ZXIoQm9vbGVhbiksXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgXCJAXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9zcmNcIiksXG4gICAgfSxcbiAgfSxcbn0pKTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBdVYsU0FBUyxvQkFBb0I7QUFDcFgsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sVUFBVTtBQUNqQixTQUFTLHVCQUF1QjtBQUhoQyxJQUFNLG1DQUFtQztBQU16QyxJQUFPLHNCQUFRLGFBQWEsQ0FBQyxFQUFFLEtBQUssT0FBTztBQUFBLEVBQ3pDLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sWUFBWTtBQUFBO0FBQUEsSUFDWixNQUFNO0FBQUE7QUFBQSxJQUNOLFFBQVE7QUFBQTtBQUFBLEVBQ1Y7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLE1BQU07QUFBQSxJQUNOLE1BQU07QUFBQSxFQUNSO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTixTQUFTLGlCQUNULGdCQUFnQjtBQUFBLEVBQ2xCLEVBQUUsT0FBTyxPQUFPO0FBQUEsRUFDaEIsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsS0FBSyxLQUFLLFFBQVEsa0NBQVcsT0FBTztBQUFBLElBQ3RDO0FBQUEsRUFDRjtBQUNGLEVBQUU7IiwKICAibmFtZXMiOiBbXQp9Cg==
