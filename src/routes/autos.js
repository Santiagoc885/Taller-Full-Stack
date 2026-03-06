// routes/autos.js
import { Router } from 'express';
import { body, param } from 'express-validator';
import multer from 'multer';
import pool from '../config/connection.js';
import { validateRequest } from '../middleware/errorHandler.js';

const router = Router();

// Configuración de multer para subir archivos
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// ── Validaciones ───────────────────────────────────────────
const autoValidations = [
  body('placa').trim().notEmpty().withMessage('La placa es requerida'),
  body('marca').trim().notEmpty().withMessage('La marca es requerida'),
  body('modelo').trim().notEmpty().withMessage('El modelo es requerido'),
  body('anio').isInt({ min: 1886, max: new Date().getFullYear() + 1 }).withMessage('Año inválido'),
  body('estado').optional().isIn(['disponible', 'vendido']).withMessage('Estado inválido'),
];

// ── GET /autos ─────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { estado, marca, search } = req.query;
    let sql = `
      SELECT a.*,
        c.id_compra, c.precio_compra, c.fecha_compra,
        v.id_venta, v.precio_venta, v.fecha_venta, v.ganancia
      FROM autos a
      LEFT JOIN compras c ON c.id_auto   = a.id_auto
      LEFT JOIN ventas  v ON v.id_compra = c.id_compra
      WHERE 1=1
    `;
    const params = [];
    if (estado) { sql += ' AND a.estado = ?';                params.push(estado); }
    if (marca)  { sql += ' AND LOWER(a.marca) LIKE ?';       params.push(`%${marca.toLowerCase()}%`); }
    if (search) {
      sql += ' AND (LOWER(a.placa) LIKE ? OR LOWER(a.marca) LIKE ? OR LOWER(a.modelo) LIKE ?)';
      const s = `%${search.toLowerCase()}%`;
      params.push(s, s, s);
    }
    sql += ' ORDER BY a.id_auto DESC';
    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows, total: rows.length });
  } catch (err) { next(err); }
});

