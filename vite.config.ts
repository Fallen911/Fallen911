import { defineConfig, type Plugin } from "vite";

/**
 * Inject a Content-Security-Policy only into production builds — the dev
 * server needs inline styles and websockets for HMR, the shipped app does
 * not. Images stay open to the art CDN until fetch-art.mjs localizes them.
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
        "img-src 'self' data: https://d8j0ntlcm91z4.cloudfront.net",
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
