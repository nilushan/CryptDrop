import { Hono } from 'hono';
import type { Env } from './types.js';
import { corsMiddleware } from './middleware/cors.js';
import { healthRoutes } from './routes/health.js';
import { registerRoutes } from './routes/register.js';
import { lookupRoutes } from './routes/lookup.js';
import { inviteRoutes } from './routes/invite.js';
import { notifyRoutes } from './routes/notify.js';

const app = new Hono<{ Bindings: Env }>();

app.use('*', corsMiddleware());

app.route('/api', healthRoutes);
app.route('/api', registerRoutes);
app.route('/api', lookupRoutes);
app.route('/api', inviteRoutes);
app.route('/api', notifyRoutes);

app.notFound((c) => c.json({ error: 'API route not found' }, 404));

export default app;
