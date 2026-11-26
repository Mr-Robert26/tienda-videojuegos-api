/**
 * routes/videojuegos.js
 * CRUD de la tabla "videojuegos" usando express.Router().
 * Cada videojuego pertenece a una desarrolladora (llave foránea desarrolladora_id).
 */
const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { manejarErrorPg, parsearId } = require('../utils/errores');

// Consulta base con JOIN para devolver también el nombre de la desarrolladora
const SELECT_VIDEOJUEGOS = `
  SELECT v.id, v.titulo, v.genero, v.precio::float AS precio,
         v.desarrolladora_id, d.nombre_empresa AS desarrolladora
  FROM videojuegos v
  JOIN desarrolladoras d ON d.id = v.desarrolladora_id`;

/**
 * Valida el cuerpo de POST/PUT. Devuelve un mensaje de error o null.
 */
const validarVideojuego = ({ titulo, genero, precio, desarrolladora_id }) => {
  if (!titulo || !genero || precio === undefined || desarrolladora_id === undefined) {
    return 'Los campos titulo, genero, precio y desarrolladora_id son obligatorios';
  }
  if (typeof precio !== 'number' || precio <= 0) return 'El precio debe ser un número mayor a 0';
  if (!parsearId(desarrolladora_id)) return 'desarrolladora_id debe ser un entero positivo';
  return null;
};

/**
 * @swagger
 * components:
 *   schemas:
 *     Videojuego:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 5
 *         titulo:
 *           type: string
 *           example: Elden Ring
 *         genero:
 *           type: string
 *           example: RPG
 *         precio:
 *           type: number
 *           format: float
 *           example: 1199.00
 *         desarrolladora_id:
 *           type: integer
 *           example: 5
 *         desarrolladora:
 *           type: string
 *           description: Nombre de la desarrolladora (obtenido con JOIN)
 *           example: FromSoftware
 *     VideojuegoInput:
 *       type: object
 *       required:
 *         - titulo
 *         - genero
 *         - precio
 *         - desarrolladora_id
 *       properties:
 *         titulo:
 *           type: string
 *           example: Hollow Knight Silksong
 *         genero:
 *           type: string
 *           example: Metroidvania
 *         precio:
 *           type: number
 *           minimum: 0.01
 *           example: 399.00
 *         desarrolladora_id:
 *           type: integer
 *           example: 10
 */

/**
 * @swagger
 * /api/videojuegos:
 *   get:
 *     summary: Obtiene todos los videojuegos con el nombre de su desarrolladora
 *     tags: [Videojuegos]
 *     parameters:
 *       - in: query
 *         name: genero
 *         required: false
 *         schema:
 *           type: string
 *         description: Filtra por género
 *         example: RPG
 *       - in: query
 *         name: desarrolladora_id
 *         required: false
 *         schema:
 *           type: integer
 *         description: Filtra por desarrolladora
 *         example: 5
 *     responses:
 *       200:
 *         description: Lista de videojuegos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Videojuego'
 *       500:
 *         $ref: '#/components/responses/ErrorServidor'
 */
router.get('/', async (req, res) => {
  try {
    const condiciones = [];
    const valores = [];
    if (req.query.genero) {
      valores.push(`%${req.query.genero}%`);
      condiciones.push(`v.genero ILIKE $${valores.length}`);
    }
    if (req.query.desarrolladora_id) {
      const devId = parsearId(req.query.desarrolladora_id);
      if (!devId) return res.status(400).json({ error: 'desarrolladora_id debe ser un entero positivo' });
      valores.push(devId);
      condiciones.push(`v.desarrolladora_id = $${valores.length}`);
    }
    const where = condiciones.length ? ` WHERE ${condiciones.join(' AND ')}` : '';
    const { rows } = await pool.query(`${SELECT_VIDEOJUEGOS}${where} ORDER BY v.id`, valores);
    res.status(200).json(rows);
  } catch (err) {
    manejarErrorPg(err, res);
  }
});

