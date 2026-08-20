/* Tailwind config for the static pages.
   These three values used to live inline in index.html, next to the Play CDN
   script tag. The CDN is gone — the stylesheet is built ahead of time now —
   so the config has to live somewhere the build can read it.

   Not to be confused with ../tailwind.config.ts, which is Next.js scaffolding
   the app has never used: it scans ./src and paints the brand blue.

   Paths are relative to the repository root, where npm runs the script. */
module.exports = {
  content: [
    './index.html',
    './droit-de-timbre.html',
    './montant-en-lettres.html',
    './international.html',
    './*.js',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: { 500: '#059669', 600: '#006233', 700: '#00512a' },
      },
    },
  },
  plugins: [],
}
