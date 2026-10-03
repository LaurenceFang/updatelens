# Self-hosted typography and icon provenance

These are the two font families approved for the Literary Graphite interface. Both local files are **normal-style variable WOFF2**, downloaded from Google's official public font delivery service. No runtime CDN dependency or system font installation is required. Files were retrieved and inspected on 2026-10-03.

## Newsreader

- Local runtime URL: `/fonts/newsreader-latin-variable.woff2`
- Binary source: https://fonts.gstatic.com/s/newsreader/v26/cY9AfjOCX1hbuyalUrK4397yjA.woff2
- Official repository metadata: https://github.com/google/fonts/tree/main/ofl/newsreader
- Upstream repository named by Google Fonts: https://github.com/productiontype/NewsReader
- Retained original license: `Newsreader-OFL.txt`, SIL Open Font License 1.1. Copyright 2020 The Newsreader Project Authors.
- Actual local WOFF2 axes inspected with fontTools and Node's built-in Brotli decoder: `wght` 200–800, default 400; `opsz` 6–72, default 18. Internal family label is Newsreader 16pt; the CSS alias below deliberately uses Newsreader.
- Approved usage: weight 400 or 500, explicit optical size 22 or 24 for the editorial interface; avoid old bold headline styling.
- Bytes: 132000. SHA-256: `6e4f2958c3a7c4a80acde4e5a679abe7e01bc1e30b92be3c7a8b696ef401d101`.

## Instrument Sans

- Local runtime URL: `/fonts/instrument-sans-latin-variable.woff2`
- Binary source: https://fonts.gstatic.com/s/instrumentsans/v4/pxiTypc9vsFDm051Uf6KVwgkfoSxQ0GsQv8ToedPibnr0SZe1Q.woff2
- Official repository metadata: https://github.com/google/fonts/tree/main/ofl/instrumentsans
- Upstream repository named by Google Fonts: https://github.com/Instrument/instrument-sans
- Retained original license: `InstrumentSans-OFL.txt`, SIL Open Font License 1.1. Copyright 2022 The Instrument Sans Project Authors.
- Actual local WOFF2 axis: `wght` 400–700, default 400. Google Fonts' normal-width CSS request fixes width to 100%, so this delivered file has no `wdth` axis. UI weights 400/500/600 are supported.
- Code values can inherit Instrument Sans; no third custom monospace family is supplied.
- Bytes: 30092. SHA-256: `2ee17598a98d8a59e4df8152d015bec9ab8e4d5672cc0ab42bef806b568e3971`.

## Public acquisition request and coverage

Google Fonts CSS2 request:

https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400..700&family=Newsreader:opsz,wght@6..72,200..800&display=swap

The downloaded files are the Latin subsets returned by this official request. They cover the English product text and listed punctuation; non-Latin user-entered project names may use the browser's system fallback. Font binaries are unchanged. The original OFL notices are retained beside them and permit bundling/redistribution under their stated terms; fonts are not sold separately.

License sources:

- https://raw.githubusercontent.com/google/fonts/main/ofl/newsreader/OFL.txt
- https://raw.githubusercontent.com/google/fonts/main/ofl/instrumentsans/OFL.txt

## CSS integration reference

The frontend owner applies these declarations in the app stylesheet; this provenance file does not itself alter UI styles.

```css
@font-face {
  font-family: "Newsreader";
  src: url("/fonts/newsreader-latin-variable.woff2") format("woff2");
  font-style: normal;
  font-weight: 200 800;
  font-display: swap;
}
@font-face {
  font-family: "Instrument Sans";
  src: url("/fonts/instrument-sans-latin-variable.woff2") format("woff2");
  font-style: normal;
  font-weight: 400 700;
  font-stretch: 100%;
  font-display: swap;
}
/* Editorial labels/headings: 400 or 500, not 700. */
.editorial-title {
  font-family: "Newsreader", serif;
  font-weight: 400;
  font-variation-settings: "opsz" 22;
}
/* UI text and code values: use the same sans family. */
.interface-text {
  font-family: "Instrument Sans", sans-serif;
  font-weight: 400;
}
```

## Standard icons

`@phosphor-icons/react` 2.1.10 is installed in package/lock. Its official repository and package declare the MIT license: https://github.com/phosphor-icons/react. The original MIT notice is in the installed package's `LICENSE` and redistributed by the npm package.

Use the regular outline variant and direct imports, as recommended by the official package documentation:

```tsx
import { ArrowRightIcon } from "@phosphor-icons/react/dist/csr/ArrowRight";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";

<ArrowRightIcon weight="regular" size={18} color="currentColor" aria-hidden="true" />;
```

Direct import resolution and a React static render of the regular variant were verified. Avoid wildcard/all-icons imports, which load thousands of modules in development. No handwritten replacement SVGs, div/emoji icons, or animation library are added.
