# 23skdu.github.io

Personal site of [@23skdu](https://github.com/23skdu), hosted on GitHub Pages.

- Built with [Three.js](https://threejs.org/) (WebGL) hero scene
- Neon aesthetic: grid, bloom, glitch typography
- Live project index pulled from the GitHub REST API, with a static fallback in `data/projects.json`
- Responsive, accessible (skip link, focus styles, reduced-motion support), SEO meta tags

## Develop

Static site — no build step. Serve locally:

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000.

### Local preview with Jekyll (Docker)

A Jekyll server is provided for a GitHub-Pages-like local preview:

```sh
make serve            # or ./scripts/serve.sh
```

The script is branch-aware: each branch gets a deterministic port in the
4000-4099 range (override with `PORT=4001 make serve`), so multiple
branches/worktrees can be previewed simultaneously. The image is built on
first run.

## Deploy

Push to `main`; GitHub Pages publishes automatically (`.nojekyll` disables Jekyll processing).
