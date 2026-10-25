# Kasoko Safaris & Tours

A complete static website for an Arusha-based Tanzania travel business: 27 safari/tour destinations, 22 hotels, and requests for flights, buses, ferries, trains, transfers and combined trips. English/Kiswahili and light/dark controls are available throughout.

## Test on your computer

1. Extract the ZIP completely.
2. Open the `kasoko-travels` folder.
3. Double-click `index.html`.

Keep all files and the `assets` folder together. The 56 photographs are included locally; there is no remote image service to configure. Core page navigation and form review work locally. Google Maps, web fonts, external source links and sending requests need internet access.

A local static preview cannot run the private booking receiver. It will never pretend that a request was received: if delivery fails, the traveller keeps their details and can download a summary or choose WhatsApp.

## Upload to GitHub and Vercel

Upload the contents inside `kasoko-travels` to the root of the existing website repository. Keep the HTML, shared JavaScript/CSS, `api`, and `assets` together. Choose the Other/static project preset; no frontend build command is needed.

The current canonical URLs use `https://new-kasoko-travels.vercel.app`. If using another domain, replace that address in the HTML metadata, `sitemap.xml` and `robots.txt`.

The `qa` directory is for optional tests and does not form part of the customer flow. Keep the existing server environment variables when updating your deployment.

## Enable private booking delivery

Follow `google-apps-script-alerts-template.txt` to create a private Google Sheet receiver and optional email alerts. Set its Script Properties `SHEET_ID`, `ALERT_EMAIL` and `WEBHOOK_SECRET` as described in that file.

Set these Vercel environment variables:

- `BOOKING_WEBHOOK_URL`: your deployed HTTPS Google Apps Script URL ending in `/exec`.
- `BOOKING_WEBHOOK_SECRET`: the same private value as the receiver's `WEBHOOK_SECRET`.

Redeploy after changing environment variables. Keep email addresses and secrets out of public frontend files. The receiver confirms receipt only after saving the request; Kasoko must still confirm supplier availability and price.

GitHub Pages can host the pages but cannot run `/api/bookings`. Use a deployment that supports the included Vercel API function for direct online request delivery.

## Make future edits

- Listing details and photo paths: `catalog.js`.
- English/Kiswahili interface copy: `translations.js`.
- Current visual refinements: `editorial.css`, with the existing shared base in `styles.css` and `refinements.css`.
- Public contacts and booking endpoint: `config.js`.
- Individual page content: the corresponding HTML file. Keep its initial content consistent with `catalog.js`.
- Photo credits and provenance: `credits.html`, `photo-sources.json`, `SOURCES.md`.
- Private receiver: `api/bookings.mjs` and `google-apps-script-alerts-template.txt`.

Use a distinct, verified photo for each new listing. Keep image filenames lowercase and place actual image files in `assets/photos`; update matching smaller copies in `assets/photos/thumbs`. Do not substitute a different hotel or generated landscape when a source image is missing.

Read `QA-NOTES.md` for the tests passed and the remaining live-device and delivery checks.

## Contact numbers

0789 515 769 · 0744 355 769 · 0762 917 519
