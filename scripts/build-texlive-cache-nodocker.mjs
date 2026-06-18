#!/usr/bin/env node
/**
 * Build the vendored TeX Live cache for the in-browser résumé compiler.
 * This version does NOT require Docker; it downloads package .tar.xz archives
 * directly from CTAN mirrors and extracts them using the native `tar` command.
 */
import { execFileSync } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cacheDir = path.join(root, 'public', 'texlive-cache');
const tempDir = path.join(root, '.texlive-temp');
const FMT_URL = 'https://raw.githubusercontent.com/SwiftLaTeX/Texlive-Ondemand/master/swiftlatexpdftex.fmt';

const PACKAGES = [
  'latex',
  'geometry',
  'titlesec',
  'enumitem',
  'hyperref',
  'fancyhdr',
  'babel',
  'babel-english',
  'tools',
  'fontawesome5',
  'marvosym',
  'preprint',
  'lm',
  'graphics',
  'graphics-def',
  'url',
  'kvoptions',
  'etoolbox',
  'xcolor',
  'amsfonts',
  'pdftex',
  'l3backend',
  'l3packages',
  'l3kernel'
];

async function downloadFile(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.statusText} (${res.status})`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(destPath, buffer);
}

// Recursively copy all files from src flat into dest by basename
async function copyFilesFlat(srcDir, destDir) {
  const entries = await fs.readdir(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(srcDir, entry.name);
    if (entry.isDirectory()) {
      await copyFilesFlat(fullPath, destDir);
    } else if (entry.isFile()) {
      // Don't copy documentation, pdfs, sources or readmes unless needed.
      // But keep fonts, fd, sty, cls, def, clo, tfm, pfb, etc.
      const ext = path.extname(entry.name).toLowerCase();
      const skipExts = ['.pdf', '.txt', '.md', '.html', '.tex', '.dtx', '.ins', '.org'];
      if (!skipExts.includes(ext) && entry.name !== 'README') {
        const destPath = path.join(destDir, entry.name);
        await fs.copyFile(fullPath, destPath);
      }
    }
  }
}

async function main() {
  console.log('Starting TeX Live cache build (without Docker)...');

  // Verify that the native `tar` command is available
  try {
    execFileSync('tar', ['--version'], { stdio: 'ignore' });
  } catch {
    console.error('Error: Native `tar` command is required but was not found.');
    process.exit(1);
  }

  // Create clean directories
  await fs.mkdir(cacheDir, { recursive: true });
  await fs.rm(tempDir, { recursive: true, force: true });
  await fs.mkdir(tempDir, { recursive: true });

  // 1) Fetch swiftlatexpdftex.fmt
  console.log('\nFetching swiftlatexpdftex.fmt...');
  try {
    await downloadFile(FMT_URL, path.join(cacheDir, 'swiftlatexpdftex.fmt'));
    console.log('Saved swiftlatexpdftex.fmt.');
  } catch (err) {
    console.error(`Error downloading format file: ${err.message}`);
    process.exit(1);
  }

  // 2) Download and extract packages
  for (const pkg of PACKAGES) {
    console.log(`\nProcessing package: ${pkg}...`);
    const archiveUrl = `https://mirror.ctan.org/systems/texlive/tlnet/archive/${pkg}.tar.xz`;
    const archivePath = path.join(tempDir, `${pkg}.tar.xz`);
    const extractPath = path.join(tempDir, pkg);

    try {
      console.log(`  Downloading ${archiveUrl}...`);
      await downloadFile(archiveUrl, archivePath);

      console.log(`  Extracting...`);
      await fs.mkdir(extractPath, { recursive: true });
      execFileSync('tar', ['-xf', archivePath, '-C', extractPath], { stdio: 'inherit' });

      console.log(`  Copying files flat to cache...`);
      await copyFilesFlat(extractPath, cacheDir);
      console.log(`  Package ${pkg} completed.`);
    } catch (err) {
      console.error(`  Error processing package ${pkg}: ${err.message}`);
      // Don't fail the whole build if a minor package fails, but print error
    }
  }

  // Cleanup temp files
  console.log('\nCleaning up temporary files...');
  await fs.rm(tempDir, { recursive: true, force: true });

  const total = (await fs.readdir(cacheDir)).filter((f) => f !== 'README.md').length;
  console.log(`\nDone! Total files in public/texlive-cache: ${total}`);
  console.log('You can now commit the files under public/texlive-cache.');
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
