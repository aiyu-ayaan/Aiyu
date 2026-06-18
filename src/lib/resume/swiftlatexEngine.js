"use client";

/**
 * Browser-side SwiftLaTeX engine loader. The vendored PdfTeXEngine (under
 * /public/swiftlatex) is a classic script that hangs its export off a global
 * `exports` object and spawns a Web Worker that fetches TeX packages on demand.
 *
 * The whole engine (~1.8 MB wasm) loads ONLY here, on the /admin/resume route —
 * never in the public bundle. The server never runs this; compilation is 100%
 * client-side, and the resulting PDF is uploaded to be published.
 */

let enginePromise = null;
let compileChain = Promise.resolve();

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-swiftlatex]');
    if (existing) {
      if (existing.dataset.loaded === '1') return resolve();
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load LaTeX engine')));
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.dataset.swiftlatex = '1';
    script.onload = () => {
      script.dataset.loaded = '1';
      resolve();
    };
    script.onerror = () => reject(new Error('Failed to load LaTeX engine'));
    document.head.appendChild(script);
  });
}

/** Load + boot the engine once; subsequent calls reuse the same instance. */
export async function getEngine() {
  if (enginePromise) return enginePromise;
  enginePromise = (async () => {
    await loadScript('/swiftlatex/PdfTeXEngine.js');
    const Ctor =
      (typeof window !== 'undefined' && window.exports && window.exports.PdfTeXEngine) ||
      (typeof window !== 'undefined' && window.PdfTeXEngine);
    if (!Ctor) throw new Error('PdfTeXEngine unavailable after load');
    const engine = new Ctor();
    await engine.loadEngine();
    // Serve TeX files from our own origin (vendored cache) instead of the dead
    // SwiftLaTeX CDN. The /texlive route attaches the `fileid` header the worker
    // needs. setTexliveEndpoint closes the worker on some builds, so do it before
    // any compile and re-init lazily if needed.
    if (typeof engine.setTexliveEndpoint === 'function') {
      engine.setTexliveEndpoint(`${window.location.origin}/texlive/`);
    }
    return engine;
  })().catch((err) => {
    enginePromise = null; // allow a retry on failure
    throw err;
  });
  return enginePromise;
}

/** Uint8Array → base64 without blowing the call stack on large PDFs. */
export function bytesToBase64(bytes) {
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/**
 * Compile a set of in-memory files. Compiles are serialized — the worker can
 * only run one job at a time. Returns { ok, pdf:Uint8Array|null, log, status }.
 */
export async function compileLatex({ files = [], entry = 'main.tex' } = {}) {
  const run = compileChain.then(async () => {
    const engine = await getEngine();
    for (const file of files) engine.writeMemFSFile(file.name, file.content);
    engine.setEngineMainFile(entry);
    const result = await engine.compileLaTeX();
    const pdf = result.pdf ? new Uint8Array(result.pdf) : null;
    return { ok: Boolean(pdf), pdf, log: result.log || '', status: result.status };
  });
  // Keep the chain alive even if this compile throws.
  compileChain = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}
