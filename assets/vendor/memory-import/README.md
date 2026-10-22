# Local file parsers

Vendored for offline local HTML preview; no document content is sent to these projects.

- PDF.js 6.4.299, Apache-2.0. Source: https://registry.npmjs.org/pdfjs-dist . Bundled legacy PDF / worker ES modules to IIFE with esbuild 0.28.2; the worker handler runs locally without remote module loading. https://mozilla.github.io/pdf.js/
- Mammoth 1.13.0, BSD-2-Clause. Source: https://registry.npmjs.org/mammoth . Browser minified bundle, raw-text API only; no converted HTML injected. https://github.com/mwilliamson/mammoth.js
- SheetJS CE 0.20.3, Apache-2.0. Source: https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js . No macros executed and no formula recalculation. https://docs.sheetjs.com/

Libraries load on demand from this local folder. Imported originals and extracted text are kept in a dedicated IndexedDB database, not written to Windows filesystem paths or a model knowledge index.
