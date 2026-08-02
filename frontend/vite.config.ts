import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // FastAPI dev server (backend/): uvicorn app.main:app --port 8000
    proxy: { "/api": "http://localhost:8000" },
  },
});
