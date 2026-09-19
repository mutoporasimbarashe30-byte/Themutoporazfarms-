import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { getDb } from './src/server/db.ts';

import authRoutes from './src/server/routes/authRoutes.ts';
import userRoutes from './src/server/routes/userRoutes.ts';
import animalRoutes from './src/server/routes/animalRoutes.ts';
import birthDeathRoutes from './src/server/routes/birthDeathRoutes.ts';
import healthRoutes from './src/server/routes/healthRoutes.ts';
import feedRoutes from './src/server/routes/feedRoutes.ts';
import breedingRoutes from './src/server/routes/breedingRoutes.ts';
import dashboardRoutes from './src/server/routes/dashboardRoutes.ts';

async function startServer() {
  // 1. Initialize SQLite Database
  await getDb();
  console.log('✓ SQLite Database initialized & seeded with SIMBA admin and farm data');

  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // 2. Health check route
  app.get('/api/health-check', (req, res) => {
    res.json({
      status: 'ok',
      farm: 'The Mutoporaz Farms',
      manager: 'SIMBA',
      timestamp: new Date().toISOString(),
    });
  });

  // 3. Mount API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/animals', animalRoutes);
  app.use('/api/births-deaths', birthDeathRoutes);
  app.use('/api/health', healthRoutes);
  app.use('/api/feed', feedRoutes);
  app.use('/api/breeding', breedingRoutes);
  app.use('/api/dashboard', dashboardRoutes);

  // 4. Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✓ The Mutoporaz Farms server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
