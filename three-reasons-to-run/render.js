// Frame-accurate render of index.html to a 1080x1920 MP4 with the voiceover.
// Usage: node render.js [fps=30] [out=three-reasons-to-run.mp4]
const { chromium } = require("playwright");
const { spawn } = require("child_process");
const path = require("path");

const FPS = Number(process.argv[2] || 30);
const OUT = path.resolve(__dirname, process.argv[3] || "three-reasons-to-run.mp4");
const HTML = process.argv[4] || "index.html";
const AUDIO = path.resolve(__dirname, "assets/voiceover.wav");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto("file://" + path.resolve(__dirname, HTML) + "?render");
  await page.evaluate(() => window.__ready);
  const duration = await page.evaluate(() => window.__duration);
  const frames = Math.round(duration * FPS);

  const ff = spawn("ffmpeg", [
    "-y", "-loglevel", "error",
    "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-",
    "-i", AUDIO,
    "-map", "0:v", "-map", "1:a",
    "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-pix_fmt", "yuv420p",
    "-profile:v", "high", "-movflags", "+faststart",
    "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
    "-t", String(duration),
    OUT,
  ], { stdio: ["pipe", "inherit", "inherit"] });

  for (let f = 0; f < frames; f++) {
    const t = f / FPS;
    await page.evaluate((t) => window.__seek(t), t);
    const buf = await page.screenshot({ type: "jpeg", quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
    if (f % FPS === 0) process.stdout.write(`\r${t.toFixed(0)}s / ${duration}s`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on("close", r));
  await browser.close();
  console.log(`\nWrote ${OUT}`);
})();
