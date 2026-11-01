# BoxBuddy

Plan your home move like a small warehouse. List your furniture to get a
volume estimate and the right truck size. Then print QR box labels you can
scan to see what's inside without opening the box, and check every box on
and off the truck on moving day.

**Live app:** https://datawithdon.github.io/boxbuddy/ (try **Settings → Data & privacy → Load demo move**)

BoxBuddy is a static web app you can install on your phone, and it works offline. There's no account,
no server and no tracking, and everything stays on your device.

## Features

- **Inventory:** rooms with label colours. Add furniture from a built-in list of about 55 common items with typical moving volumes, or add your own.
- **Volume and weight:** totals overall and per room, in cubic feet and pounds or cubic metres and kilograms.
- **Truck size:** compares a cargo van and 10, 15, 20 and 26 ft trucks against your volume and weight, with a packing-efficiency slider. If one truck isn't enough, it tells you how many trips or trucks you'll need.
- **Load plan:** the order to load the truck:
  1. appliances and heavy items against the cab
  2. large furniture
  3. mattresses on edge
  4. heavy boxes on the floor, lighter boxes on top
  5. small items in the gaps
  6. fragile and open-first boxes last

  It includes a truck diagram and a printable version.
- **Boxes:** number, room, size, contents, and fragile / heavy / open-first flags. Search "kettle" or "passports" to find which box it's in.
- **How many boxes:** rule-of-thumb counts by home size compared with the boxes you've added.
- **QR box labels:** print two per page, with a big box number, a coloured room band and the colour's name (so it doesn't rely on colour alone), flags, the contents list, and a QR code.
  - **Any phone camera** can scan the code and see the contents. Helpers don't need the app or your data.
- **Scan:** use the camera to look boxes up, or mark them on the truck or delivered one scan at a time. You can also type the box number.
- **Moving day:** tick each box and piece of furniture on and off the truck, see what's missing, and record damage with photos. Prints a damage report for the movers.
- **Checklist:** about 24 standard tasks timed from moving day (8 weeks before through 2 weeks after), plus your own tasks.
- **Quotes:** compare hourly, flat, binding and truck-rental quotes side by side, including price per cubic foot.
- **Backup and restore:** a JSON file, with photos optional.

## Run it locally

```bash
python3 -m http.server 8000 --bind 127.0.0.1
# open http://127.0.0.1:8000
```

The camera needs `localhost` or HTTPS. Offline mode (the service worker) only switches on over HTTPS.

Run the tests (Node 20+, nothing to install):

```bash
npm test
```

## How the QR labels work

Each QR code is a link back to this app, with the box summary in the part of
the address after `#`:

```
https://datawithdon.github.io/boxbuddy/#/label/<box summary>
```

- **What's in it:** the box number, room, room colour, move name, size, flags and up to about 160 characters of contents.
- **It never reaches a server.** Browsers don't send the part after `#` to the web server, so the contents only ever go between the label and the phone that scans it.
- **The app re-checks every scanned label.** It treats them as untrusted, checks every field, and shows them as plain text.
- **Only your own move's labels change anything.** In BoxBuddy's own scanner, a label from a different move (a different move ID) is ignored, so it can't mark your boxes.

Anyone who scans a label can read what's on it. Don't list valuables or
personal documents on a label that will be on view. Write "Documents", not "Passports".

## Estimates

- Item volumes come from typical movers' "cube sheets". Real furniture varies.
- Weight defaults to about 7 lb per cubic foot, the movers' standard for household goods, unless you enter one.
- Truck volumes and payloads are typical rental figures. Check with your rental company.
- Box counts by home size are rules of thumb.

## Security and privacy

See [SECURITY.md](SECURITY.md). In short:
- The page loads only its own files and makes no network requests.
- Everything on screen is plain text (`textContent`, never `innerHTML`).
- Backups and stored data are rebuilt from a strict schema every time they're loaded.
- Photos are re-encoded, which removes GPS and other metadata.
- The app refuses to run inside another site's frame.

## Project structure

```
index.html            app shell + CSP
sw.js                 offline cache (this app's files only)
manifest.webmanifest  install as an app
css/styles.css        screen, dark mode, print (labels and reports)
js/engine/            pure logic, unit-tested in Node
  catalog.js          items, box sizes, trucks, room colours
  volume.js           totals, truck choice, box targets
  loadplan.js         loading order
  label.js            QR label encode/decode
  plan.js             checklist and quote comparison
  sanitize.js         schema rebuild for backups and stored data
js/views/             one file per screen
js/qr.js              QR drawing (SVG) and camera scanning
js/db.js, state.js    storage
vendor/               qrcode-generator 1.4.4 (MIT), jsQR 1.4.0 (Apache-2.0)
```

## License

MIT. Bundled libraries keep their own licenses: qrcode-generator (MIT,
Kazuhiko Arase) and jsQR (Apache-2.0, see `vendor/jsQR.LICENSE`).
