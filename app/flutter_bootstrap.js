(()=>{var C={blink:!0,gecko:!1,webkit:!1,unknown:!1},A=()=>navigator.vendor==="Google Inc."||navigator.userAgent.includes("Edg/")?"blink":navigator.vendor==="Apple Computer, Inc."?"webkit":navigator.vendor===""&&navigator.userAgent.includes("Firefox")?"gecko":"unknown",T=A(),x=()=>typeof ImageDecoder>"u"?!1:T==="blink",R=()=>typeof Intl.v8BreakIterator<"u"&&typeof Intl.Segmenter<"u",j=()=>typeof window.TextCluster<"u",B=()=>{let n=[0,97,115,109,1,0,0,0,1,5,1,95,1,120,0];return WebAssembly.validate(new Uint8Array(n))},K=()=>{let n=document.createElement("canvas");return n.width=1,n.height=1,n.getContext("webgl2")!=null?2:n.getContext("webgl")!=null?1:-1},$=()=>window.chrome&&chrome.runtime&&chrome.runtime.id,f={browserEngine:T,hasImageCodecs:x(),hasChromiumBreakIterators:R(),hasTextCluster:j(),supportsWasmGC:B(),crossOriginIsolated:window.crossOriginIsolated,webGLVersion:K(),isChromeExtension:$()};function m(...n){return new URL(W(...n),document.baseURI).toString()}function W(...n){return n.filter(e=>!!e).map((e,s)=>s===0?L(e):F(L(e))).filter(e=>e.length).join("/")}function F(n){let e=0;for(;e<n.length&&n.charAt(e)==="/";)e++;return n.substring(e)}function L(n){let e=n.length;for(;e>0&&n.charAt(e-1)==="/";)e--;return n.substring(0,e)}function _(n,e){return n.canvasKitBaseUrl?n.canvasKitBaseUrl:e.engineRevision&&!e.useLocalCanvasKit?W("https://www.gstatic.com/flutter-canvaskit",e.engineRevision):"canvaskit"}var g=class{constructor(){this._scriptLoaded=!1}setTrustedTypesPolicy(e){this._ttPolicy=e}async loadEntrypoint(e){let{entrypointUrl:s=m("main.dart.js"),onEntrypointLoaded:t,nonce:r}=e||{};return this._loadJSEntrypoint(s,t,r)}async load(e,s,t,r,i){i??=a=>{a.initializeEngine(t).then(l=>l.runApp())};let{entrypointBaseUrl:o}=t,{entryPointBaseUrl:c}=t;if(!o&&c&&(console.warn("[deprecated] `entryPointBaseUrl` is deprecated and will be removed in a future release. Use `entrypointBaseUrl` instead."),o=c),e.compileTarget==="dart2wasm")return this._loadWasmEntrypoint(e,s,o,i);{let a=e.mainJsPath??"main.dart.js",l=m(o,a);return this._loadJSEntrypoint(l,i,r)}}didCreateEngineInitializer(e){typeof this._didCreateEngineInitializerResolve=="function"&&(this._didCreateEngineInitializerResolve(e),this._didCreateEngineInitializerResolve=null,delete _flutter.loader.didCreateEngineInitializer),typeof this._onEntrypointLoaded=="function"&&this._onEntrypointLoaded(e)}_loadJSEntrypoint(e,s,t){let r=typeof s=="function";if(!this._scriptLoaded){this._scriptLoaded=!0;let i=this._createScriptTag(e,t);if(r)console.debug("Injecting <script> tag. Using callback."),this._onEntrypointLoaded=s,document.head.append(i);else return new Promise((o,c)=>{console.debug("Injecting <script> tag. Using Promises. Use the callback approach instead!"),this._didCreateEngineInitializerResolve=o,i.addEventListener("error",c),document.head.append(i)})}}async _loadWasmEntrypoint(e,s,t,r){if(!this._scriptLoaded){this._scriptLoaded=!0,this._onEntrypointLoaded=r;let{mainWasmPath:i,jsSupportRuntimePath:o}=e,c=m(t,i),a=m(t,o);this._ttPolicy!=null&&(a=this._ttPolicy.createScriptURL(a));let p=(await import(a)).compileStreaming(fetch(c)),d;e.renderer==="skwasm"?d=(async()=>{let u=await s.skwasm;return window._flutter_skwasmInstance=u,{skwasm:u.wasmExports,skwasmWrapper:u,ffi:{memory:u.wasmMemory}}})():d=Promise.resolve({}),await(await(await p).instantiate(await d)).invokeMain()}}_createScriptTag(e,s){let t=document.createElement("script");t.type="application/javascript",s&&(t.nonce=s);let r=e;return this._ttPolicy!=null&&(r=this._ttPolicy.createScriptURL(e)),t.src=r,t}};async function E(n,e,s){if(e<0)return n;let t,r=new Promise((i,o)=>{t=setTimeout(()=>{o(new Error(`${s} took more than ${e}ms to resolve. Moving on.`,{cause:E}))},e)});return Promise.race([n,r]).finally(()=>{clearTimeout(t)})}var v=class{setTrustedTypesPolicy(e){this._ttPolicy=e}loadServiceWorker(e){if(!e||!("serviceWorker"in navigator))return Promise.resolve();let s=()=>{console.warn(`Loading the service worker using Flutter bootstrap is deprecated and will stop working in a future release.
For more details, see: https://github.com/flutter/flutter/issues/156910`)},t=()=>{let{serviceWorkerVersion:r,serviceWorkerUrl:i=m(`flutter_service_worker.js?v=${r}`),timeoutMillis:o=4e3}=e,c=i;this._ttPolicy!=null&&(c=this._ttPolicy.createScriptURL(c));let a=navigator.serviceWorker.register(c).then(l=>this._getNewServiceWorker(l,r)).then(this._waitForServiceWorkerActivation);return E(a,o,"prepareServiceWorker")};return e.serviceWorkerUrl!=null?(s(),t()):navigator.serviceWorker.getRegistration().then(r=>r?t():Promise.resolve())}async _getNewServiceWorker(e,s){if(!e.active&&(e.installing||e.waiting))return console.debug("Installing/Activating first service worker."),e.installing||e.waiting;if(e.active.scriptURL.endsWith(s))return console.debug("Loading from existing service worker."),e.active;{let t=await e.update();return console.debug("Updating service worker."),t.installing||t.waiting||t.active}}async _waitForServiceWorkerActivation(e){if(!e||e.state==="activated")if(e){console.debug("Service worker already active.");return}else throw new Error("Cannot activate a null service worker!");return new Promise((s,t)=>{e.addEventListener("statechange",()=>{e.state==="activated"&&(console.debug("Activated new service worker."),s())})})}};var y=class{constructor(e,s="flutter-js"){let t=e||[/\.js$/,/\.mjs$/];window.trustedTypes&&(this.policy=trustedTypes.createPolicy(s,{createScriptURL:function(r){if(r.startsWith("blob:"))return r;let i=new URL(r,window.location),o=i.pathname.split("/").pop();if(t.some(a=>a.test(o)))return i.toString();console.error("URL rejected by TrustedTypes policy",s,":",r,"(download prevented)")}}))}};var b=(n,e)=>{let s=window._flutter?.buildConfig?.wasmHashes,t=s?.[e];if(!t&&e.includes("/")){let a=e.split("/").pop();t=s?.[a]}let r="crossOriginStorage"in navigator&&"requestFileHandles"in navigator.crossOriginStorage;r&&console.log("Cross-Origin Storage is supported. See https://wicg.github.io/cross-origin-storage/ for more details.");let i=async a=>{let l={algorithm:"SHA-256",value:a};try{let[p]=await navigator.crossOriginStorage.requestFileHandles([l]),d=await p.getFile();return new Response(d,{headers:{"Content-Type":"application/wasm"}})}catch(p){p.name==="NotAllowedError"?console.warn(`Not allowed to retrieve ${e} (hash: ${a}).`):p.name!=="NotFoundError"&&console.warn(`Unexpected error during retrieval of ${e} (hash: ${a}).`,p)}},o=async()=>{if(r&&t){let l=await i(t);if(l)return l}let a=await fetch(n);if(r&&t&&a.ok){let l={algorithm:"SHA-256",value:t},p=a.clone();(async()=>{try{let d=await p.blob(),[h]=await navigator.crossOriginStorage.requestFileHandles([l],{create:!0}),w=await h.createWritable();await w.write(d),await w.close()}catch(d){console.warn(`Error storing ${e} (hash: ${t}):`,d)}})()}return a},c=WebAssembly.compileStreaming(o());return(a,l)=>((async()=>{let p=await c,d=await WebAssembly.instantiate(p,a);l(d,p)})(),{})};var I=(n,e,s,t)=>(window.flutterCanvasKitLoaded=(async()=>{if(window.flutterCanvasKit)return window.flutterCanvasKit;let r=s.hasChromiumBreakIterators&&s.hasImageCodecs;if(!r&&e.canvasKitVariant=="chromium")throw"Chromium CanvasKit variant specifically requested, but unsupported in this browser";let i=r&&e.canvasKitVariant!=="full",o=i&&e.preferWebParagraph&&s.hasTextCluster,c=t;o?c=m(c,"webparagraph"):i&&(c=m(c,"chromium"));let a=m(c,"canvaskit.js");n.flutterTT.policy&&(a=n.flutterTT.policy.createScriptURL(a));let l="canvaskit.wasm";o?l="webparagraph/canvaskit.wasm":i&&(l="chromium/canvaskit.wasm");let p=b(m(c,"canvaskit.wasm"),l),d=await import(a);return window.flutterCanvasKit=await d.default({instantiateWasm:p}),window.flutterCanvasKit})(),window.flutterCanvasKitLoaded);var U=async(n,e,s,t)=>{let i=!s.hasImageCodecs||!s.hasChromiumBreakIterators?"skwasm_heavy":e.enableWimp?"wimp":"skwasm",o=m(t,`${i}.js`),c=o;n.flutterTT.policy&&(c=n.flutterTT.policy.createScriptURL(c));let a=b(m(t,`${i}.wasm`),`${i}.wasm`),l=await import(c);return!s.crossOriginIsolated&&!e.forceSingleThreadedSkwasm&&!e.suppressMultithreadingWarning&&console.warn(`Flutter Web: Skwasm uses multi-threading and web workers for better performance, but your page needs to be cross-origin isolated to support multi-threading. Skwasm will run in single-threaded mode.
To enable multithreading, serve your app with these HTTP response headers:
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
See https://web.dev/articles/coop-coep for guidance.
To silence this warning, set \`suppressMultithreadingWarning: true\` in your Flutter configuration.`),await l.default({skwasmSingleThreaded:e.enableWimp||!s.crossOriginIsolated||s.isChromeExtension||e.forceSingleThreadedSkwasm,instantiateWasm:a,locateFile:(p,d)=>p.endsWith(".ww.js")?URL.createObjectURL(new Blob([`
"use strict";

let eventListener;
eventListener = (message) => {
    const pendingMessages = [];
    const data = message.data;
    data["instantiateWasm"] = (info,receiveInstance) => {
        const instance = new WebAssembly.Instance(data["wasm"], info);
        return receiveInstance(instance, data["wasm"])
    };
    import(data.js).then(async (skwasm) => {
        await skwasm.default(data);

        removeEventListener("message", eventListener);
        for (const message of pendingMessages) {
            dispatchEvent(message);
        }
    });
    removeEventListener("message", eventListener);
    eventListener = (message) => {

        pendingMessages.push(message);
    };

    addEventListener("message", eventListener);
};
addEventListener("message", eventListener);
`],{type:"application/javascript"})):m(t,p),mainScriptUrlOrBlob:o})};var P=f.supportsWasmGC,k=class{async loadEntrypoint(e){let{serviceWorker:s,...t}=e||{},r=new y,i=new v;i.setTrustedTypesPolicy(r.policy),await i.loadServiceWorker(s).catch(c=>{console.warn("Exception while loading service worker:",c)});let o=new g;return o.setTrustedTypesPolicy(r.policy),this.didCreateEngineInitializer=o.didCreateEngineInitializer.bind(o),o.loadEntrypoint(t)}async load({serviceWorkerSettings:e,onEntrypointLoaded:s,nonce:t,config:r}={}){r??={};let i=_flutter.buildConfig;if(!i)throw"FlutterLoader.load requires _flutter.buildConfig to be set";let o=r.wasmAllowList?.[f.browserEngine]??C[f.browserEngine],c=u=>{switch(u){case"skwasm":return P?f.webGLVersion>0?o?null:`Skwasm is disabled by your wasmAllowList configuration for browser engine "${f.browserEngine}".`:"Skwasm requires WebGL support; this browser does not provide it.":"Skwasm requires WasmGC support; this browser does not implement it yet.";default:return null}},a=u=>u.compileTarget==="dart2wasm"&&!P?"dart2wasm requires WasmGC support; this browser does not implement it yet.":r.renderer&&r.renderer!=u.renderer?`The application is configured to use the "${r.renderer}" renderer; this build targets "${u.renderer}".`:c(u.renderer),l,p=[];for(let u of i.builds){let S=a(u);if(S===null){l=u;break}p.push({candidate:u,reason:S})}if(r.verboseBuildSelection)for(let u of p)console.warn(`Flutter Web: build ${u.candidate.compileTarget}/${u.candidate.renderer} was skipped: ${u.reason}`);if(!l)throw console.warn("Flutter Web: no compatible build found for this browser."+(r.verboseBuildSelection?"":" Set `verboseBuildSelection: true` in your Flutter configuration to see why each candidate was rejected.")),new Error("FlutterLoader could not find a build compatible with configuration and environment.");let d={};d.flutterTT=new y,e&&(d.serviceWorkerLoader=new v,d.serviceWorkerLoader.setTrustedTypesPolicy(d.flutterTT.policy),await d.serviceWorkerLoader.loadServiceWorker(e).catch(u=>{console.warn("Exception while loading service worker:",u)}));let h=_(r,i);l.renderer==="canvaskit"?d.canvasKit=I(d,r,f,h):l.renderer==="skwasm"&&(d.skwasm=U(d,r,f,h));let w=new g;return w.setTrustedTypesPolicy(d.flutterTT.policy),this.didCreateEngineInitializer=w.didCreateEngineInitializer.bind(w),w.load(l,d,r,t,s)}};window._flutter||(window._flutter={});window._flutter.loader||(window._flutter.loader=new k);})();
//# sourceMappingURL=flutter.js.map

if (!window._flutter) {
  window._flutter = {};
}
_flutter.buildConfig = {"engineRevision":"af7e796e161ae0bb1ff0758c71a7105418bd9ded","wasmHashes":{"skwasm_heavy.wasm":"565f5cc1cca6ab120f11934b105f01fec4b58b480c82e0889dca93af8e6f8635","chromium/canvaskit.wasm":"ae8ff1d858140f7b1300ced3fa89fb8c9dce0a400a0f4f1e11f6dcfb3315fdcf","webparagraph/canvaskit.wasm":"0ce1b05082efdc8529550e8a01f6ff0593972d55525035010e26f5600aa9f254","wimp.wasm":"e924eaafd801d41e017d178f3fd5cf8a417f641fe35c9ed34a4e1d7582283e0c","canvaskit.wasm":"fbed517a43e82452404446683f00f2e876d835aed84410695759e67b6bb01cd3","skwasm.wasm":"e540fd5e8303b7b68ec2718cb49e9c421f8ade3075b15e02a7059a62654df9a1"},"builds":[{"compileTarget":"dart2js","renderer":"canvaskit","mainJsPath":"main.dart.js"},{}],"useLocalCanvasKit":true};


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
