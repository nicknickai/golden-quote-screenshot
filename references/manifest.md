# Render manifest

Use the renderer after extracting one PNG or JPEG frame per caption/dialogue segment.

```json
{
  "width": 1376,
  "videoHeight": 768,
  "separator": 3,
  "backgroundOpacity": 0.58,
  "panels": [
    {
      "timeSeconds": 5.9,
      "image": "/absolute/path/frame-05.900.png",
      "cropTop": 0,
      "cropHeight": 768,
      "textLines": ["Nothing is broken.", "什么都没坏。"]
    },
    {
      "timeSeconds": 7.8,
      "image": "/absolute/path/frame-07.800.png",
      "cropTop": 588,
      "cropHeight": 132,
      "textLines": [
        "Your voice is tuned three octaves too low.",
        "你的声音被调低了三个八度。"
      ]
    }
  ]
}
```

## Fields

- `width`: source-frame and output width in pixels.
- `videoHeight`: full source-frame height.
- `separator`: black divider before every panel after the first; use 2–4 pixels.
- `backgroundOpacity`: generated-caption backing opacity from 0 to 1.
- `panels`: ordered source-frame selections.
- `timeSeconds`: exact source-media time. Values must be strictly increasing.
- `image`: absolute local path to the extracted frame.
- `cropTop`: crop origin measured downward from the top of the source frame.
- `cropHeight`: visible panel height. The first panel must use `cropTop: 0` and the full `videoHeight`.
- `textLines`: omit for existing burned-in subtitles. For generated subtitles, pass one source-language line or two lines in source-then-Chinese order.

For generated captions, choose later-panel `cropHeight` large enough for all text but keep it tight. Bilingual panels commonly need 120–150 pixels; a single line commonly needs 70–105 pixels. Measure from the actual rendered result rather than treating these as fixed constants.

Run:

```bash
node scripts/render-sheet.js --manifest /absolute/path/manifest.json --output /absolute/path/quote-sheet.png
```

The script validates ordering, paths, first-panel geometry, crop bounds, and output dimensions before rendering. It uses a local Chrome/Chromium executable and does not call a network service.