// ── GET /autos/stats ── debe ir ANTES de /:id ──────────────
router.get('/stats', async (req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        COUNT(*)                      AS total_autos,
        SUM(a.estado = 'disponible') AS disponibles,
        SUM(a.estado = 'vendido')    AS vendidos,
        COALESCE(SUM(c.precio_compra), 0) AS total_invertido,
        COALESCE(SUM(v.precio_venta),  0) AS total_recaudado,
        COALESCE(SUM(v.ganancia),      0) AS ganancia_total
      FROM autos a
      LEFT JOIN compras c ON c.id_auto   = a.id_auto
      LEFT JOIN ventas  v ON v.id_compra = c.id_compra
    `);
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
});

// ── GET /autos/:id ─────────────────────────────────────────
router.get('/:id', param('id').isInt({ min: 1 }), validateRequest, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.*,
         c.id_compra, c.precio_compra, c.fecha_compra,
         CONCAT(pv.nombre, ' ', pv.apellido) AS vendedor_nombre,
         v.id_venta, v.precio_venta, v.fecha_venta, v.ganancia,
         CONCAT(pc.nombre, ' ', pc.apellido) AS comprador_nombre
       FROM autos a
       LEFT JOIN compras  c  ON c.id_auto     = a.id_auto
       LEFT JOIN personas pv ON pv.id_persona = c.id_vendedor
       LEFT JOIN ventas   v  ON v.id_compra   = c.id_compra
       LEFT JOIN personas pc ON pc.id_persona = v.id_comprador
       WHERE a.id_auto = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Auto no encontrado' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
});

// ── POST /autos ────────────────────────────────────────────
router.post('/', autoValidations, validateRequest, async (req, res, next) => {
  try {
    const { placa, marca, modelo, anio, estado } = req.body;
    const [result] = await pool.query(
      `INSERT INTO autos (placa, marca, modelo, anio, estado)
       VALUES (?, ?, ?, ?, ?)`,
      [placa.toUpperCase(), marca, modelo, anio, estado || 'disponible']
    );
    const [rows] = await pool.query('SELECT * FROM autos WHERE id_auto = ?', [result.insertId]);
    res.status(201).json({ success: true, data: rows[0], message: 'Auto registrado exitosamente' });
  } catch (err) { next(err); }
});

// PUT /autos/:id ─────────────────────────────────────────
router.put('/:id', param('id').isInt({ min: 1 }), autoValidations, validateRequest, async (req, res, next) => {
  try {
    const { placa, marca, modelo, anio, estado } = req.body;
    const [result] = await pool.query(
      `UPDATE autos
       SET placa = ?, marca = ?, modelo = ?, anio = ?, estado = ?
       WHERE id_auto = ?`,
      [placa.toUpperCase(), marca, modelo, anio, estado || 'disponible', req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Auto no encontrado' });
    const [rows] = await pool.query('SELECT * FROM autos WHERE id_auto = ?', [req.params.id]);
    res.json({ success: true, data: rows[0], message: 'Auto actualizado' });
  } catch (err) { next(err); }
});

// ── DELETE /autos/:id ──────────────────────────────────────
router.delete('/:id', param('id').isInt({ min: 1 }), validateRequest, async (req, res, next) => {
  try {
    const [result] = await pool.query('DELETE FROM autos WHERE id_auto = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Auto no encontrado' });
    res.json({ success: true, message: 'Auto eliminado' });
  } catch (err) { next(err); }
});

// ── POST /autos/import ─────────────────────────────────────
router.post('/import', upload.single('archivo'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No se proporcionó ningún archivo' });
    }

    const csv = req.file.buffer.toString('utf-8');
    const lineas = csv.split('\n').filter(l => l.trim());
    
    if (lineas.length < 2) {
      return res.status(400).json({ success: false, message: 'El archivo CSV está vacío o no tiene datos' });
    }

    // Encabezados esperados
    const headers = lineas[0].split(',').map(h => h.trim().toLowerCase());
    const expectedHeaders = ['placa', 'marca', 'modelo'];
    
    // Validar encabezados
    const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Faltan columnas requeridas: ${missingHeaders.join(', ')}` 
      });
    }

    const conn = await pool.getConnection();
    let insertados = 0;
    let duplicados = 0;
    let errores = 0;

    try {
      await conn.beginTransaction();

      for (let i = 1; i < lineas.length; i++) {
        const linea = lineas[i].trim();
        if (!linea) continue;

        // Parsear CSV (maneja comas dentro de comillas)
        const valores = [];
        let actual = '';
        let enComillas = false;
        
        for (const char of linea) {
          if (char === '"') {
            enComillas = !enComillas;
          } else if (char === ',' && !enComillas) {
            valores.push(actual.trim());
            actual = '';
          } else {
            actual += char;
          }
        }
        valores.push(actual.trim());

        // Mapear valores a columnas
        const placa = valores[headers.indexOf('placa')]?.toUpperCase();
        const marca = valores[headers.indexOf('marca')]?.trim();
        const modelo = valores[headers.indexOf('modelo')]?.trim();
        const anio = parseInt(valores[headers.indexOf('anio')]);


        // Validar datos requeridos
        if (!placa || !marca || !modelo || !anio) {
          errores++;
          continue;
        }

        // Verificar si ya existe
        const [[existe]] = await conn.query('SELECT id_auto FROM autos WHERE placa = ?', [placa]);
        if (existe) {
          duplicados++;
          continue;
        }

        // Insertar
        await conn.query(
          `INSERT INTO autos (placa, marca, modelo, anio, estado)
           VALUES (?, ?, ?, ?,'disponible')`,
          [placa, marca, modelo, anio]
        );
        insertados++;
      }

      await conn.commit();
      
      res.json({
        success: true,
        message: `Importación completada: ${insertados} vehículos registrados, ${duplicados} duplicados omitidos, ${errores} errores`
      });

    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

  } catch (err) { next(err); }
});

export default router;
