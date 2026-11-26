/**
 * db.js
 * Configuración del Pool de conexiones a PostgreSQL.
 * Un Pool reutiliza conexiones abiertas en lugar de abrir una nueva
 * por cada petición HTTP, lo que hace la API más rápida y estable.
 */
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'tienda_videojuegos',
  password: process.env.DB_PASSWORD || 'postgres',
  port: Number(process.env.DB_PORT) || 5432,
  max: 10,                        // conexiones simultáneas máximas
  idleTimeoutMillis: 30000,       // cierra conexiones inactivas tras 30 s
  connectionTimeoutMillis: 5000,  // error si no conecta en 5 s
});

// Si una conexión inactiva falla, se registra sin tumbar el servidor
pool.on('error', (err) => {
  console.error(' Error inesperado en el Pool de PostgreSQL:', err.message);
});

/**
 * Verifica la conexión al iniciar el servidor.
 * @returns {Promise<void>}
 */
const probarConexion = async () => {
  const { rows } = await pool.query('SELECT NOW() AS hora, current_database() AS bd');
  console.log(` Conectado a PostgreSQL (BD: ${rows[0].bd})`);
};

module.exports = { pool, probarConexion };
