//

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { globalErrorHandler } from './middleware/errorHandler.js';
import personasRouter from './routes/personas.js';
import autosRouter    from './routes/autos.js';
import comprasRouter  from './routes/compras.js';
import ventasRouter   from './routes/ventas.js';

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middlewares globales ───────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Servir archivos estáticos (Frontend) ───────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, '../public')));

// ── Ruta principal: servir index.html ───────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ── Request logger (desarrollo) ───────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
  });
}

// ── Health check ──────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'AutoMarket Pro API', timestamp: new Date().toISOString() });
});

// ── Rutas ─────────────────────────────────────────────────
app.use('/api/personas', personasRouter);
app.use('/api/autos',    autosRouter);
app.use('/api/compras',  comprasRouter);
app.use('/api/ventas',   ventasRouter);

// ── 404 ───────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Ruta no encontrada' });
});

// ── Error handler global ──────────────────────────────────
app.use(globalErrorHandler);

// ── Iniciar servidor ─────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  AutoMarket Pro API corriendo en http://localhost:${PORT}`);
  console.log(`📋  Endpoints disponibles:`);
  console.log(`    GET  /api/health`);
  console.log(`    CRUD /api/personas`);
  console.log(`    CRUD /api/autos`);
  console.log(`    CRUD /api/compras`);
  console.log(`    CRUD /api/ventas`);
  console.log(`    GET  /api/ventas/rentabilidad\n`);
});

export default app;