/**
 * @swagger
 * /api/videojuegos/{id}:
 *   get:
 *     summary: Obtiene un videojuego por su ID
 *     tags: [Videojuegos]
 *     parameters:
 *       - $ref: '#/components/parameters/IdPath'
 *     responses:
 *       200:
 *         description: Videojuego encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Videojuego'
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
    const { rows } = await pool.query(`${SELECT_VIDEOJUEGOS} WHERE v.id = $1`, [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Videojuego no encontrado' });
    res.status(200).json(rows[0]);
  } catch (err) {
    manejarErrorPg(err, res);
  }
});

/**
 * @swagger
 * /api/videojuegos:
 *   post:
 *     summary: Registra un nuevo videojuego en el catálogo
 *     tags: [Videojuegos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VideojuegoInput'
 *     responses:
 *       201:
 *         description: Videojuego creado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Videojuego'
 *       400:
 *         $ref: '#/components/responses/PeticionInvalida'
 *       500:
 *         $ref: '#/components/responses/ErrorServidor'
 */
router.post('/', async (req, res) => {
  const error = validarVideojuego(req.body);
  if (error) return res.status(400).json({ error });
  const { titulo, genero, precio, desarrolladora_id } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO videojuegos (titulo, genero, precio, desarrolladora_id)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [titulo.trim(), genero.trim(), precio, desarrolladora_id]
    );
    const creado = await pool.query(`${SELECT_VIDEOJUEGOS} WHERE v.id = $1`, [rows[0].id]);
    res.status(201).json(creado.rows[0]);
  } catch (err) {
    manejarErrorPg(err, res);
  }
});

/**
 * @swagger
 * /api/videojuegos/{id}:
 *   put:
 *     summary: Actualiza un videojuego existente
 *     tags: [Videojuegos]
 *     parameters:
 *       - $ref: '#/components/parameters/IdPath'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VideojuegoInput'
 *           example:
 *             titulo: Elden Ring - Shadow of the Erdtree Edition
 *             genero: RPG
 *             precio: 1499.00
 *             desarrolladora_id: 5
 *     responses:
 *       200:
 *         description: Videojuego actualizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Videojuego'
 *       400:
 *         $ref: '#/components/responses/PeticionInvalida'
 *       404:
 *         $ref: '#/components/responses/NoEncontrado'
 *       500:
 *         $ref: '#/components/responses/ErrorServidor'
 */
router.put('/:id', async (req, res) => {
  const id = parsearId(req.params.id);
  if (!id) return res.status(400).json({ error: 'El ID debe ser un entero positivo' });
  const error = validarVideojuego(req.body);
  if (error) return res.status(400).json({ error });
  const { titulo, genero, precio, desarrolladora_id } = req.body;
  try {
    const { rowCount } = await pool.query(
      `UPDATE videojuegos
       SET titulo = $1, genero = $2, precio = $3, desarrolladora_id = $4
       WHERE id = $5`,
      [titulo.trim(), genero.trim(), precio, desarrolladora_id, id]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Videojuego no encontrado' });
    const actualizado = await pool.query(`${SELECT_VIDEOJUEGOS} WHERE v.id = $1`, [id]);
    res.status(200).json(actualizado.rows[0]);
  } catch (err) {
    manejarErrorPg(err, res);
  }
});

/**
 * @swagger
 * /api/videojuegos/{id}:
 *   delete:
 *     summary: Elimina un videojuego del catálogo
 *     description: No se puede eliminar si ya tiene licencias vendidas (devuelve 409).
 *     tags: [Videojuegos]
 *     parameters:
 *       - $ref: '#/components/parameters/IdPath'
 *     responses:
 *       200:
 *         description: Videojuego eliminado
 *         content:
 *           application/json:
 *             example:
 *               mensaje: Videojuego eliminado correctamente
 *               eliminado: { id: 11, titulo: Hollow Knight Silksong, genero: Metroidvania, precio: 399, desarrolladora_id: 10 }
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
    const { rows } = await pool.query(
      'DELETE FROM videojuegos WHERE id = $1 RETURNING id, titulo, genero, precio::float AS precio, desarrolladora_id',
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Videojuego no encontrado' });
    res.status(200).json({ mensaje: 'Videojuego eliminado correctamente', eliminado: rows[0] });
  } catch (err) {
    manejarErrorPg(err, res);
  }
});

module.exports = router;
