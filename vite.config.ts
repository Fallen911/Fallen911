import { defineConfig, type Plugin } from "vite";

/**
 * Inject a Content-Security-Policy only into production builds — the dev
 * server needs inline styles and websockets for HMR, the shipped app does
 * not. Art is bundled locally (public/bg/), so img-src stays closed.
 */
function cspPlugin(): Plugin {
  return {
    name: "csp-meta",
    apply: "build",
    transformIndexHtml(html) {
      const csp = [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data:",
        "media-src 'self'",
        "connect-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
      ].join("; ");
      return html.replace(
        "<meta charset=\"UTF-8\" />",
        `<meta charset=\"UTF-8\" />\n    <meta http-equiv=\"Content-Security-Policy\" content=\"${csp}\" />`,
      );
    },
  };
}

export default defineConfig({
  plugins: [cspPlugin()],
  base: "./",
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: "es2020",
    outDir: "dist",
  },
});
