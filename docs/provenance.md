# Source and asset review

[简体中文](provenance.zh-CN.md) · [README](../README.md)

Reviewed on 2026-10-03. The runtime baseline was `3efa19d3dc33d051c55c5e6bea06732c932dd56a`; the publication preparation changes standardize internal names and add screenshot generation. They introduce no product dependency.

## Finding

The reviewed repository and build do not contain an identified proprietary Markdown Reader package, extracted CRX, account bridge, paid-feature module, or copied md-reader brand asset. The application uses its own TypeScript/Preact source and bundled, separately licensed rendering libraries. This finding covers the material available for inspection; Markdown Reader 3.x source is not public and was not available for a complete source comparison.

## Public reference

The [md-reader repository](https://github.com/md-reader/md-reader) describes itself as the old 2.x source. The inspected revision was `5727b5475c4ac2048719dcfa4053986f66180575`, with package version `2.12.12` and the [MIT license](https://github.com/md-reader/md-reader/blob/5727b5475c4ac2048719dcfa4053986f66180575/LICENSE), copyright Bener. That public license is not evidence of permission to use a separate, unpublished store version.

## Checks performed

- Compared the bytes of MarkDang source, public assets, and repository screenshots against files in the public reference: no identical file was found.
- Compared token sequences in 20 MarkDang and 33 reference source files. The only shared sequence of 40 or more tokens was a 56-token chain of ordinary HTML entity replacements. That commonplace helper pattern does not establish a product-specific source origin; these results are not a claim that every individual expression is unique.
- Checked package names, network destinations, imports, brand files, and the build pipeline. Neither `@md-reader/theme` nor `@md-reader/markdown-it-mermaid` is installed. No Markdown Reader account, entitlement, payment, or private API integration was found.
- Reviewed the 138 runtime dependency entries in the lockfile. The build includes their license texts in `THIRD_PARTY_NOTICES.txt`; third-party software remains under its own license. Manrope and Source Code Pro carry their bundled font licenses.
- Reviewed the project's C1 logos and icons against the public reference assets. There was no byte-identical asset. The release does not include the upstream logo, browser badges, or QR code.
- Found old internal rule names (`md_reader_*`), a build variable (`MDR_TARGET`), and an animation name (`mdrBootPulse`). These are now consistently named for MarkDang. Renaming identifiers is branding maintenance and does not establish or alter copyright provenance.

## Distribution

Build the ZIP from the reviewed source with `npm ci` and `npm run zip`. Keep the packaged project and third-party notices. Record the release commit and ZIP checksum when publishing; do not replace bundled libraries or assets with files taken from another extension installation.
