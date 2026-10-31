# opscope-www

The landing page for [opscope](https://github.com/stealth-factory/opscope):
sci-fi hacker panels for your terminal, except every number on them is real.

Try opscope itself with `npx opscope`.

Built with [Astro](https://astro.build). The whole page is a terminal screen:
a shell pane with the pitch and install commands beside panes running widgets,
a `2:widgets` window that shows all 17 with group filters and type-to-filter,
and a tmux-style status line that switches windows and terminal colour themes
(Catppuccin Mocha, Tokyo Night, Gruvbox Dark).

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
public/previews/   widget previews, picked up by name (see its README)
src/data/          widget list and terminal themes
src/components/    Pane.astro, one widget pane
src/layouts/       page shell, theme CSS variables
src/pages/         index.astro
```

### Adding a widget preview

Put `public/previews/<widget>.mp4` (or `.gif`, `.webp`, `.jpg`, `.png`) in place
and rebuild. A still with the same name becomes the video's poster.

## Licence

To be decided.
