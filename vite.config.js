import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "dashboard-build",
    rollupOptions: {
      input: {
        index: fileURLToPath(new URL("./index.html", import.meta.url)),
        internal: fileURLToPath(new URL("./dashboards/internal-pages/index.html", import.meta.url)),
        external: fileURLToPath(new URL("./dashboards/external-pages/index.html", import.meta.url)),
        documents: fileURLToPath(new URL("./dashboards/documents/index.html", import.meta.url)),
      },
    },
  },
});