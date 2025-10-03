# MyTouristPhoto — Netlify Functions Starter

**What it does**
- Static site + Netlify Functions (serverless) — no separate server needed.
- Resolves your Cloudinary public_id using your two folder styles (with/without Month).
- Shows SAMPLE-tiled previews for main + ±1 neighbors.
- Allows **one free clean download** via signed, time-limited Cloudinary URL.

## Deploy to Netlify (quick)
1. Put this folder in a GitHub repo (e.g., `mytouristphoto-netlify-functions-v1`).
2. In Netlify: **Add new site → Import from Git** and select the repo.
3. In **Site settings → Environment variables**, add:
   - `CLOUDINARY_CLOUD_NAME` = `dvqpndvej` (already defaulted, but set anyway)
   - `CLOUDINARY_KEY` = your Cloudinary API Key
   - `CLOUDINARY_SECRET` = your Cloudinary API Secret
4. Netlify build settings (auto from `netlify.toml`):
   - Build command: `npm install`
   - Publish directory: `public`
   - Functions directory: `netlify/functions`
5. Deploy. Visit your site URL.

**Manual test** (after deploy)
- Go to your site URL.
- Enter a real Photo ID and load the gallery.
- Click **Get Free Download** → receive a clean image via a time-limited link.

### Local test (optional)
```bash
npm install
# For local function emulation, install
# npm i -g netlify-cli
# netlify dev
```
Open the local URL it prints and test the UI.

### Notes
- Make sure you have uploaded a transparent PNG at Cloudinary public_id **`overlays/sample_word`**.
- Netlify Functions are stateless; the in-memory entitlement store is for demo only. For production, connect a DB (Supabase, DynamoDB, Postgres, etc.).
