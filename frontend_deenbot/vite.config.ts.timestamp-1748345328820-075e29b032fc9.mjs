// vite.config.ts
import { defineConfig } from "file:///C:/Users/Hibatallah/deenbot/frontend_deenbot/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/Hibatallah/deenbot/frontend_deenbot/node_modules/@vitejs/plugin-react-swc/index.mjs";
import path from "path";
import { componentTagger } from "file:///C:/Users/Hibatallah/deenbot/frontend_deenbot/node_modules/lovable-tagger/dist/index.js";
var __vite_injected_original_dirname = "C:\\Users\\Hibatallah\\deenbot\\frontend_deenbot";
var vite_config_default = defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    // Accepte les connexions de toutes les interfaces réseau
    port: 8080,
    strictPort: true,
    // Ne pas chercher un autre port si 8080 est occupé
    cors: true
    // Activer CORS pour le serveur de développement
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxIaWJhdGFsbGFoXFxcXGRlZW5ib3RcXFxcZnJvbnRlbmRfZGVlbmJvdFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcSGliYXRhbGxhaFxcXFxkZWVuYm90XFxcXGZyb250ZW5kX2RlZW5ib3RcXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL0hpYmF0YWxsYWgvZGVlbmJvdC9mcm9udGVuZF9kZWVuYm90L3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcbmltcG9ydCByZWFjdCBmcm9tIFwiQHZpdGVqcy9wbHVnaW4tcmVhY3Qtc3djXCI7XG5pbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xuaW1wb3J0IHsgY29tcG9uZW50VGFnZ2VyIH0gZnJvbSBcImxvdmFibGUtdGFnZ2VyXCI7XG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiAoe1xuICBzZXJ2ZXI6IHtcbiAgICBob3N0OiBcIjAuMC4wLjBcIiwgIC8vIEFjY2VwdGUgbGVzIGNvbm5leGlvbnMgZGUgdG91dGVzIGxlcyBpbnRlcmZhY2VzIHJcdTAwRTlzZWF1XG4gICAgcG9ydDogODA4MCxcbiAgICBzdHJpY3RQb3J0OiB0cnVlLCAgLy8gTmUgcGFzIGNoZXJjaGVyIHVuIGF1dHJlIHBvcnQgc2kgODA4MCBlc3Qgb2NjdXBcdTAwRTlcbiAgICBjb3JzOiB0cnVlLCAgICAgICAgLy8gQWN0aXZlciBDT1JTIHBvdXIgbGUgc2VydmV1ciBkZSBkXHUwMEU5dmVsb3BwZW1lbnRcbiAgfSxcbiAgcGx1Z2luczogW1xuICAgIHJlYWN0KCksXG4gICAgbW9kZSA9PT0gJ2RldmVsb3BtZW50JyAmJlxuICAgIGNvbXBvbmVudFRhZ2dlcigpLFxuICBdLmZpbHRlcihCb29sZWFuKSxcbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiB7XG4gICAgICBcIkBcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL3NyY1wiKSxcbiAgICB9LFxuICB9LFxufSkpO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFnVSxTQUFTLG9CQUFvQjtBQUM3VixPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVO0FBQ2pCLFNBQVMsdUJBQXVCO0FBSGhDLElBQU0sbUNBQW1DO0FBTXpDLElBQU8sc0JBQVEsYUFBYSxDQUFDLEVBQUUsS0FBSyxPQUFPO0FBQUEsRUFDekMsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixZQUFZO0FBQUE7QUFBQSxJQUNaLE1BQU07QUFBQTtBQUFBLEVBQ1I7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLE1BQU07QUFBQSxJQUNOLFNBQVMsaUJBQ1QsZ0JBQWdCO0FBQUEsRUFDbEIsRUFBRSxPQUFPLE9BQU87QUFBQSxFQUNoQixTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxLQUFLLEtBQUssUUFBUSxrQ0FBVyxPQUFPO0FBQUEsSUFDdEM7QUFBQSxFQUNGO0FBQ0YsRUFBRTsiLAogICJuYW1lcyI6IFtdCn0K
