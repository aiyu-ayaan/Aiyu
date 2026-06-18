import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-static';

/**
 * Serve vendored TeX Live files to the in-browser SwiftLaTeX engine.
 *
 * The engine's worker writes each downloaded file to a path keyed by the
 * `fileid` response header, so a plain static host won't do — every file would
 * collide. This route reads the requested basename from a committed flat cache
 * (public/texlive-cache) and returns it with the required header. Missing files
 * return 301, which the worker treats as "file does not exist" (and caches).
 *
 * Read-only-container safe: it only reads committed files, never writes.
 * Populate the cache once via `node scripts/build-texlive-cache.mjs` (Docker).
 */
const CACHE_DIR = path.join(process.cwd(), 'public', 'texlive-cache');
const SAFE = /^[a-zA-Z0-9._-]+$/;

export async function GET(_request, { params }) {
  const { seg } = await params;
  // seg is [<fmt>, <name>] or ['pk', <dpi>, <name>] — the file is always last.
  const name = Array.isArray(seg) ? seg[seg.length - 1] : seg;

  if (!name || !SAFE.test(name)) {
    return new Response('Bad request', { status: 400 });
  }

  try {
    const data = await fs.readFile(path.join(CACHE_DIR, name));
    return new Response(data, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        fileid: name,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    // Not vendored — tell the worker it doesn't exist.
    return new Response('File not found', { status: 301 });
  }
}
