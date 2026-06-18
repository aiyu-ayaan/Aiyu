#!/usr/bin/env node
/**
 * Build the vendored TeX Live cache for the in-browser résumé compiler.
 *
 * The SwiftLaTeX engine fetches its TeX files from a server at compile time; the
 * public CDN is dead, so we self-host the exact files our template needs under
 * public/texlive-cache and serve them via the /texlive/pdftex route.
 *
 * This script compiles our real default template with `pdflatex -recorder`
 * inside the official `texlive/texlive` Docker image, then copies every file the
 * compile touched (flat, by basename) into the cache and adds SwiftLaTeX's
 * format file. Run once (and again whenever a résumé starts using new packages):
 *
 *   node scripts/build-texlive-cache.mjs
 *
 * Requires Docker. If a later compile's log says "TexLive File not exists <x>",
 * that package wasn't captured — add `\usepackage{<x>}` to the probe below (or
 * to your résumé) and re-run.
 */
import { execFileSync } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cacheDir = path.join(root, 'public', 'texlive-cache');
const workDir = path.join(root, '.texlive-build');
const IMAGE = 'texlive/texlive';
const FMT_URL = 'https://raw.githubusercontent.com/SwiftLaTeX/Texlive-Ondemand/master/swiftlatexpdftex.fmt';

function docker(args) {
  execFileSync('docker', args, { stdio: 'inherit' });
}

async function main() {
  try {
    execFileSync('docker', ['--version'], { stdio: 'ignore' });
  } catch {
    console.error('Docker is required but was not found on PATH.');
    process.exit(1);
  }

  await fs.mkdir(cacheDir, { recursive: true });
  await fs.rm(workDir, { recursive: true, force: true });
  await fs.mkdir(path.join(workDir, 'out'), { recursive: true });

  // 1) Probe document built from our real default template, so the captured
  //    file set matches what the résumé actually compiles.
  const { buildDefaultTemplate } = await import('../src/lib/resume/defaultTemplate.js');
  const { createDefaultResumeData } = await import('../src/lib/resume/schema.js');
  const tex = buildDefaultTemplate(createDefaultResumeData().schema);
  await fs.writeFile(path.join(workDir, 'main.tex'), tex);

  // 2) Compile twice with the recorder (second pass resolves refs).
  console.log(`Compiling probe in ${IMAGE} (first run pulls the image)…`);
  docker([
    'run', '--rm', '-v', `${workDir}:/work`, '-w', '/work', IMAGE,
    'sh', '-c',
    'pdflatex -recorder -interaction=nonstopmode main.tex >/dev/null 2>&1 || true; ' +
      'pdflatex -recorder -interaction=nonstopmode main.tex >/dev/null 2>&1 || true',
  ]);

  // 3) Parse the .fls recorder log → absolute system files the compile opened.
  const fls = await fs.readFile(path.join(workDir, 'main.fls'), 'utf8').catch(() => '');
  const inputs = [
    ...new Set(
      fls
        .split('\n')
        .filter((l) => l.startsWith('INPUT '))
        .map((l) => l.slice(6).trim())
        .filter((p) => p.startsWith('/')) // system texmf files only
    ),
  ];
  if (inputs.length === 0) {
    console.error('No files recorded — did the probe compile? Check .texlive-build/main.log');
    process.exit(1);
  }
  console.log(`Recorder listed ${inputs.length} system files. Extracting…`);
  await fs.writeFile(path.join(workDir, 'filelist.txt'), inputs.join('\n'));

  // 4) Copy those files (flat) out of the container.
  docker([
    'run', '--rm', '-v', `${workDir}:/work`, '-w', '/', IMAGE,
    'sh', '-c', 'while read f; do [ -f "$f" ] && cp "$f" /work/out/ ; done < /work/filelist.txt',
  ]);

  let copied = 0;
  for (const f of await fs.readdir(path.join(workDir, 'out'))) {
    await fs.copyFile(path.join(workDir, 'out', f), path.join(cacheDir, path.basename(f)));
    copied++;
  }

  // 5) Add SwiftLaTeX's engine-specific format file (not a normal TeX file).
  console.log('Fetching swiftlatexpdftex.fmt…');
  const res = await fetch(FMT_URL);
  if (!res.ok) throw new Error(`Failed to fetch .fmt (${res.status})`);
  await fs.writeFile(path.join(cacheDir, 'swiftlatexpdftex.fmt'), Buffer.from(await res.arrayBuffer()));

  await fs.rm(workDir, { recursive: true, force: true });
  const total = (await fs.readdir(cacheDir)).filter((f) => f !== 'README.md').length;
  console.log(`Done. ${total} files in public/texlive-cache (copied ${copied} + .fmt).`);
  console.log('Commit public/texlive-cache, then the résumé editor compiles offline.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
