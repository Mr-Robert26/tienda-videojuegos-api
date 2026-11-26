/**
 * routes/licencias.js
 * CRUD de la tabla "licencias" (compras) usando express.Router().
 * Una licencia une a un usuario con el videojuego que compró.
 */
const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { pool } = require('../db');
const { manejarErrorPg, parsearId } = require('../utils/errores');

/**
 * Genera una clave de licencia con formato XXXX-XXXX-XXXX-XXXX.
 * @returns {string}
 */
const generarCodigoActivacion = () =>
  crypto.randomBytes(8).toString('hex').toUpperCase().match(/.{4}/g).join('-');

// Consulta base con JOIN a usuarios y videojuegos
const SELECT_LICENCIAS = `
  SELECT l.id, l.fecha_compra, l.codigo_activacion,
         l.usuario_id, u.nickname AS usuario,
         l.videojuego_id, v.titulo AS videojuego, v.precio::float AS precio_pagado
  FROM licencias l
  JOIN usuarios u    ON u.id = l.usuario_id
  JOIN videojuegos v ON v.id = l.videojuego_id`;

/**
 * @swagger
 * components:
 *   schemas:
 *     Licencia:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         fecha_compra:
 *           type: string
 *           format: date-time
 *           example: 2025-01-11T18:00:00.000Z
 *         codigo_activacion:
 *           type: string
 *           example: ZLDA-7K3M-Q9XP-2B4T
 *         usuario_id:
 *           type: integer
 *           example: 1
 *         usuario:
 *           type: string
 *           description: Nickname del comprador (JOIN)
 *           example: dark_link
 *         videojuego_id:
 *           type: integer
 *           example: 1
 *         videojuego:
 *           type: string
 *           description: Título del videojuego (JOIN)
 *           example: "The Legend of Zelda: Tears of the Kingdom"
 *         precio_pagado:
 *           type: number
 *           example: 1399.00
 *     LicenciaInput:
 *       type: object
 *       required:
 *         - usuario_id
 *         - videojuego_id
 *       properties:
 *         usuario_id:
 *           type: integer
 *           example: 3
 *         videojuego_id:
 *           type: integer
 *           example: 5
 *         codigo_activacion:
 *           type: string
 *           description: Opcional. Si no se envía, la API genera uno automáticamente.
 *           example: ELDN-NEO3-2026-ABCD
 */

/**
 * @swagger
 * /api/licencias:
 *   get:
 *     summary: Obtiene todas las licencias vendidas con usuario y videojuego
 *     tags: [Licencias]
 *     parameters:
 *       - in: query
 *         name: usuario_id
 *         required: false
 *         schema:
 *           type: integer
 *         description: Muestra solo la biblioteca (licencias) de un usuario
 *         example: 1
 *     responses:
 *       200:
 *         description: Lista de licencias
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Licencia'
 *       400:
 *         $ref: '#/components/responses/PeticionInvalida'
 *       500:
 *         $ref: '#/components/responses/ErrorServidor'
 */
router.get('/', async (req, res) => {
  try {
    if (req.query.usuario_id) {
      const usuarioId = parsearId(req.query.usuario_id);
      if (!usuarioId) return res.status(400).json({ error: 'usuario_id debe ser un entero positivo' });
      const { rows } = await pool.query(`${SELECT_LICENCIAS} WHERE l.usuario_id = $1 ORDER BY l.id`, [usuarioId]);
      return res.status(200).json(rows);
    }
    const { rows } = await pool.query(`${SELECT_LICENCIAS} ORDER BY l.id`);
    res.status(200).json(rows);
  } catch (err) {
    manejarErrorPg(err, res);
  }
});

/**
 * @swagger
 * /api/licencias/{id}:
 *   get:
 *     summary: Obtiene una licencia por su ID
 *     tags: [Licencias]
 *     parameters:
 *       - $ref: '#/components/parameters/IdPath'
 *     responses:
 *       200:
 *         description: Licencia encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Licencia'
 *       400:
 *         $ref: '#/components/responses/PeticionInvalida'
 *       404:
 *         $ref: '#/components/responses/NoEncontrado'
 *       500:
 *         $ref: '#/components/responses/ErrorServidor'
 */
