/**
 * routes/desarrolladoras.js
 * CRUD de la tabla "desarrolladoras" usando express.Router().
 */
const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { manejarErrorPg, parsearId } = require('../utils/errores');

/**
 * @swagger
 * components:
 *   schemas:
 *     Desarrolladora:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         nombre_empresa:
 *           type: string
 *           example: Nintendo
 *         pais:
 *           type: string
 *           example: Japón
 *     DesarrolladoraInput:
 *       type: object
 *       required:
 *         - nombre_empresa
 *         - pais
 *       properties:
 *         nombre_empresa:
 *           type: string
 *           example: Valve Corporation
 *         pais:
 *           type: string
 *           example: Estados Unidos
 */

/**
 * @swagger
 * /api/desarrolladoras:
 *   get:
 *     summary: Obtiene todas las desarrolladoras
 *     tags: [Desarrolladoras]
 *     parameters:
 *       - in: query
 *         name: pais
 *         required: false
 *         schema:
 *           type: string
 *         description: Filtra por país (coincidencia parcial, sin distinguir mayúsculas)
 *         example: Japón
 *     responses:
 *       200:
 *         description: Lista de desarrolladoras
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Desarrolladora'
 *       500:
 *         $ref: '#/components/responses/ErrorServidor'
 */
router.get('/', async (req, res) => {
  try {
    const { pais } = req.query;
    const { rows } = pais
      ? await pool.query('SELECT * FROM desarrolladoras WHERE pais ILIKE $1 ORDER BY id', [`%${pais}%`])
      : await pool.query('SELECT * FROM desarrolladoras ORDER BY id');
    res.status(200).json(rows);
  } catch (err) {
    manejarErrorPg(err, res);
  }
});

/**
 * @swagger
 * /api/desarrolladoras/{id}:
 *   get:
 *     summary: Obtiene una desarrolladora por su ID
 *     tags: [Desarrolladoras]
 *     parameters:
 *       - $ref: '#/components/parameters/IdPath'
 *     responses:
 *       200:
 *         description: Desarrolladora encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Desarrolladora'
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
    const { rows } = await pool.query('SELECT * FROM desarrolladoras WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Desarrolladora no encontrada' });
    res.status(200).json(rows[0]);
  } catch (err) {
    manejarErrorPg(err, res);
  }
});

/**
 * @swagger
 * /api/desarrolladoras:
 *   post:
 *     summary: Crea una nueva desarrolladora
 *     tags: [Desarrolladoras]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DesarrolladoraInput'
 *     responses:
 *       201:
 *         description: Desarrolladora creada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Desarrolladora'
 *       400:
 *         $ref: '#/components/responses/PeticionInvalida'
 *       409:
 *         $ref: '#/components/responses/Conflicto'
 *       500:
 *         $ref: '#/components/responses/ErrorServidor'
 */
router.post('/', async (req, res) => {
  const { nombre_empresa, pais } = req.body;
  if (!nombre_empresa || !pais) {
    return res.status(400).json({ error: 'Los campos nombre_empresa y pais son obligatorios' });
  }
  try {
    const { rows } = await pool.query(
      'INSERT INTO desarrolladoras (nombre_empresa, pais) VALUES ($1, $2) RETURNING *',
      [nombre_empresa.trim(), pais.trim()]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    manejarErrorPg(err, res);
  }
});

/**
 * @swagger
 * /api/desarrolladoras/{id}:
 *   put:
 *     summary: Actualiza una desarrolladora existente
 *     tags: [Desarrolladoras]
 *     parameters:
 *       - $ref: '#/components/parameters/IdPath'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DesarrolladoraInput'
 *           example:
 *             nombre_empresa: Nintendo EPD
 *             pais: Japón
 *     responses:
 *       200:
 *         description: Desarrolladora actualizada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Desarrolladora'
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
  const { nombre_empresa, pais } = req.body;
  if (!nombre_empresa || !pais) {
    return res.status(400).json({ error: 'Los campos nombre_empresa y pais son obligatorios' });
  }
  try {
    const { rows } = await pool.query(
      'UPDATE desarrolladoras SET nombre_empresa = $1, pais = $2 WHERE id = $3 RETURNING *',
      [nombre_empresa.trim(), pais.trim(), id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Desarrolladora no encontrada' });
    res.status(200).json(rows[0]);
  } catch (err) {
    manejarErrorPg(err, res);
  }
});

/**
 * @swagger
 * /api/desarrolladoras/{id}:
 *   delete:
 *     summary: Elimina una desarrolladora
 *     description: No se puede eliminar si tiene videojuegos asociados (devuelve 409).
 *     tags: [Desarrolladoras]
 *     parameters:
 *       - $ref: '#/components/parameters/IdPath'
 *     responses:
 *       200:
 *         description: Desarrolladora eliminada
 *         content:
 *           application/json:
 *             example:
 *               mensaje: Desarrolladora eliminada correctamente
 *               eliminado: { id: 11, nombre_empresa: Valve Corporation, pais: Estados Unidos }
 *       400:
 *         $ref: '#/components/responses/PeticionInvalida'
 *       404:
 *         $ref: '#/components/responses/NoEncontrado'
 *       409:
 *         $ref: '#/components/responses/Conflicto'
 *       500:
 *         $ref: '#/components/responses/ErrorServidor'
 */
router.delete('/:id', async (req, res) => {
  const id = parsearId(req.params.id);
  if (!id) return res.status(400).json({ error: 'El ID debe ser un entero positivo' });
  try {
    const { rows } = await pool.query('DELETE FROM desarrolladoras WHERE id = $1 RETURNING *', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Desarrolladora no encontrada' });
    res.status(200).json({ mensaje: 'Desarrolladora eliminada correctamente', eliminado: rows[0] });
  } catch (err) {
    manejarErrorPg(err, res);
  }
});

module.exports = router;
