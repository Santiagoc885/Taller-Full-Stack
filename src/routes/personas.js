// routes/personas.js
import { Router } from 'express';
import { body, param } from 'express-validator';
import pool from '../config/connection.js';
import { validateRequest } from '../middleware/errorHandler.js';

const router = Router();

// ── Validaciones ───────────────────────────────────────────
const personaValidations = [
  body('nombre').trim().notEmpty().withMessage('El nombre es requerido'),
  body('apellido').trim().notEmpty().withMessage('El apellido es requerido'),
  body('cedula').trim().notEmpty().withMessage('La cédula es requerida'),
  body('email').optional({ nullable: true }).isEmail().withMessage('Email inválido'),
  body('telefono').optional({ nullable: true }).trim(),
];

// ── GET /personas ──────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT id_persona, nombre, apellido, cedula, telefono, email
       FROM personas
       ORDER BY apellido, nombre`
    );
    res.json({ success: true, data: rows, total: rows.length });
  } catch (err) { next(err); }
});

// ── GET /personas/:id ──────────────────────────────────────
router.get('/:id', param('id').isInt({ min: 1 }), validateRequest, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM personas WHERE id_persona = ?',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Persona no encontrada' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
});

// ── GET /personas/:id/operaciones ──────────────────────────
router.get('/:id/operaciones', param('id').isInt({ min: 1 }), validateRequest, async (req, res, next) => {
  try {
    const { id } = req.params;
    const [compras] = await pool.query(
      `SELECT c.id_compra, a.placa, a.marca, a.modelo, c.precio_compra, c.fecha_compra
       FROM compras c
       JOIN autos a ON a.id_auto = c.id_auto
       WHERE c.id_vendedor = ?
       ORDER BY c.fecha_compra DESC`,
      [id]
    );
    const [ventas] = await pool.query(
      `SELECT v.id_venta, a.placa, a.marca, a.modelo, v.precio_venta, v.fecha_venta, v.ganancia
       FROM ventas v
       JOIN compras c ON c.id_compra = v.id_compra
       JOIN autos   a ON a.id_auto   = c.id_auto
       WHERE v.id_comprador = ?
       ORDER BY v.fecha_venta DESC`,
      [id]
    );
    res.json({ success: true, data: { como_vendedor: compras, como_comprador: ventas } });
  } catch (err) { next(err); }
});

// ── POST /personas ─────────────────────────────────────────
router.post('/', personaValidations, validateRequest, async (req, res, next) => {
  try {
    const { nombre, apellido, cedula, telefono, email } = req.body;
    const [result] = await pool.query(
      `INSERT INTO personas (nombre, apellido, cedula, telefono, email)
       VALUES (?, ?, ?, ?, ?)`,
      [nombre, apellido, cedula, telefono || null, email || null]
    );
    const [rows] = await pool.query('SELECT * FROM personas WHERE id_persona = ?', [result.insertId]);
    res.status(201).json({ success: true, data: rows[0], message: 'Persona registrada exitosamente' });
  } catch (err) { next(err); }
});

// PUT /personas/:id ──────────────────────────────────────
router.put('/:id', param('id').isInt({ min: 1 }), personaValidations, validateRequest, async (req, res, next) => {
  try {
    const { nombre, apellido, cedula, telefono, email } = req.body;
    const [result] = await pool.query(
      `UPDATE personas
       SET nombre = ?, apellido = ?, cedula = ?, telefono = ?, email = ?
       WHERE id_persona = ?`,
      [nombre, apellido, cedula, telefono || null, email || null, req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Persona no encontrada' });
    const [rows] = await pool.query('SELECT * FROM personas WHERE id_persona = ?', [req.params.id]);
    res.json({ success: true, data: rows[0], message: 'Persona actualizada' });
  } catch (err) { next(err); }
});

// ── DELETE /personas/:id ───────────────────────────────────
router.delete('/:id', param('id').isInt({ min: 1 }), validateRequest, async (req, res, next) => {
  try {
    const [result] = await pool.query('DELETE FROM personas WHERE id_persona = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Persona no encontrada' });
    res.json({ success: true, message: 'Persona eliminada' });
  } catch (err) { next(err); }
});

export default router;