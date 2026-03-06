// routes/ventas.js
import { Router } from 'express';
import { body, param } from 'express-validator';
import pool from '../config/connection.js';
import { validateRequest } from '../middleware/errorHandler.js';

const router = Router();

// ── Validaciones ───────────────────────────────────────────
const ventaValidations = [
  body('id_compra').isInt({ min: 1 }).withMessage('id_compra inválido'),
  body('id_comprador').isInt({ min: 1 }).withMessage('id_comprador inválido'),
  body('precio_venta').isFloat({ min: 0.01 }).withMessage('precio_venta debe ser mayor a 0'),
  body('fecha_venta').isDate().withMessage('fecha_venta inválida (YYYY-MM-DD)'),
];

// ── GET /ventas ────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        v.*,
        a.placa, a.marca, a.modelo, a.anio,
        c.precio_compra,
        CONCAT(pc.nombre, ' ', pc.apellido) AS comprador_nombre,
        pc.cedula                            AS comprador_cedula
      FROM ventas v
      JOIN compras  c  ON c.id_compra   = v.id_compra
      JOIN autos    a  ON a.id_auto     = c.id_auto
      JOIN personas pc ON pc.id_persona = v.id_comprador
      ORDER BY v.fecha_venta DESC
    `);
    res.json({ success: true, data: rows, total: rows.length });
  } catch (err) { next(err); }
});

// ── GET /ventas/rentabilidad ── debe ir ANTES de /:id ──────
router.get('/rentabilidad', async (req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        a.placa,
        CONCAT(a.marca, ' ', a.modelo, ' (', a.anio, ')') AS vehiculo,
        c.precio_compra,
        v.precio_venta,
        v.ganancia,
        ROUND((v.ganancia / c.precio_compra) * 100, 2)    AS porcentaje_ganancia,
        v.fecha_venta,
        CONCAT(pc.nombre, ' ', pc.apellido)               AS comprador
      FROM ventas v
      JOIN compras  c  ON c.id_compra   = v.id_compra
      JOIN autos    a  ON a.id_auto     = c.id_auto
      JOIN personas pc ON pc.id_persona = v.id_comprador
      ORDER BY v.ganancia DESC
    `);
    const totales = rows.reduce((acc, r) => ({
      total_compras:  acc.total_compras  + parseFloat(r.precio_compra),
      total_ventas:   acc.total_ventas   + parseFloat(r.precio_venta),
      ganancia_total: acc.ganancia_total + parseFloat(r.ganancia),
    }), { total_compras: 0, total_ventas: 0, ganancia_total: 0 });

    res.json({ success: true, data: rows, totales, total: rows.length });
  } catch (err) { next(err); }
});

// ── GET /ventas/:id ────────────────────────────────────────
router.get('/:id', param('id').isInt({ min: 1 }), validateRequest, async (req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        v.*,
        a.placa, a.marca, a.modelo, a.anio,
        c.precio_compra, c.fecha_compra,
        CONCAT(pv.nombre, ' ', pv.apellido) AS vendedor_nombre,
        CONCAT(pc.nombre, ' ', pc.apellido) AS comprador_nombre,
        pc.telefono                          AS comprador_telefono
      FROM ventas v
      JOIN compras  c  ON c.id_compra   = v.id_compra
      JOIN autos    a  ON a.id_auto     = c.id_auto
      JOIN personas pv ON pv.id_persona = c.id_vendedor
      JOIN personas pc ON pc.id_persona = v.id_comprador
      WHERE v.id_venta = ?
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Venta no encontrada' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
});

// POST /ventas ───────────────────────────────────────────
router.post('/', ventaValidations, validateRequest, async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { id_compra, id_comprador, precio_venta, fecha_venta } = req.body;

    // Regla: la compra debe existir y el auto no estar vendido
    const [[compra]] = await conn.query(
      `SELECT c.id_compra, c.precio_compra, a.estado, a.id_auto
       FROM compras c
       JOIN autos a ON a.id_auto = c.id_auto
       WHERE c.id_compra = ?`,
      [id_compra]
    );
    if (!compra)
      return res.status(404).json({ success: false, message: 'Compra no encontrada. El vehículo debe comprarse primero' });
    if (compra.estado === 'vendido')
      return res.status(400).json({ success: false, message: 'Este vehículo ya fue vendido' });

    // Regla: no puede existir venta previa para esta compra
    const [[ventaExistente]] = await conn.query(
      'SELECT id_venta FROM ventas WHERE id_compra = ?',
      [id_compra]
    );
    if (ventaExistente)
      return res.status(409).json({ success: false, message: 'Ya existe una venta para esta compra' });

    // Calcular ganancia
    const ganancia = parseFloat(precio_venta) - parseFloat(compra.precio_compra);

    // Insertar venta
    const [result] = await conn.query(
      `INSERT INTO ventas (id_compra, id_comprador, precio_venta, fecha_venta, ganancia)
       VALUES (?, ?, ?, ?, ?)`,
      [id_compra, id_comprador, precio_venta, fecha_venta, ganancia]
    );

    // Actualizar estado del auto a 'vendido'
    await conn.query(
      'UPDATE autos SET estado = ? WHERE id_auto = ?',
      ['vendido', compra.id_auto]
    );

    const [[venta]] = await conn.query('SELECT * FROM ventas WHERE id_venta = ?', [result.insertId]);

    await conn.commit();
    res.status(201).json({
      success: true,
      data: venta,
      message: `Venta registrada. Ganancia: $${ganancia.toLocaleString('es-CO')}`,
    });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
});

export default router;


