# Classgrid AI proxy

Tiny Vercel function that lets the app read PDFs/photos with Gemini without putting your key in the app.

## Set up
1. Get a free key: https://aistudio.google.com/apikey
2. Deploy this `proxy` folder to Vercel (Root Directory = `proxy`).
3. In Vercel → Settings → Environment Variables add `GEMINI_API_KEY` = your key. Redeploy.
4. Your endpoint is `https://<your-project>.vercel.app/api/extract`.
5. In GitHub → Settings → Secrets and variables → Actions → **Variables**, add `AI_PROXY_URL` = that endpoint, then re-run the deploy.

Optional env variables: `GEMINI_MODEL` (default gemini-2.5-flash), `LIMIT_PER_HOUR` (default 20 per IP), `ALLOWED_ORIGIN` (lock to your site; leave empty so the Android app also works).
