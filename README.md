# opscope-www

The landing page for [opscope](https://github.com/stealth-factory/opscope):
sci-fi hacker panels for your terminal, except every number on them is real.

Try opscope itself with `npx opscope`.

Built with [Astro](https://astro.build). The page is still a placeholder; the
landing page and widget gallery design is in progress.

## Develop

Needs Node 22 or newer.

| Command           | What it does                                  |
| ----------------- | --------------------------------------------- |
| `npm install`     | Install dependencies                          |
| `npm run dev`     | Start the dev server at `localhost:4321`      |
| `npm run build`   | Build the static site into `./dist/`          |
| `npm run preview` | Serve the built site locally before deploying |

## Layout

```text
public/        static files copied as-is (favicon, previews)
src/pages/     one .astro file per page
```

## Licence

To be decided.
