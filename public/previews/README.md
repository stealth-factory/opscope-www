# Widget previews

Drop a preview here named after the widget and the site picks it up on the
next build. No code change is needed.

| File                 | Shown as                                      |
| -------------------- | --------------------------------------------- |
| `<widget>.mp4`       | looping, muted video (preferred)              |
| `<widget>.gif`       | animated image                                |
| `<widget>.webp/.jpg/.png` | still; also used as the video's poster   |

`<widget>` is the widget's name as `npx opscope <widget>` takes it, for
example `latency.mp4` or `github-prs.jpg`. Panes crop to fill from the top
left, so a 16:10 capture fits best. Keep videos short and small (a few MB).
