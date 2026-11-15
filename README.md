# 23skdu.github.io

Personal site of [@23skdu](https://github.com/23skdu), hosted on GitHub Pages.

- Built with [Three.js](https://threejs.org/) (WebGL) hero scene
- Cyberpunk aesthetic: neon grid, bloom, glitch typography
- Live project index pulled from the GitHub REST API, with a static fallback in `data/projects.json`
- Responsive, accessible (skip link, focus styles, reduced-motion support), SEO meta tags

## Develop

Static site — no build step. Serve locally:

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Deploy

Push to `main`; GitHub Pages publishes automatically (`.nojekyll` disables Jekyll processing).