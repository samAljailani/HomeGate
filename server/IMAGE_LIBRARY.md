# Public image library

Admins can manage images at `/admin/images` (Admin → Images). Click an image for a larger preview, upload a PNG or static SVG, copy its `/images/...` path, or delete an unused image. Public thumbnails remain readable by visitors; all management endpoints and the admin page require an active administrator account.

## Validation and limits

- Uploads require the session's CSRF token. Administrator status is checked against the database before the larger JSON body is parsed, and again by the controller's guard.
- Only filenames containing letters, numbers, underscores and hyphens with lowercase `.png` or `.svg` extensions are accepted. Paths, double extensions, reserved Windows device names and hidden files are rejected.
- PNG uploads are limited to 2 MiB, 4 megapixels and 4096 pixels per side. The signature and chunk boundaries are checked; animated, malformed and trailing-content files are rejected. Sharp fully decodes and re-encodes the pixels, stripping metadata. Decoding has a five-second processing limit.
- SVG uploads are limited to 256 KiB, 2000 elements and 32 levels of nesting. Saxes parses XML strictly; only approved static shapes, gradients, text and attributes are re-serialized. Scripts, event handlers, style blocks/attributes, embedded HTML, external resources, DTDs, processing instructions and unknown elements are rejected. Export complex artwork as PNG if it does not fit this subset.
- The library accepts at most 500 images and 100 MiB of image content. Upload/delete operations are serialized within the server process. Uploads are published atomically and never overwrite an existing filename.
- Files are read through regular-file checks and `O_NOFOLLOW` where supported. A symlinked storage root is rejected. Public responses use an explicit image MIME type, `nosniff` and a sandboxed Content Security Policy.
- The application logo and images referenced by services cannot be deleted. Update a service's image URL before deleting its old image.

## Storage

Local development uses `client/public/images` when running the server workspace. Otherwise, the default is the configured client build's `images` folder. Set `IMAGE_STORAGE_PATH` to an absolute, server-owned directory to override the location.

The production and QA Compose files set `IMAGE_STORAGE_PATH=/app/image-library/images` and mount a separate named volume. The volume is seeded once from the trusted images in the client build. Deleting an image will not restore it on restart. Keep this volume in backups; do not use `docker compose down -v` if you want to retain uploaded images. No database migration is required.

Do not give untrusted processes filesystem write access to this directory. Existing repository images are trusted assets; strict content validation applies to uploads through the manager. These controls reduce upload risk but do not replace ongoing dependency updates or an independent security review.

Implementation references: [Sharp constructor and limits](https://sharp.pixelplumbing.com/api-constructor/), [Saxes XML parser](https://github.com/lddubeau/saxes).

## Dependency audit

Compatible dependency updates are included for the existing Next.js, Nest platform, and URI/query parsing dependencies. The audit reports no findings for Sharp or Saxes. The repository still has audit findings in existing build-tool and Prisma/MySQL dependencies, as well as YAML parsing dependencies; a complete zero-advisory dependency upgrade is outside this feature. No forced major upgrades were applied. Run `npm audit` in CI and review these separately before treating the entire deployment as security-reviewed.

Relevant advisories: [Next.js image generation](https://github.com/advisories/GHSA-vcvr-r3jv-pc5j), [MySQL2 decompression](https://github.com/advisories/GHSA-rgwj-5xj2-c3m3).
