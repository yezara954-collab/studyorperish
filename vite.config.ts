import { defineConfig } from "vite";
import paths from "./src/sigil.json";
import site from "./src/site.json";

export default defineConfig({
  base: "./",
  plugins: [
    {
      name: "site-metadata",
      generateBundle() {
        if (site.faviconPath === "./favicon.svg") {
          const title = site.siteNameEn
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;");
          this.emitFile({
            type: "asset",
            fileName: "favicon.svg",
            source: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" fill="none" stroke="${site.themeColor}"><title>${title}</title>${paths.map((d) => `<path d="${d}"/>`).join("")}</svg>`,
          });
        }
      },
      transformIndexHtml(html) {
        return html
          .replace("__SITE_NAME__", site.siteNameEn)
          .replace("__THEME__", site.themeColor)
          .replace("__ICON__", site.faviconPath);
      },
    },
  ],
  build: { outDir: "docs" },
});
