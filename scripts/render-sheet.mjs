#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

function fail(message) {
  console.error(`render-sheet: ${message}`);
  process.exit(1);
}

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(candidate));
}

const manifestArg = argValue("--manifest");
const outputArg = argValue("--output");
if (!manifestArg || !outputArg) {
  fail("usage: render-sheet.mjs --manifest manifest.json --output sheet.png");
}

const manifestPath = path.resolve(manifestArg);
const outputPath = path.resolve(outputArg);
if (!fs.existsSync(manifestPath)) fail(`manifest not found: ${manifestPath}`);

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const width = Number(manifest.width);
const videoHeight = Number(manifest.videoHeight);
const separator = Number(manifest.separator ?? 3);
const opacity = Number(manifest.backgroundOpacity ?? 0.58);
const panels = manifest.panels;

if (!Number.isInteger(width) || width <= 0) fail("width must be a positive integer");
if (!Number.isInteger(videoHeight) || videoHeight <= 0) fail("videoHeight must be a positive integer");
if (!Number.isInteger(separator) || separator < 0 || separator > 20) fail("separator must be an integer from 0 to 20");
if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) fail("backgroundOpacity must be between 0 and 1");
if (!Array.isArray(panels) || panels.length === 0) fail("panels must be a non-empty array");

let priorTime = -Infinity;
let contentHeight = 0;
for (const [index, panel] of panels.entries()) {
  const time = Number(panel.timeSeconds);
  const cropTop = Number(panel.cropTop);
  const cropHeight = Number(panel.cropHeight);
  const imagePath = path.resolve(panel.image ?? "");

  if (!Number.isFinite(time)) fail(`panel ${index + 1} has an invalid timeSeconds`);
  if (time <= priorTime) fail(`panel ${index + 1} is not in strict chronological order (${time} <= ${priorTime})`);
  if (!Number.isInteger(cropTop) || cropTop < 0) fail(`panel ${index + 1} has an invalid cropTop`);
  if (!Number.isInteger(cropHeight) || cropHeight <= 0) fail(`panel ${index + 1} has an invalid cropHeight`);
  if (cropTop + cropHeight > videoHeight) fail(`panel ${index + 1} crop exceeds video height`);
  if (!fs.existsSync(imagePath)) fail(`panel ${index + 1} image not found: ${imagePath}`);
  if (panel.textLines !== undefined && (!Array.isArray(panel.textLines) || panel.textLines.length < 1 || panel.textLines.length > 2 || panel.textLines.some((line) => typeof line !== "string"))) {
    fail(`panel ${index + 1} textLines must contain one or two strings`);
  }
  panel.image = imagePath;
  priorTime = time;
  contentHeight += cropHeight + (index === 0 ? 0 : separator);
}

if (Number(panels[0].cropTop) !== 0 || Number(panels[0].cropHeight) !== videoHeight) {
  fail("the first panel must be a complete uncropped frame");
}

const panelHtml = panels.map((panel, index) => {
  const cropTop = Number(panel.cropTop);
  const cropHeight = Number(panel.cropHeight);
  const lines = panel.textLines ?? [];
  const caption = lines.length
    ? `<div class="caption ${index === 0 ? "caption-full" : "caption-strip"}">${lines.map((line, lineIndex) => `<div class="line line-${lineIndex + 1}">${escapeHtml(line)}</div>`).join("")}</div>`
    : "";
  return `<section class="panel" style="height:${cropHeight + (index === 0 ? 0 : separator)}px;${index === 0 ? "" : `border-top:${separator}px solid #000;`}">
    <img src="${pathToFileURL(panel.image).href}" style="top:-${cropTop}px;width:${width}px;height:${videoHeight}px">
    ${caption}
  </section>`;
}).join("\n");

const html = `<!doctype html>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; width: ${width}px; height: ${contentHeight}px; overflow: hidden; background: #000; }
  .panel { position: relative; width: ${width}px; overflow: hidden; background: #000; }
  .panel > img { position: absolute; left: 0; display: block; object-fit: fill; }
  .caption { position: absolute; left: 3%; right: 3%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #fff; background: rgba(0,0,0,${opacity}); border-radius: 10px; padding: 7px 14px; font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Noto Sans CJK SC", "Helvetica Neue", sans-serif; font-weight: 650; text-align: center; text-shadow: -2px -2px 1px #000, 2px -2px 1px #000, -2px 2px 1px #000, 2px 2px 1px #000; }
  .caption-full { bottom: 24px; min-height: 104px; }
  .caption-strip { inset-block: 6px; }
  .line { line-height: 1.16; }
  .line-1 { font-size: 31px; }
  .line-2 { margin-top: 4px; font-size: 34px; }
</style>
${panelHtml}`;

const chrome = findChrome();
if (!chrome) fail("Chrome or Chromium not found; set CHROME_PATH to its executable");

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "golden-quote-sheet-"));
const htmlPath = path.join(tempDir, "sheet.html");
fs.writeFileSync(htmlPath, html);

try {
  const result = spawnSync(chrome, [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--hide-scrollbars",
    "--allow-file-access-from-files",
    "--force-device-scale-factor=1",
    `--window-size=${width},${contentHeight}`,
    `--screenshot=${outputPath}`,
    "--run-all-compositor-stages-before-draw",
    "--virtual-time-budget=1000",
    pathToFileURL(htmlPath).href,
  ], { encoding: "utf8" });
  if (result.status !== 0 || !fs.existsSync(outputPath)) {
    fail(result.stderr?.trim() || "Chrome failed to render the screenshot");
  }
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

console.log(JSON.stringify({ outputPath, width, height: contentHeight, panels: panels.length }, null, 2));
