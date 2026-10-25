# Kasoko Safaris & Tours — QA report

Checked 25 October 2026. This report applies to this ZIP, not earlier releases.

## Delivered changes

- A cleaner Arusha-led homepage, restrained green and cream styling, clearer typography, simpler cards and a fixed header that compacts without moving the page content.
- Separate safaris, tours, hotels, locations, tickets, about and contact pages, plus a custom 404 page. There are 60 HTML pages in total.
- 27 destination listings and 22 hotels. Arusha, Manyara and Tanga appear in the homepage selections. No Kenya listings or routes appear in the site.
- 56 distinct, locally stored photographs. Each of the 49 listings has its own primary image. Photo sources and supplied Creative Commons licences are recorded in the credits page.
- Replaced the heavily processed Ngorongoro view, Elewana dusk scene, Zuri poster and undersized Mkomazi image. Added actual room/pool gallery photos and Emayani Beach Lodge in Pangani.
- Corrected Mkomazi Hotels and Campsite to Kisiwani, Same, Kilimanjaro; it is described as an extension for a longer itinerary, not a hotel in Tanga city.
- JPEG images load directly from the project, with smaller card copies and same-subject local fallbacks. There are no third-party image requests or fabricated scenic placeholders. Missing images show an honest text message after retries.
- Preserved English/Kiswahili, light/dark controls, phone contacts, developer credit and private booking delivery.
- Preserved all nine request services, validation, review, duplicate-click protection, stable retry identifiers and safe text rendering. Language changes preserve entered information and selections.
- Removed stray visible `html`, added image dimensions, corrected duplicate descriptions, and synchronized navigation, metadata, credits and sitemap.

## Verification

| Check | Result |
| --- | --- |
| HTML structure, headings, IDs, local links, anchors, translations, metadata and CSS parsing | Passed on all 60 pages; 14,717 static assertions |
| Primary images and photo variants | 56 unique source photographs; 224 local image variants decoded; every listing points to its own image |
| Photo subject review | Original contact sheet and all new photographs visually inspected; new content sourced from property sites or attributed Commons files |
| Page scripts, languages, themes, mobile menu behavior and compact header thresholds | Passed in DOM simulation |
| Regional filtering, search, accented names, empty states and Show more | Passed in DOM simulation |
| Gallery selection, attribution, language changes and image failure fallbacks | Passed in DOM simulation |
| All 49 listing-to-booking links and Kiswahili prefills | Passed |
| All nine booking services in English and Kiswahili | Passed, including required fields, hotel checkout, one-way tickets, review and receipts |
| Failed submission, malformed receipt, safe retries, duplicate clicks and HTML injection | Passed with mocked responses |
| Browser DOM test suite | 5,562 assertions passed; 21 mocked submissions; zero external requests |
| API and private Apps Script receiver | 44 assertions passed, including request validation, matching receipts, deduplication and spreadsheet formula safety |
| JavaScript syntax | All application and API files passed |

## Limits of these checks

Rendered desktop, tablet and phone browser checks were not completed. The available local preview route was blocked in the earlier environment. DOM tests exercise scripts but do not measure visual layout, contrast in a rendered page, or device performance.

No live Google Sheet, email or WhatsApp message was sent. The private webhook environment variables and actual delivery still need a test after deployment. The site collects booking requests; it does not confirm supplier inventory, issue tickets or charge payments automatically.

The completed project was built from the recovered source archive attached to this conversation. The separately saved R4 archive could not be materialized during recovery and was not used as the code baseline. The implementation and checks above apply to this delivered package.

## Repeat the tests

The website itself needs no frontend installation or build step. For the optional DOM and API tests, with Node.js 20 or newer:

```sh
npm install --prefix qa
npm --prefix qa test
```

For the optional static and image checks, with Python:

```sh
python -m pip install -r qa/requirements.txt
python qa/static.test.py
```

No test sends a real booking or message.
