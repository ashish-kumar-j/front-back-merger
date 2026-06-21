# Document Merge & Compress

A free, single-file, browser-based tool for merging front/back document pairs into one file and for shrinking image/PDF file sizes. No installs, no accounts, no server — everything runs locally in your browser tab.

**[Open the live tool](https://ashish-kumar-j.github.io/front-back-merger/)** *(enable GitHub Pages in repo settings if this 404s — see below)*

---

## Why this exists

A simple way to:
- Combine a front + back pair of images (business cards, double-sided forms, scanned receipts, etc.) into a single PDF or image, laid out side-by-side or stacked.
- Drop in a PDF and have its pages automatically split into images, ready to mix and match with front/back pairs.
- Shrink the file size of images or PDFs to hit a target size (for email attachment limits, upload caps, etc.).

## Privacy

This tool does not upload your files anywhere. All processing — image decoding, PDF rendering, compression, and file generation — happens entirely client-side in your browser using JavaScript. Nothing is sent to a server, logged, or stored. You can verify this yourself by reading `index.html` — it's a single, unminified, readable file.

The only network activity is loading two open-source libraries from a public CDN (jsPDF and pdf.js) when the page first opens. If you need a fully offline version with no network calls at all, see [Offline version](#offline-version) below.

## Features

### Merge mode
- Drag and drop JPG, PNG, or PDF files
- PDFs are automatically split into one image per page
- Auto-pairs files in drop order (1st = front, 2nd = back, ...)
- Manual swap/remove controls per pair
- Output as PDF (A4 / Letter / A5, portrait/landscape) or as JPEG/PNG images
- Stacked or side-by-side layout
- Optional max file size (JPEG) and max dimensions (JPEG/PNG)

### Compress mode
- Drop in images or PDFs to shrink them individually (no merging)
- Target file size in KB/MB
- Max dimension cap for images
- PDF compression works by re-rendering pages as images at a chosen quality and rebuilding the PDF — most effective on scanned/image-heavy PDFs

## Usage

1. Open `index.html` in any modern browser (Chrome, Edge, Firefox, Safari), or visit the GitHub Pages link above.
2. Pick a mode: **Merge front/back pairs** or **Reduce file size**.
3. Drag your files in, adjust the output options, click Generate/Compress.
4. Files download directly to your device.

No build step, no dependencies to install — it's one HTML file.

## Running locally

```bash
git clone https://github.com/ashish-kumar-j/front-back-merger.git
cd front-back-merger
open index.html   # macOS
# or just double-click index.html in your file explorer
```

## Hosting it yourself (GitHub Pages)

1. Push this repo to GitHub.
2. Go to **Settings → Pages**.
3. Under **Source**, select the `main` branch and `/ (root)` folder.
4. Save — GitHub will give you a URL like `https://ashish-kumar-j.github.io/front-back-merger/`.

## Offline version

The default `index.html` loads two libraries from a CDN (cdnjs.cloudflare.com) on first open:
- [jsPDF](https://github.com/parallax/jsPDF) — PDF generation
- [pdf.js](https://github.com/mozilla/pdf.js) — PDF reading/rendering

If you need a version with zero network dependency (e.g. for use on an air-gapped machine), the libraries can be bundled directly into the HTML file as inline `<script>` tags, with the pdf.js worker embedded as a base64-encoded Blob. This roughly triples the file size (to ~2 MB) since the libraries are vendored inline rather than fetched. This isn't included in this repo to keep the source readable and the diff history clean, but can be generated as a separate build artifact if needed.

## Tech

Single HTML file. No build tools, no framework, no package.json. Uses:
- Vanilla JavaScript
- [jsPDF](https://github.com/parallax/jsPDF) (PDF generation)
- [pdf.js](https://github.com/mozilla/pdf.js) (PDF rendering)
- Browser-native Canvas API for image processing

## License

MIT — see [LICENSE](LICENSE).
