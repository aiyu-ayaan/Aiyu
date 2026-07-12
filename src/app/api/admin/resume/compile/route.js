import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { fetchWithTimeout } from '@/lib/upstreamControl';
import { RESUME_ENGINES } from '@/lib/resumeStudio';

/**
 * Compile LaTeX to PDF by proxying texlive.net's latexcgi service.
 * Proxied server-side so the editor avoids CORS and we can normalize the
 * "PDF on success / raw log on failure" contract into JSON the UI can render.
 */
const COMPILE_ENDPOINT = 'https://texlive.net/cgi-bin/latexcgi';
const COMPILE_TIMEOUT_MS = 90_000;
const MAX_LATEX_BYTES = 512 * 1024;

/** Pull "! error" blocks and l.<num> line markers out of a LaTeX log. */
function parseLatexLog(log) {
    const errors = [];
    const lines = log.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if (!lines[i].startsWith('!')) continue;
        const message = lines[i].replace(/^!\s*/, '').trim();
        let line = null;
        // The offending line number usually appears within a few lines: "l.42 ..."
        for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
            const match = lines[j].match(/^l\.(\d+)/);
            if (match) {
                line = Number(match[1]);
                break;
            }
        }
        errors.push({ message, line });
        if (errors.length >= 20) break;
    }
    return errors;
}

async function compile(request) {
    try {
        const { latex, engine } = await request.json();

        if (!latex || typeof latex !== 'string') {
            return NextResponse.json({ success: false, error: 'No LaTeX source provided' }, { status: 400 });
        }
        if (Buffer.byteLength(latex, 'utf8') > MAX_LATEX_BYTES) {
            return NextResponse.json({ success: false, error: 'Document too large (512KB max)' }, { status: 413 });
        }
        const compileEngine = RESUME_ENGINES.includes(engine) ? engine : 'pdflatex';

        const form = new FormData();
        form.append('filecontents[]', latex);
        form.append('filename[]', 'document.tex');
        form.append('engine', compileEngine);
        form.append('return', 'pdf');

        const response = await fetchWithTimeout(
            COMPILE_ENDPOINT,
            { method: 'POST', body: form },
            COMPILE_TIMEOUT_MS
        );

        const contentType = response.headers.get('content-type') || '';

        if (contentType.includes('application/pdf')) {
            const pdf = Buffer.from(await response.arrayBuffer());
            return NextResponse.json({
                success: true,
                data: {
                    pdfBase64: pdf.toString('base64'),
                    engine: compileEngine,
                    compiledAt: new Date().toISOString(),
                },
            });
        }

        // Non-PDF response is the compiler log (or an HTML error page).
        const log = await response.text();
        return NextResponse.json({
            success: false,
            error: 'Compilation failed',
            data: {
                log: log.slice(0, 200_000),
                errors: parseLatexLog(log),
                engine: compileEngine,
            },
        });
    } catch (error) {
        console.error('[Resume Compile] failed:', error);
        const message = error?.code === 'UPSTREAM_TIMEOUT'
            ? 'LaTeX service timed out — try again in a moment.'
            : 'Failed to reach the LaTeX compile service.';
        return NextResponse.json({ success: false, error: message }, { status: 502 });
    }
}

export const POST = withAuth(compile);
export const runtime = 'nodejs';
