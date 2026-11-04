# opscope-www

The landing page for [opscope](https://github.com/stealth-factory/opscope):
sci-fi hacker panels for your terminal, except every number on them is real.

Try opscope itself with `npx opscope`.

Built with [Astro](https://astro.build). The whole page is a terminal screen:
a `1:factory` window with the pitch and install commands beside six panes of
software-factory widgets, a `2:dashboard` window of eight panes, four across (both
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
| `npm run og`      | Redraw `public/og.png` and the touch icon     |

### Social card

`public/og.png` (1200×630) is a screenshot of `src/pages/[og].astro`, a page
that only exists in dev (it builds to nothing). It reuses the real widget
demos, with the clock frozen so each run comes out the same. Edit the page,
then run `npm run og`. That needs a Chromium for Playwright
(`npx playwright install chromium`).

## Layout

```text
src/data/          widget list and terminal themes
src/scripts/       tui.ts (text-mode kit) and demos.ts (one demo per widget)
src/components/    Pane.astro, one widget pane
src/layouts/       page shell, theme CSS variables
src/pages/         index.astro
```

### The shell

The shell pane ends in a real terminal emulator, [wterm](https://github.com/vercel-labs/wterm)
(`@wterm/dom`), running a small pretend shell in `src/scripts/shell.ts`: `help`,
`ls`, `opscope <widget>` (runs that widget's demo full-pane, `q` quits),
`theme <name>`, `install`, `about`, `docs`, `clear`, tab completion and
history. Nothing runs on a server. Its ANSI colours are mapped to the page
theme in `global.css` (`.term`), so it follows the theme picker.

### Widget demos

Each pane runs a text-mode demo of its widget, drawn in the browser from
`src/scripts/demos.ts` with made-up numbers. Layouts follow the widgets' own
README mock-ups. A demo only animates while its pane is on screen, and shows a
still frame when the visitor prefers reduced motion. To add a widget, add it to
`src/data/widgets.ts` and give it a function in `demos.ts`.

## Analytics

Events go through one function, `track()` in `src/lib/analytics.ts`, which
sends each one to every provider that is on:

- **Vercel Web Analytics:** always (`<Analytics />` in `Base.astro`).
- **Google Analytics 4:** only when `PUBLIC_GA_MEASUREMENT_ID` (a `G-…` ID) is
  set at build time. Set it in Vercel for **Production only**, so previews
  and local builds stay out of GA. With it unset, gtag.js is not loaded.
  To see event data in GA's standard reports, register its keys (`window`,
  `via`, `widget`, `part`, `group`, `theme`, `from`, `action`, `command`,
  `link`) as event-scoped custom dimensions.

Both count page views on their own. `src/scripts/analytics.ts` decides what
the page reports:

| Event            | Data                                                | When                                                               |
| ---------------- | --------------------------------------------------- | ------------------------------------------------------------------ |
| `outbound_click` | `link`, `widget` (widget docs only)                 | a GitHub, npm, install or widget-docs link                         |
| `window_view`    | `window`, `via` (tab / pane / history / link)       | switching factory / dashboard / widgets, or landing on one by link |
| `widget_click`   | `widget`, `part` (bar / demo), `window`             | a click on a widget pane's title bar or live demo                  |
| `widget_run`     | `widget`, `via` (pane / shell)                      | a widget demo starts                                               |
| `widget_filter`  | `group`                                             | a gallery group chip                                               |
| `widget_search`  | `query` (40 chars at most), `results`               | gallery search, once typing stops                                  |
| `theme_menu`     | `action` (open / dismiss), `theme` (the chosen one) | the theme menu opens, or closes without a pick                     |
| `theme_select`   | `theme`, `via` (menu / shell / link), `from`        | a theme is picked, or arriving on `?theme=`                        |
| `shell_focus`    | none                                                | the first click into the shell, once per page view                 |
| `shell_command`  | `command` (its name, else `unknown`)                | a command in the shell                                             |
| `command_copy`   | `command`                                           | copying an `npx opscope …` line                                    |

Values come from fixed sets, apart from the search query. The opscope CLI
reports `opscope_start` to the same Vercel project.

## Licence

To be decided.
