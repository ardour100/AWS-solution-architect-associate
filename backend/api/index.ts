// Vercel serverless entry point. The Node.js runtime detects the
// default-exported Express app and forwards each request to it.
// Routes: vercel.json rewrites /api/(.*) to this function.
import { app } from '../src/app.js';

export default app;