router.get('/:id', async (req, res) => {
  const id = parsearId(req.params.id);
  if (!id) return res.status(400).json({ error: 'El ID debe ser un entero positivo' });
  try {
    const { rows } = await pool.query(`${SELECT_LICENCIAS} WHERE l.id = $1`, [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Licencia no encontrada' });
    res.status(200).json(rows[0]);
  } catch (err) {
    manejarErrorPg(err, res);
  }
});

/**
 * @swagger
 * /api/licencias:
 *   post:
 *     summary: Registra una compra (genera una licencia de activación)
 *     description: fecha_compra se asigna automáticamente. Si no se envía codigo_activacion se genera uno con formato XXXX-XXXX-XXXX-XXXX.
 *     tags: [Licencias]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LicenciaInput'
 *     responses:
 *       201:
 *         description: Licencia creada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Licencia'
 *       400:
 *         $ref: '#/components/responses/PeticionInvalida'
 *       409:
 *         $ref: '#/components/responses/Conflicto'
 *       500:
 *         $ref: '#/components/responses/ErrorServidor'
 */
router.post('/', async (req, res) => {
  const { usuario_id, videojuego_id } = req.body;
  if (!parsearId(usuario_id) || !parsearId(videojuego_id)) {
    return res.status(400).json({ error: 'usuario_id y videojuego_id son obligatorios y deben ser enteros positivos' });
  }
  const codigo = (req.body.codigo_activacion || generarCodigoActivacion()).trim().toUpperCase();
  try {
    const { rows } = await pool.query(
      `INSERT INTO licencias (codigo_activacion, usuario_id, videojuego_id)
       VALUES ($1, $2, $3) RETURNING id`,
      [codigo, usuario_id, videojuego_id]
    );
    const creada = await pool.query(`${SELECT_LICENCIAS} WHERE l.id = $1`, [rows[0].id]);
    res.status(201).json(creada.rows[0]);
  } catch (err) {
    manejarErrorPg(err, res);
  }
});

/**
 * @swagger
 * /api/licencias/{id}:
 *   put:
 *     summary: Actualiza una licencia (reasignar usuario, videojuego o código)
 *     tags: [Licencias]
 *     parameters:
 *       - $ref: '#/components/parameters/IdPath'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - usuario_id
 *               - videojuego_id
 *               - codigo_activacion
 *             properties:
 *               usuario_id:
 *                 type: integer
 *               videojuego_id:
 *                 type: integer
 *               codigo_activacion:
 *                 type: string
 *           example:
 *             usuario_id: 2
 *             videojuego_id: 9
 *             codigo_activacion: BG3L-GIFT-2026-PQXZ
 *     responses:
 *       200:
 *         description: Licencia actualizada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Licencia'
 *       400:
 *         $ref: '#/components/responses/PeticionInvalida'
 *       404:
 *         $ref: '#/components/responses/NoEncontrado'
 *       409:
 *         $ref: '#/components/responses/Conflicto'
 *       500:
 *         $ref: '#/components/responses/ErrorServidor'
 */
router.put('/:id', async (req, res) => {
  const id = parsearId(req.params.id);
  if (!id) return res.status(400).json({ error: 'El ID debe ser un entero positivo' });
  const { usuario_id, videojuego_id, codigo_activacion } = req.body;
  if (!parsearId(usuario_id) || !parsearId(videojuego_id) || !codigo_activacion) {
    return res.status(400).json({ error: 'usuario_id, videojuego_id y codigo_activacion son obligatorios' });
  }
  try {
    const { rowCount } = await pool.query(
      `UPDATE licencias
       SET usuario_id = $1, videojuego_id = $2, codigo_activacion = $3
       WHERE id = $4`,
      [usuario_id, videojuego_id, codigo_activacion.trim().toUpperCase(), id]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Licencia no encontrada' });
    const actualizada = await pool.query(`${SELECT_LICENCIAS} WHERE l.id = $1`, [id]);
    res.status(200).json(actualizada.rows[0]);
  } catch (err) {
    manejarErrorPg(err, res);
  }
});

/**
 * @swagger
 * /api/licencias/{id}:
 *   delete:
 *     summary: Revoca (elimina) una licencia
 *     tags: [Licencias]
 *     parameters:
 *       - $ref: '#/components/parameters/IdPath'
 *     responses:
 *       200:
 *         description: Licencia eliminada
 *         content:
 *           application/json:
 *             example:
 *               mensaje: Licencia revocada correctamente
 *               eliminado: { id: 11, codigo_activacion: 9F3A-1C7E-55B0-D2E4, usuario_id: 3, videojuego_id: 5 }
 *       400:
 *         $ref: '#/components/responses/PeticionInvalida'
 *       404:
 *         $ref: '#/components/responses/NoEncontrado'
 *       500:
 *         $ref: '#/components/responses/ErrorServidor'
 */
router.delete('/:id', async (req, res) => {
  const id = parsearId(req.params.id);
  if (!id) return res.status(400).json({ error: 'El ID debe ser un entero positivo' });
  try {
    const { rows } = await pool.query(
      'DELETE FROM licencias WHERE id = $1 RETURNING id, codigo_activacion, usuario_id, videojuego_id',
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Licencia no encontrada' });
    res.status(200).json({ mensaje: 'Licencia revocada correctamente', eliminado: rows[0] });
  } catch (err) {
    manejarErrorPg(err, res);
  }
});

module.exports = router;
