import app from '../server';

// Vercel serverless entrypoint: all /api/* requests are rewritten here (vercel.json)
// and handled by the Express app, which defines routes like /api/food-analysis.
export default app;
