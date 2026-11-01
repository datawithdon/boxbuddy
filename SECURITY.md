# Security notes

BoxBuddy is a static web app. It has no server, no accounts and no analytics.

## What's protected and how

| Area | Protection |
|---|---|
| Network | The CSP allows only same-origin scripts, styles, images and workers. It also allows `connect-src 'self'`, but the app makes no network requests apart from loading its own files. |
| Code injection | All text is rendered with `textContent` or DOM APIs, never `innerHTML`. QR codes are built as SVG elements, not markup strings. |
| Clickjacking | The app refuses to run inside another site's frame. GitHub Pages can't send `frame-ancestors` headers, so the app enforces this itself. |
| Backups and stored data | Every record is rebuilt from a fixed schema when a backup is restored and each time the app loads. Unknown keys (including `__proto__`), wrong types and oversized values are dropped. |
| Scanned labels | Label payloads are base64url JSON, capped at 1,200 characters. Every field is type-checked and length-limited. Labels from another move ID can't change your data. |
| Photos | Photos are re-encoded through a canvas, which strips EXIF metadata (including GPS). Only base64 PNG, JPEG, WebP and GIF data URLs are accepted. |
| CSV export | Cells starting with `= + - @` are prefixed so they can't run as spreadsheet formulas. |
| Offline cache | The service worker handles only same-origin GET requests inside the app's own path, and deletes only its own old caches. |
| Third-party code | Two libraries are vendored and pinned: qrcode-generator 1.4.4 and jsQR 1.4.0. Both were checked for network calls, `eval` and HTML injection. jsQR loads only when the browser lacks `BarcodeDetector`. |

## Known limits

- **Data is stored unencrypted in the browser** (IndexedDB). Anyone with access to the browser profile can read it.
- **Anyone can read a label.** Whoever scans a QR label sees its contents. Anyone can also make a QR code that opens the label page with text of their choice; it's shown as plain text and changes nothing.
- **Shared origin.** GitHub Pages serves all of an account's project sites from one origin (`<user>.github.io`), and those sites share browser storage. Keep that account free of untrusted pages, or host BoxBuddy on its own domain.
