# LeetGame Landing Page

The standalone marketing site for LeetGame. It lives separately from the
Flutter application so the landing page can be deployed and iterated without
changing the mobile app.

## Local development

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

## Validation

```bash
npm test
npm run build:vercel
```

`npm test` verifies the standard production build and server-rendered content.
`npm run build:vercel` generates Vercel Build Output API artifacts.

## Deploying to Vercel

1. Import the `SurajGavali/LeetGame` repository in Vercel.
2. Set **Root Directory** to `landing-page`.
3. Leave environment variables empty.
4. Keep the build command from `vercel.json`.
5. Do not override the output directory; the build creates
   `.vercel/output` in Vercel's native Build Output API format.

The landing page has no backend, database, or runtime secrets.
