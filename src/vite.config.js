import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        auth:    "/index.html",
        scan:    "/scan.html",
        profile: "/profile.html"
      }
    }
  }
});
