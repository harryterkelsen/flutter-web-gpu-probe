# Flutter web GPU memory tests

Test page for [flutter/flutter#194283](https://github.com/flutter/flutter/issues/194283): since Flutter 3.47, CanvasKit
mipmaps downscaled images, and on some ChromeOS devices with PowerVR GPUs the WebGL context is lost and the whole
screen blacks out.

**Live page:** https://harryterkelsen.github.io/flutter-web-gpu-probe/

## Running it

1. Open the live page on the affected device in Chrome.
2. Click **Run all tests** and leave the tab alone until the results appear (about 6–10 minutes).
   Some tests are expected to black out the screen for a moment; the page records that and moves on.
3. Click **Copy results** and paste them into the issue.

Nothing is uploaded anywhere. Results are kept in the page's `localStorage` until you copy them.

## What it tests

| Test | What it checks |
|---|---|
| `app_asset_low` | Control: a pre-made 3840×1980 PNG, `FilterQuality.low`, no `Picture.toImage` |
| `app_shrink` | Mipmaps on, with the idle 3840×1980 `Picture.toImage` canvas shrunk to 1×1 after use |
| `app_low6` | No mipmaps, six stacked 3840×1980 images (lots of GPU memory) |
| `app_asset_medium` | Mipmaps on, pre-made PNG, no `Picture.toImage` |
| `probe_*` | The same WebGL calls without Flutter or Skia (`ballast_probe.html`), alone and inside a Flutter-like setup |
| `app_medium` | The original scenario: generated backgrounds, `FilterQuality.medium` (expected to black out on affected devices) |

Every page also loads `gpu_ledger.js`, which adds up the GPU memory the page allocates (drawing buffers, textures,
renderbuffers, buffers) so each result includes how much was live when it happened.

## Layout

- `index.html`: the test runner. It opens each test page with `auto=1`, and each page returns here with its result.
- `ballast_probe.html`: standalone WebGL2 probe. Each case can also be opened by hand, e.g. `ballast_probe.html?case=env_all`.
- `app/`: the Flutter test app, built with Flutter 3.47.5 (CanvasKit). Query parameters: `source=generate|asset`,
  `quality=none|low|medium|high`, `layers=1..6`, `noMipmaps=1`, `shrinkToImage=1`.
- `app-src/`: source for `app/`. Build with
  `flutter build web --release --no-web-resources-cdn --base-href /flutter-web-gpu-probe/app/`.

The test app is modeled on the reproduction in
[BvG-Gynzy/flutter_powervr_mipmap_repro](https://github.com/BvG-Gynzy/flutter_powervr_mipmap_repro), and
`ballast_probe.html` extends the `mip_probe.html` probe from the issue.
