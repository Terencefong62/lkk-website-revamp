# Local preview

This branch includes all homepage images and media under:

- `zh-cn/files/home/` — hero video, story images, section photos
- `zh-cn/files/banner/` — video poster
- `modules/lkk-templates/images/` — logo, favicon, UI assets
- `files/live/sites/corporate/files/About US/` — submenu image

## Run locally

From the project root (the folder that contains `index.html`):

```bash
python3 -m http.server 8080
```

Open http://localhost:8080/

Do **not** double-click `index.html` directly. Asset paths are relative and still need a local web server for video/SVG behaviour.

## Download ZIP

https://github.com/Terencefong62/lkk-website-revamp/archive/refs/heads/cursor/lkk-corporate-homepage-e2f6.zip

After extracting, run the server command above from the extracted folder.
