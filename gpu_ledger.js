// GPU/heap memory ledger for flutter/flutter#194283 investigations.
//
// Load this BEFORE anything creates a WebGL context. It wraps the WebGL
// prototypes and tracks, per context:
//   - the default drawing buffer (color + depth/stencil + MSAA), from the
//     actual context attributes and drawingBufferWidth/Height,
//   - every texture (per-level bytes; texImage2D/texStorage2D/copyTexImage2D/
//     generateMipmap), renderbuffer and buffer object,
// plus page-level numbers: the CanvasKit/Skwasm wasm heap, the JS heap and live
// ImageBitmaps.
//
// Byte counts are logical (what the app asked for), not what the driver
// actually committed. Hidden allocations (Chrome's extra drawing-buffer copies
// for transferToImageBitmap/createImageBitmap, driver padding, shader programs)
// are not visible from JS.
//
// window.__gpuLedger.snapshot(label) returns a JSON-able snapshot.
// If window.__gpuLedgerSink(obj) is defined, snapshots are pushed to it.
(function () {
  'use strict';
  if (window.__gpuLedger) return;

  const GL = {
    TEXTURE_2D: 0x0de1, TEXTURE0: 0x84c0, RENDERBUFFER: 0x8d41,
    ARRAY_BUFFER: 0x8892, ELEMENT_ARRAY_BUFFER: 0x8893,
  };
  // Bytes per texel for common internal formats (fallback 4).
  const BPP = {
    0x1906: 1, 0x1909: 1, 0x190a: 2, // ALPHA, LUMINANCE, LUMINANCE_ALPHA
    0x8229: 1, 0x822b: 2, // R8, RG8
    0x1907: 3, 0x8051: 3, // RGB, RGB8 (driver likely pads to 4)
    0x1908: 4, 0x8058: 4, 0x8c43: 4, // RGBA, RGBA8, SRGB8_ALPHA8
    0x8d62: 2, 0x8056: 2, 0x8057: 2, // RGB565, RGBA4, RGB5_A1
    0x881a: 8, 0x8814: 16, 0x822d: 2, 0x822e: 4, // RGBA16F, RGBA32F, R16F, R32F
    0x81a5: 2, 0x81a6: 4, 0x8cac: 4, // DEPTH_COMPONENT16/24, DEPTH_COMPONENT32F
    0x88f0: 4, 0x84f9: 4, 0x8d48: 1, // DEPTH24_STENCIL8, DEPTH_STENCIL, STENCIL_INDEX8
  };
  const bpp = (fmt) => BPP[fmt] || 4;
  const mib = (b) => Math.round((b / 1048576) * 10) / 10;

  let nextId = 1;
  const contexts = [];
  const recOf = new WeakMap(); // gl -> rec
  const events = [];
  let peak = {totalGpu: 0};

  function newRec(gl, canvas, type, requested) {
    const rec = {
      id: nextId++, gl, canvasRef: new WeakRef(canvas),
      kind: (typeof OffscreenCanvas !== 'undefined' && canvas instanceof OffscreenCanvas) ? 'OffscreenCanvas' : 'HTMLCanvasElement',
      type, requested, createdAt: performance.now(), lost: false,
      unit: 0, bound2D: [], boundRb: null, boundBuf: {},
      tex: new Map(), rb: new Map(), buf: new Map(),
      trace: [],
    };
    contexts.push(rec);
    canvas.addEventListener('webglcontextlost', () => {
      rec.lost = true;
      record('webglcontextlost ctx#' + rec.id);
    });
    return rec;
  }

  function traceOp(rec, s) {
    rec.trace.push(`${(performance.now() / 1000).toFixed(3)} ${s}`);
    if (rec.trace.length > 60) rec.trace.shift();
  }

  function texBytes(t) {
    let b = 0;
    for (const v of t.levels.values()) b += v.bytes;
    return b;
  }

  function drawingBufferBytes(rec) {
    const gl = rec.gl;
    if (rec.lost || gl.isContextLost()) return {bytes: 0};
    const a = gl.getContextAttributes() || {};
    const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
    const px = w * h;
    const color = px * 4;
    const ds = (a.depth || a.stencil) ? px * 4 : 0;
    // With antialias, Chrome keeps a multisampled color+depth/stencil buffer
    // plus a resolve buffer. Sample count unknown from JS; assume 4.
    const msaa = a.antialias ? px * 4 * 4 + (ds ? px * 4 * 4 : 0) : 0;
    return {w, h, depth: !!a.depth, stencil: !!a.stencil, antialias: !!a.antialias,
            preserveDrawingBuffer: !!a.preserveDrawingBuffer, bytes: color + ds + msaa};
  }

  function ctxSummary(rec) {
    let texTotal = 0;
    const texList = [];
    for (const t of rec.tex.values()) {
      const b = texBytes(t);
      texTotal += b;
      if (b > 0) texList.push(t);
    }
    texList.sort((x, y) => texBytes(y) - texBytes(x));
    let rbTotal = 0;
    for (const r of rec.rb.values()) rbTotal += r.bytes;
    let bufTotal = 0;
    for (const b of rec.buf.values()) bufTotal += b.bytes;
    const db = drawingBufferBytes(rec);
    const canvas = rec.canvasRef.deref();
    return {
      id: rec.id, kind: rec.kind, type: rec.type, lost: rec.lost,
      canvas: canvas ? `${canvas.width}x${canvas.height}` : '(collected)',
      requested: rec.requested,
      drawingBuffer: db, drawingBufferMiB: mib(db.bytes),
      textures: rec.tex.size, textureMiB: mib(texTotal),
      largestTextures: texList.slice(0, 6).map((t) =>
        `${t.w}x${t.h} levels=${t.levels.size}${t.immutable ? ' (texStorage)' : ''} ${mib(texBytes(t))}MiB`),
      renderbufferMiB: mib(rbTotal), bufferMiB: mib(bufTotal),
      totalMiB: mib(db.bytes + texTotal + rbTotal + bufTotal),
      _totalBytes: db.bytes + texTotal + rbTotal + bufTotal,
    };
  }

  // ------------------------------------------------------------ page-level
  const bitmaps = new Map(); // ImageBitmap -> bytes (weakly tracked via close)
  if (window.createImageBitmap) {
    const orig = window.createImageBitmap;
    window.createImageBitmap = function (...args) {
      return orig.apply(this, args).then((bm) => {
        bitmaps.set(bm, bm.width * bm.height * 4);
        return bm;
      });
    };
    const close = ImageBitmap.prototype.close;
    ImageBitmap.prototype.close = function () {
      bitmaps.delete(this);
      return close.call(this);
    };
  }
  if (typeof OffscreenCanvas !== 'undefined' && OffscreenCanvas.prototype.transferToImageBitmap) {
    const orig = OffscreenCanvas.prototype.transferToImageBitmap;
    OffscreenCanvas.prototype.transferToImageBitmap = function () {
      const bm = orig.call(this);
      bitmaps.set(bm, bm.width * bm.height * 4);
      return bm;
    };
  }
  if (typeof ImageBitmapRenderingContext !== 'undefined') {
    const orig = ImageBitmapRenderingContext.prototype.transferFromImageBitmap;
    ImageBitmapRenderingContext.prototype.transferFromImageBitmap = function (bm) {
      // Ownership moves to the canvas; the previous one is released.
      if (bm) bitmaps.delete(bm);
      return orig.call(this, bm);
    };
  }

  function wasmHeapBytes() {
    const ck = window.flutterCanvasKit;
    try {
      if (ck && ck.HEAPU8) return ck.HEAPU8.buffer.byteLength;
    } catch (e) {}
    try {
      if (window.__skwasmMemory) return window.__skwasmMemory.buffer.byteLength;
    } catch (e) {}
    return window.__ballastHeapBytes || 0;
  }

  function snapshot(label) {
    const ctxs = contexts.map(ctxSummary);
    const totalGpu = ctxs.reduce((s, c) => s + c._totalBytes, 0);
    let bmBytes = 0;
    for (const b of bitmaps.values()) bmBytes += b;
    const pm = performance.memory || {};
    const snap = {
      label, t: Math.round(performance.now()) / 1000,
      totalGpuMiB: mib(totalGpu),
      contexts: ctxs.map(({_totalBytes, ...rest}) => rest),
      liveImageBitmaps: bitmaps.size, liveImageBitmapMiB: mib(bmBytes),
      wasmHeapMiB: mib(wasmHeapBytes()),
      jsHeapUsedMiB: pm.usedJSHeapSize ? mib(pm.usedJSHeapSize) : null,
      jsHeapTotalMiB: pm.totalJSHeapSize ? mib(pm.totalJSHeapSize) : null,
    };
    if (totalGpu > peak.totalGpu) peak = {totalGpu, snap};
    return snap;
  }

  function push(obj) {
    if (typeof window.__gpuLedgerSink === 'function') {
      try { window.__gpuLedgerSink(obj); } catch (e) {}
    }
  }

  function record(label, extra) {
    const s = snapshot(label);
    if (extra) s.extra = extra;
    events.push(s);
    push(s);
    return s;
  }

  // ------------------------------------------------------------- wrapping
  function wrapGetContext(cls) {
    if (!cls) return;
    const orig = cls.prototype.getContext;
    cls.prototype.getContext = function (type, attrs, ...rest) {
      const gl = orig.call(this, type, attrs, ...rest);
      if (gl && /webgl/.test(String(type)) && !recOf.has(gl)) {
        const rec = newRec(gl, this, String(type), attrs ? {...attrs} : null);
        recOf.set(gl, rec);
        record(`context created ctx#${rec.id} ${rec.kind} ${this.width}x${this.height}`);
      }
      return gl;
    };
  }
  wrapGetContext(window.HTMLCanvasElement);
  wrapGetContext(window.OffscreenCanvas);

  function wrap(P, name, fn) {
    const orig = P[name];
    if (!orig) return;
    P[name] = function (...a) {
      const rec = recOf.get(this);
      return fn.call(this, rec, orig, a);
    };
  }

  function sourceSize(s) {
    if (!s) return [0, 0];
    return [s.displayWidth || s.videoWidth || s.naturalWidth || s.width || 0,
            s.displayHeight || s.videoHeight || s.naturalHeight || s.height || 0];
  }

  function boundTex(rec) { return rec.tex.get(rec.bound2D[rec.unit]); }

  for (const P of [window.WebGLRenderingContext && WebGLRenderingContext.prototype,
                   window.WebGL2RenderingContext && WebGL2RenderingContext.prototype]) {
    if (!P) continue;
    wrap(P, 'createTexture', function (rec, orig, a) {
      const t = orig.apply(this, a);
      if (rec && t) rec.tex.set(t, {w: 0, h: 0, levels: new Map(), immutable: false});
      return t;
    });
    wrap(P, 'deleteTexture', function (rec, orig, a) {
      if (rec && a[0]) {
        const t = rec.tex.get(a[0]);
        if (t) traceOp(rec, `deleteTexture ${t.w}x${t.h} levels=${t.levels.size} ${mib(texBytes(t))}MiB`);
        rec.tex.delete(a[0]);
      }
      return orig.apply(this, a);
    });
    wrap(P, 'activeTexture', function (rec, orig, a) {
      if (rec) rec.unit = a[0] - GL.TEXTURE0;
      return orig.apply(this, a);
    });
    wrap(P, 'bindTexture', function (rec, orig, a) {
      if (rec && a[0] === GL.TEXTURE_2D) rec.bound2D[rec.unit] = a[1];
      return orig.apply(this, a);
    });
    wrap(P, 'texImage2D', function (rec, orig, a) {
      const r = orig.apply(this, a);
      if (rec && a[0] === GL.TEXTURE_2D) {
        const t = boundTex(rec);
        if (t) {
          let w, h;
          if (typeof a[3] === 'number' && a.length >= 8) { w = a[3]; h = a[4]; } else { [w, h] = sourceSize(a[5]); }
          if (a[1] === 0) { t.w = w; t.h = h; }
          t.levels.set(a[1], {w, h, bytes: w * h * bpp(a[2])});
          traceOp(rec, `texImage2D level=${a[1]} ${w}x${h}`);
        }
      }
      return r;
    });
    wrap(P, 'texStorage2D', function (rec, orig, a) {
      // Snapshot BEFORE the call: this is the state the allocation lands on.
      const big = a[1] > 1;
      let pre = null;
      if (rec && big) pre = snapshot(`before texStorage2D levels=${a[1]} ${a[3]}x${a[4]} ctx#${rec.id}`);
      const r = orig.apply(this, a);
      if (rec && a[0] === GL.TEXTURE_2D) {
        const t = boundTex(rec);
        if (t) {
          t.w = a[3]; t.h = a[4]; t.immutable = true; t.levels.clear();
          for (let i = 0; i < a[1]; i++) {
            const w = Math.max(1, a[3] >> i), h = Math.max(1, a[4] >> i);
            t.levels.set(i, {w, h, bytes: w * h * bpp(a[2])});
          }
          traceOp(rec, `texStorage2D levels=${a[1]} ${a[3]}x${a[4]}`);
        }
      }
      if (big) {
        events.push(pre); push(pre);
        rec.__watchPromotion = true;
      }
      return r;
    });
    wrap(P, 'copyTexImage2D', function (rec, orig, a) {
      const r = orig.apply(this, a);
      if (rec && a[0] === GL.TEXTURE_2D) {
        const t = boundTex(rec);
        if (t) {
          if (a[1] === 0) { t.w = a[5]; t.h = a[6]; }
          t.levels.set(a[1], {w: a[5], h: a[6], bytes: a[5] * a[6] * bpp(a[2])});
        }
      }
      return r;
    });
    wrap(P, 'copyTexSubImage2D', function (rec, orig, a) {
      if (rec) traceOp(rec, `copyTexSubImage2D level=${a[1]} ${a[6]}x${a[7]}`);
      return orig.apply(this, a);
    });
    wrap(P, 'generateMipmap', function (rec, orig, a) {
      const r = orig.apply(this, a);
      if (rec && a[0] === GL.TEXTURE_2D) {
        const t = boundTex(rec);
        traceOp(rec, `generateMipmap ${t ? t.w + 'x' + t.h : '?'}`);
        if (t && !t.immutable && t.levels.has(0)) {
          const b0 = t.levels.get(0);
          const per = b0.bytes / Math.max(1, b0.w * b0.h);
          let w = b0.w, h = b0.h, i = 0;
          while (w > 1 || h > 1) {
            i++; w = Math.max(1, w >> 1); h = Math.max(1, h >> 1);
            t.levels.set(i, {w, h, bytes: w * h * per});
          }
        }
      }
      return r;
    });
    wrap(P, 'createRenderbuffer', function (rec, orig, a) {
      const rb = orig.apply(this, a);
      if (rec && rb) rec.rb.set(rb, {bytes: 0});
      return rb;
    });
    wrap(P, 'deleteRenderbuffer', function (rec, orig, a) {
      if (rec && a[0]) rec.rb.delete(a[0]);
      return orig.apply(this, a);
    });
    wrap(P, 'bindRenderbuffer', function (rec, orig, a) {
      if (rec) rec.boundRb = a[1];
      return orig.apply(this, a);
    });
    wrap(P, 'renderbufferStorage', function (rec, orig, a) {
      if (rec && rec.boundRb && rec.rb.has(rec.boundRb)) {
        rec.rb.get(rec.boundRb).bytes = a[2] * a[3] * bpp(a[1]);
        traceOp(rec, `renderbufferStorage ${a[2]}x${a[3]} fmt=0x${a[1].toString(16)}`);
      }
      return orig.apply(this, a);
    });
    wrap(P, 'renderbufferStorageMultisample', function (rec, orig, a) {
      if (rec && rec.boundRb && rec.rb.has(rec.boundRb)) {
        rec.rb.get(rec.boundRb).bytes = a[3] * a[4] * bpp(a[2]) * Math.max(1, a[1]);
        traceOp(rec, `renderbufferStorageMultisample x${a[1]} ${a[3]}x${a[4]}`);
      }
      return orig.apply(this, a);
    });
    wrap(P, 'createBuffer', function (rec, orig, a) {
      const b = orig.apply(this, a);
      if (rec && b) rec.buf.set(b, {bytes: 0});
      return b;
    });
    wrap(P, 'deleteBuffer', function (rec, orig, a) {
      if (rec && a[0]) rec.buf.delete(a[0]);
      return orig.apply(this, a);
    });
    wrap(P, 'bindBuffer', function (rec, orig, a) {
      if (rec) rec.boundBuf[a[0]] = a[1];
      return orig.apply(this, a);
    });
    wrap(P, 'bufferData', function (rec, orig, a) {
      if (rec) {
        const b = rec.buf.get(rec.boundBuf[a[0]]);
        if (b) b.bytes = typeof a[1] === 'number' ? a[1] : (a[1] ? a[1].byteLength : 0);
      }
      return orig.apply(this, a);
    });
    for (const n of ['flush', 'finish']) {
      wrap(P, n, function (rec, orig, a) {
        if (rec) traceOp(rec, n);
        return orig.apply(this, a);
      });
    }
    wrap(P, 'drawArrays', function (rec, orig, a) {
      const r = orig.apply(this, a);
      if (rec && rec.__watchPromotion) {
        // First draw after a mipmapped allocation: capture the promotion state
        // and the recent texture-op trace.
        rec.__watchPromotion = false;
        const s = record(`after promotion (first draw) ctx#${rec.id}`, {trace: rec.trace.slice(-25)});
      }
      return r;
    });
    wrap(P, 'drawElements', function (rec, orig, a) {
      const r = orig.apply(this, a);
      if (rec && rec.__watchPromotion) {
        rec.__watchPromotion = false;
        record(`after promotion (first draw) ctx#${rec.id}`, {trace: rec.trace.slice(-25)});
      }
      return r;
    });
  }

  window.__gpuLedger = {
    snapshot, record, events,
    peak: () => peak.snap,
    contexts: () => contexts.map(ctxSummary),
  };
})();
