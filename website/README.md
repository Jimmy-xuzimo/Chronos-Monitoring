# CHRONOS project website

The bilingual static project website is published at:

https://jimmy-xuzimo.github.io/Chronos-Monitoring/

## Local preview

From the repository root, run a static HTTP server, for example:

```sh
python3 -m http.server 8080 --directory website
```

Open http://localhost:8080. No Node.js dependencies, package installation or build step is required. Clipboard access requires HTTPS or localhost.

## Deployment

In GitHub **Settings → Pages → Build and deployment**, select **GitHub Actions**. The `Deploy project website` workflow publishes only `website/` after changes to this directory are pushed to `main`. It can also be run manually from Actions.

All website assets use relative URLs and support the `/Chronos-Monitoring/` project path. The monitoring application in `frontend/` and `backend/` is deployed separately on your server; it is not included in the Pages artifact.

## Maintenance

- `index.html`: structure and default Chinese content, metadata, destination links, installation commands.
- `app.js`: Chinese/English dictionary, interaction logic and clearly labeled illustrative metric data. Keep the default Chinese HTML in sync with dictionary edits so core content remains available without JavaScript.
- `preferences.js`: applies initial language and theme preference before styles load.
- `style.css`: design tokens, both themes, responsive layouts, reduced-motion behavior.
- `assets/`: local monospace font reused from the project, SVG favicon and 1200×630 PNG social cover.

Theme selection cycles **System → Dark → Light → System**. First visits follow the OS theme and browser language; explicit choices are stored locally. The metric preview uses fixed sample data and makes no requests to a monitoring backend.

The website uses one URL for both languages, with Chinese in the initial HTML. Client-side switching updates the document language, title and description. This does not provide separate indexed English and Chinese pages. Social crawlers typically use the initial static metadata.

If the repository name, account or domain changes, update canonical and Open Graph URLs in `index.html`. No analytics, remote fonts or CDN scripts are included.

## Accessibility and testing

The layout provides keyboard focus indicators, a skip link, semantic disclosures, accessible theme/language controls and keyboard-operable metric tabs. Mobile navigation supports Escape and returns focus appropriately. Reduced-motion preferences disable animations and smooth scrolling.

Before publishing changes, verify both languages and themes at narrow mobile, landscape mobile, portrait/landscape tablet and desktop widths. Check the project subpath, keyboard controls, menu, clipboard feedback and links. Browser automation is useful, but does not replace testing on physical devices or with assistive technology.
