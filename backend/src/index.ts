import { app } from './app.js';

// Local / container entry point. On Vercel the app is served serverlessly
// via api/index.ts instead.
const port = Number(process.env.PORT ?? 8080);

app.listen(port, () => {
  console.log(`backend listening on http://localhost:${port}`);
});
