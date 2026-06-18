# Vendored TeX Live cache

These files are served to the in-browser SwiftLaTeX engine by the
`/texlive/pdftex` route so the résumé editor (`/admin/resume`) can compile LaTeX
without depending on the (now-dead) SwiftLaTeX package CDN.

**This directory is populated by a one-time build step — do not edit by hand.**

## Generate / refresh

Requires Docker:

```bash
node scripts/build-texlive-cache.mjs
```

It compiles the default résumé template with `pdflatex -recorder` inside the
official `texlive/texlive` image, copies every file the compile touched here
(flat, by basename), and adds SwiftLaTeX's `swiftlatexpdftex.fmt`. Commit the
result.

## Adding packages

If the editor's compile log shows `TexLive File not exists <name>`, that file
wasn't captured. Add the package to your résumé (and to the probe template if it
should be in the default), then re-run the script.
