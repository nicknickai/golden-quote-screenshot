# Golden quote screenshot

Turn a video and a source-time range into a vertically stitched quote screenshot sheet.

The skill is designed for interviews, speeches, podcasts, short videos, and other media where dialogue or on-screen subtitles should be collected into one readable long image.

## What it enforces

- Panels are ordered strictly by source timestamp from top to bottom.
- Existing visible subtitles are preserved without translation or rewriting.
- When subtitles are absent, the user must choose original-language, Chinese, or bilingual output before rendering.
- The first quote keeps a complete video frame.
- Later quotes use tightly cropped caption bands with minimal spacing.
- The final PNG must be visually inspected before delivery.

The included renderer rejects equal or decreasing timestamps, preventing narrative or semantic reordering from silently changing the source sequence.

## Requirements

- Codex with local skill support
- `ffmpeg` and `ffprobe`
- Google Chrome or Chromium for deterministic PNG rendering
- A timestamp-capable speech recognizer such as `faster-whisper` when the source has no subtitles

## Install

Clone this repository into the Codex skills directory:

```bash
git clone https://github.com/nicknickai/golden-quote-screenshot.git \
  ~/.codex/skills/golden-quote-screenshot
```

Alternatively, install it through the Skills CLI:

```bash
npx skills add https://github.com/nicknickai/golden-quote-screenshot \
  --skill golden-quote-screenshot
```

Restart or refresh Codex, then invoke it with:

```text
Use $golden-quote-screenshot to turn this video from 00:10 to 00:30 into a chronological quote screenshot sheet.
```

## Workflow

1. Inspect video duration, subtitle streams, and representative frames.
2. Detect every distinct caption/dialogue segment intersecting the requested interval.
3. If subtitles are absent, transcribe the audio and ask the user to choose the output language.
4. Extract one stable representative frame per segment.
5. Record exact source timestamps and sort them numerically.
6. Render one full first frame followed by tightly cropped caption bands.
7. Inspect the final pixels for order, completeness, spacing, and clipping.

Detailed agent instructions are in [`SKILL.md`](SKILL.md). The renderer manifest format is documented in [`references/manifest.md`](references/manifest.md).

## Renderer

After extracting frames and creating a manifest:

```bash
node scripts/render-sheet.js \
  --manifest /absolute/path/manifest.json \
  --output /absolute/path/quote-sheet.png
```

The renderer uses a local Chrome/Chromium executable and does not call a network service. Set `CHROME_PATH` if the browser is installed in a nonstandard location.

## Privacy

Video frames, audio, transcripts, and rendered images remain local unless the operator explicitly sends them to an external transcription or translation service. The skill itself contains no API keys or telemetry.

## License

MIT
