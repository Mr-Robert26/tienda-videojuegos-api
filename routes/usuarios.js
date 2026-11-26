/**
 * routes/usuarios.js
 * CRUD de la tabla "usuarios" usando express.Router().
 */
const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { manejarErrorPg, parsearId } = require('../utils/errores');

const REGEX_CORREO = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

const validarUsuario = ({ nickname, correo }) => {
  if (!nickname || !correo) return 'Los campos nickname y correo son obligatorios';
  if (!REGEX_CORREO.test(correo)) return 'El correo no tiene un formato válido';
  return null;
};

/**
 * @swagger
 * components:
 *   schemas:
 *     Usuario:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         nickname:
 *           type: string
 *           example: dark_link
 *         correo:
 *           type: string
 *           format: email
 *           example: darklink@gmail.com
 *         fecha_registro:
 *           type: string
 *           format: date-time
 *           example: 2025-01-10T16:15:00.000Z
 *     UsuarioInput:
 *       type: object
 *       required:
 *         - nickname
 *         - correo
 *       properties:
 *         nickname:
 *           type: string
 *           example: samus_aran
 *         correo:
 *           type: string
 *           format: email
 *           example: samus.aran@gmail.com
 */

/**
 * @swagger
 * /api/usuarios:
 *   get:
 *     summary: Obtiene todos los usuarios registrados
 *     tags: [Usuarios]
 *     parameters:
 *       - in: query
 *         name: nickname
 *         required: false
 *         schema:
 *           type: string
 *         description: Busca usuarios cuyo nickname contenga este texto
 *         example: link
 *     responses:
 *       200:
 *         description: Lista de usuarios
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Usuario'
 *       500:
 *         $ref: '#/components/responses/ErrorServidor'
 */
router.get('/', async (req, res) => {
  try {
    const { nickname } = req.query;
    const { rows } = nickname
      ? await pool.query('SELECT * FROM usuarios WHERE nickname ILIKE $1 ORDER BY id', [`%${nickname}%`])
      : await pool.query('SELECT * FROM usuarios ORDER BY id');
    res.status(200).json(rows);
  } catch (err) {
    manejarErrorPg(err, res);
  }
});

/**
 * @swagger
 * /api/usuarios/{id}:
 *   get:
 *     summary: Obtiene un usuario por su ID
 *     tags: [Usuarios]
 *     parameters:
 *       - $ref: '#/components/parameters/IdPath'
 *     responses:
 *       200:
 *         description: Usuario encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Usuario'
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
    const { rows } = await pool.query('SELECT * FROM usuarios WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.status(200).json(rows[0]);
  } catch (err) {
    manejarErrorPg(err, res);
  }
});

/**
 * @swagger
 * /api/usuarios:
 *   post:
 *     summary: Registra un nuevo usuario
 *     description: La fecha_registro se asigna automáticamente con la fecha actual.
 *     tags: [Usuarios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UsuarioInput'
 *     responses:
 *       201:
 *         description: Usuario creado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Usuario'
 *       400:
 *         $ref: '#/components/responses/PeticionInvalida'
 *       409:
 *         $ref: '#/components/responses/Conflicto'
 *       500:
 *         $ref: '#/components/responses/ErrorServidor'
 */
router.post('/', async (req, res) => {
  const error = validarUsuario(req.body);
  if (error) return res.status(400).json({ error });
  const { nickname, correo } = req.body;
  try {
    const { rows } = await pool.query(
      'INSERT INTO usuarios (nickname, correo) VALUES ($1, $2) RETURNING *',
      [nickname.trim(), correo.trim().toLowerCase()]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    manejarErrorPg(err, res);
  }
});

/**
 * @swagger
 * /api/usuarios/{id}:
 *   put:
 *     summary: Actualiza el nickname y correo de un usuario
 *     tags: [Usuarios]
 *     parameters:
 *       - $ref: '#/components/parameters/IdPath'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UsuarioInput'
 *           example:
 *             nickname: dark_link_pro
 *             correo: darklink.pro@gmail.com
 *     responses:
 *       200:
 *         description: Usuario actualizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Usuario'
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
  const error = validarUsuario(req.body);
  if (error) return res.status(400).json({ error });
  const { nickname, correo } = req.body;
  try {
    const { rows } = await pool.query(
      'UPDATE usuarios SET nickname = $1, correo = $2 WHERE id = $3 RETURNING *',
      [nickname.trim(), correo.trim().toLowerCase(), id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.status(200).json(rows[0]);
  } catch (err) {
    manejarErrorPg(err, res);
  }
});

/**
 * @swagger
 * /api/usuarios/{id}:
 *   delete:
 *     summary: Elimina un usuario
 *     description: No se puede eliminar si tiene licencias compradas (devuelve 409).
 *     tags: [Usuarios]
 *     parameters:
 *       - $ref: '#/components/parameters/IdPath'
 *     responses:
 *       200:
 *         description: Usuario eliminado
 *         content:
 *           application/json:
 *             example:
 *               mensaje: Usuario eliminado correctamente
 *               eliminado: { id: 11, nickname: samus_aran, correo: samus.aran@gmail.com, fecha_registro: 2026-11-15T22:00:00.000Z }
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
    const { rows } = await pool.query('DELETE FROM usuarios WHERE id = $1 RETURNING *', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.status(200).json({ mensaje: 'Usuario eliminado correctamente', eliminado: rows[0] });
  } catch (err) {
    manejarErrorPg(err, res);
  }
});

module.exports = router;
