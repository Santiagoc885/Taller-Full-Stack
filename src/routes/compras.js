// routes/compras.js
import { Router } from 'express';
import { body, param } from 'express-validator';
import pool from '../config/connection.js';
import { validateRequest } from '../middleware/errorHandler.js';

const router = Router();

// ── Validaciones ───────────────────────────────────────────
const compraValidations = [
  body('id_auto').isInt({ min: 1 }).withMessage('id_auto inválido'),
  body('id_vendedor').isInt({ min: 1 }).withMessage('id_vendedor inválido'),
  body('precio_compra').isFloat({ min: 0.01 }).withMessage('precio_compra debe ser mayor a 0'),
  body('fecha_compra').isDate().withMessage('fecha_compra inválida (YYYY-MM-DD)'),
];

// ── GET /compras ───────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        c.*,
        a.placa, a.marca, a.modelo, a.anio,
        CONCAT(pv.nombre, ' ', pv.apellido) AS vendedor_nombre,
        pv.cedula                            AS vendedor_cedula,
        IF(v.id_venta IS NOT NULL, 1, 0)    AS tiene_venta
      FROM compras c
      JOIN  autos    a  ON a.id_auto     = c.id_auto
      JOIN  personas pv ON pv.id_persona = c.id_vendedor
      LEFT JOIN ventas v ON v.id_compra  = c.id_compra
      ORDER BY c.fecha_compra DESC
    `);
    res.json({ success: true, data: rows, total: rows.length });
  } catch (err) { next(err); }
});

// ── GET /compras/:id ───────────────────────────────────────
router.get('/:id', param('id').isInt({ min: 1 }), validateRequest, async (req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        c.*,
        a.placa, a.marca, a.modelo, a.anio,
        CONCAT(pv.nombre, ' ', pv.apellido) AS vendedor_nombre,
        pv.cedula                            AS vendedor_cedula,
        pv.telefono                          AS vendedor_telefono
      FROM compras c
      JOIN autos    a  ON a.id_auto     = c.id_auto
      JOIN personas pv ON pv.id_persona = c.id_vendedor
      WHERE c.id_compra = ?
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Compra no encontrada' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
});

// POST /compras ──────────────────────────────────────────
router.post('/', compraValidations, validateRequest, async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { id_auto, id_vendedor, precio_compra, fecha_compra } = req.body;

    // Regla: el auto debe existir y estar disponible
    const [[auto]] = await conn.query(
      'SELECT id_auto, estado FROM autos WHERE id_auto = ?',
      [id_auto]
    );
    if (!auto)
      return res.status(404).json({ success: false, message: 'Auto no encontrado' });
    if (auto.estado === 'vendido')
      return res.status(400).json({ success: false, message: 'Este auto ya fue vendido y no puede comprarse nuevamente' });

    // Regla: no debe existir compra previa para ese auto
    const [[compraExistente]] = await conn.query(
      'SELECT id_compra FROM compras WHERE id_auto = ?',
      [id_auto]
    );
    if (compraExistente)
      return res.status(409).json({ success: false, message: 'Ya existe una compra registrada para este auto' });

    // Registrar compra
    const [result] = await conn.query(
      `INSERT INTO compras (id_auto, id_vendedor, precio_compra, fecha_compra)
       VALUES (?, ?, ?, ?)`,
      [id_auto, id_vendedor, precio_compra, fecha_compra]
    );
    const [[compra]] = await conn.query('SELECT * FROM compras WHERE id_compra = ?', [result.insertId]);

    await conn.commit();
    res.status(201).json({ success: true, data: compra, message: 'Compra registrada exitosamente' });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
});

// ── DELETE /compras/:id ────────────────────────────────────
router.delete('/:id', param('id').isInt({ min: 1 }), validateRequest, async (req, res, next) => {
  try {
    const [[ventaAsoc]] = await pool.query(
      'SELECT id_venta FROM ventas WHERE id_compra = ?',
      [req.params.id]
    );
    if (ventaAsoc)
      return res.status(400).json({ success: false, message: 'No se puede eliminar: existe una venta asociada a esta compra' });

    const [result] = await pool.query('DELETE FROM compras WHERE id_compra = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Compra no encontrada' });
    res.json({ success: true, message: 'Compra eliminada' });
  } catch (err) { next(err); }
});

export default router;