# opscope-www

The landing page for [opscope](https://github.com/stealth-factory/opscope):
sci-fi hacker panels for your terminal, except every number on them is real.

Try opscope itself with `npx opscope`.

Built with [Astro](https://astro.build). The whole page is a terminal screen:
a `1:factory` window with the pitch and install commands beside six panes of
software-factory widgets, a `2:dashboard` window of six everyday panes (both
sets live in `screens` in `src/data/widgets.ts`), a `3:widgets` window that
shows all 17 with group filters and type-to-filter,
and a tmux-style status line that switches windows and picks one of 50 colour
themes (`src/data/themes.ts`; opscope Dusk is the default, `?theme=<id>` links
to another).

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
src/data/          widget list and terminal themes
src/scripts/       tui.ts (text-mode kit) and demos.ts (one demo per widget)
src/components/    Pane.astro, one widget pane
src/layouts/       page shell, theme CSS variables
src/pages/         index.astro
```

### Widget demos

Each pane runs a text-mode demo of its widget, drawn in the browser from
`src/scripts/demos.ts` with made-up numbers. Layouts follow the widgets' own
README mock-ups. A demo only animates while its pane is on screen, and shows a
still frame when the visitor prefers reduced motion. To add a widget, add it to
`src/data/widgets.ts` and give it a function in `demos.ts`.

## Licence

To be decided.
