{{flutter_js}}
{{flutter_build_config}}

// Logging and test switches for the GPU memory test app (flutter/flutter#194283).
//
// Every page load is recorded in localStorage ("probeAppRuns") as it happens,
// so the record survives a GPU process restart. Query parameters:
//   noMipmaps=1       patch CanvasKit so drawImageRectOptions always uses
//                     MipmapMode.None (Flutter 3.41 behavior)
//   shrinkToImage=1   once the backgrounds exist, shrink the idle 3840x1980
//                     Picture.toImage OffscreenCanvas to 1x1 so Chrome frees its
//                     drawing buffers (diagnostic; safe only because this app
//                     never calls toImage again)
//   auto=1&return=URL used by the test runner: record a result and go back to
//                     URL after the first context loss, or 10 s after the first
//                     background is drawn
(function () {
  'use strict';
  const q = new URLSearchParams(location.search);
  const STORAGE_KEY = 'probeAppRuns';
  const t0 = performance.now();
  const run = {case: location.search.slice(1), startedAt: new Date().toISOString(), result: null, events: []};
  let runs = [];
  try { runs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch (e) {}
  runs.push(run);
  runs = runs.slice(-30);
  const save = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(runs)); } catch (e) {} };
  const log = (msg) => { run.events.push(`${((performance.now() - t0) / 1000).toFixed(1)}s ${msg}`); save(); };

  const ledger = () => window.__gpuLedger;
  const describe = (s) => s.contexts
      .filter((c) => !c.lost && c.totalMiB > 0)
      .map((c) => `${c.kind === 'OffscreenCanvas' ? 'offscreen' : 'canvas'} ${c.canvas}: ${c.totalMiB}`)
      .join(', ');

  const auto = q.get('auto') === '1';
  const returnUrl = q.get('return') || '../?continue=1';
  let done = false;
  function finish(result, delayMs) {
    if (done) return;
    done = true;
    if (ledger()) ledger().record('end');
    const peak = ledger() && ledger().peak();
    if (peak) log(`ledger peak: GPU ${peak.totalGpuMiB} MiB (${describe(peak)})`);
    if (result === 'PASS' && hiddenDuringTest) {
      result = 'INCONCLUSIVE (the tab was hidden during the test, so Chrome paused drawing)';
    }
    run.result = result;
    log(`RESULT: ${result}`);
    // Leave quickly after a context loss, before Flutter's recovery repeats the trigger.
    if (auto) setTimeout(() => location.replace(returnUrl), delayMs);
  }

  log(`page loaded: ${location.search || '(no parameters)'}, devicePixelRatio ${devicePixelRatio}`);

  // Chrome stops drawing hidden tabs, so a test that was hidden after its first
  // frame can't tell us anything.
  let firstDrawSeen = false;
  let hiddenDuringTest = false;
  document.addEventListener('visibilitychange', () => {
    log(`tab ${document.hidden ? 'hidden' : 'visible'}`);
    if (document.hidden && firstDrawSeen) hiddenDuringTest = true;
  });

  // Log context loss on every canvas that gets a WebGL context, including CanvasKit's OffscreenCanvases.
  const glCanvases = [];
  for (const cls of [window.HTMLCanvasElement, window.OffscreenCanvas]) {
    if (!cls) continue;
    const getContext = cls.prototype.getContext;
    cls.prototype.getContext = function (type, ...rest) {
      const ctx = getContext.call(this, type, ...rest);
      if (ctx && String(type).includes('webgl') && !glCanvases.includes(this)) {
        glCanvases.push(this);
        const canvas = this;
        canvas.addEventListener('webglcontextlost', () => {
          log(`WebGL context lost (${canvas.width}x${canvas.height} ${cls.name})`);
          finish('CONTEXT LOST', 200);
        });
      }
      return ctx;
    };
  }

  window.__gpuLedgerSink = (s) => {
    if (!s || !s.label) return;
    if (s.label.startsWith('before texStorage2D')) {
      log(`mipmapped allocation (${s.label.slice(7)})`);
      if (q.get('debugLoseContext') === '1') {  // local testing of the runner only
        setTimeout(() => {
          for (const c of glCanvases) {
            const gl = c.getContext('webgl2') || c.getContext('webgl');
            const ext = gl && gl.getExtension('WEBGL_lose_context');
            if (ext && c.width > 1) { log('debug: forcing context loss'); ext.loseContext(); break; }
          }
        }, 500);
      }
    }
    if (s.label.startsWith('after promotion')) log(`ledger after mipmapped copy: GPU ${s.totalGpuMiB} MiB (${describe(s)})`);
  };

  // Called by the Dart side (lib/main.dart) at each stage.
  window.__probeStage = function (stage) {
    log(stage);
    if (ledger()) ledger().record(`stage: ${stage}`);
    if (stage.startsWith('backgrounds ready') && q.get('shrinkToImage') === '1') {
      for (const canvas of glCanvases) {
        if (typeof OffscreenCanvas !== 'undefined' && canvas instanceof OffscreenCanvas && canvas.width >= 3840) {
          log(`shrinking idle toImage canvas ${canvas.width}x${canvas.height} to 1x1`);
          canvas.width = 1;
          canvas.height = 1;
        }
      }
    }
    if (stage === 'background 1 drawn') {
      firstDrawSeen = true;
      if (document.hidden) hiddenDuringTest = true;
      const s = ledger() && ledger().record('first draw');
      if (s) log(`ledger after first draw: GPU ${s.totalGpuMiB} MiB (${describe(s)})`);
      setTimeout(() => {
        // CanvasKit silently falls back to CPU rendering if WebGL is unavailable
        // (for example, blocked by Chrome after a GPU reset).
        const scene = glCanvases.some((c) => typeof OffscreenCanvas !== 'undefined' &&
            c instanceof OffscreenCanvas && c.width > 1 && !(c.width === 3840 && c.height === 1980));
        finish(scene ? 'PASS' : 'NO WEBGL (CanvasKit fell back to CPU rendering)', 0);
      }, 10000);
    }
  };
  // Snapshot once a second so the peak includes plain (non-mipmapped) texture uploads.
  setInterval(() => { if (ledger() && !done) ledger().record('tick'); }, 1000);
  setTimeout(() => finish('TIMEOUT', 0), 300000);
  window.addEventListener('error', (e) => log(`JS error: ${e.message}`));

  _flutter.loader.load({
    config: {canvasKitBaseUrl: 'canvaskit/'},
    onEntrypointLoaded: async function (engineInitializer) {
      if (q.get('noMipmaps') === '1') {
        try {
          const canvasKit = await window.flutterCanvasKitLoaded;
          const drawImageRectOptions = canvasKit.Canvas.prototype.drawImageRectOptions;
          canvasKit.Canvas.prototype.drawImageRectOptions = function (image, src, dst, filterMode, mipmapMode, paint) {
            return drawImageRectOptions.call(this, image, src, dst, filterMode, canvasKit.MipmapMode.None, paint);
          };
          log('drawImageRectOptions patched: MipmapMode.None');
        } catch (e) {
          log(`could not patch CanvasKit: ${e}`);
        }
      }
      const appRunner = await engineInitializer.initializeEngine();
      await appRunner.runApp();
    },
  });
})();
