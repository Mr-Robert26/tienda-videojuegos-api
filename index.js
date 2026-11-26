/**
 * index.js
 * Punto de entrada de la API REST "Tienda Digital de Videojuegos".
 * Configura Express, middlewares, Swagger y monta las rutas de cada tabla.
 */
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
require('dotenv').config();

const { probarConexion } = require('./db');

// Rutas modulares (un archivo por tabla)
const desarrolladorasRoutes = require('./routes/desarrolladoras');
const videojuegosRoutes = require('./routes/videojuegos');
const usuariosRoutes = require('./routes/usuarios');
const licenciasRoutes = require('./routes/licencias');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------------------------------------------------------------
// Middlewares
// ---------------------------------------------------------------------
app.use(cors());           // Permite peticiones desde Hoppscotch / navegador
app.use(express.json());   // Convierte el body JSON en req.body

// ---------------------------------------------------------------------
// Configuración de Swagger (OpenAPI 3.0)
// ---------------------------------------------------------------------
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Tienda Digital de Videojuegos',
      version: '1.0.0',
      description:
        'API REST para una tienda digital de venta de videojuegos con gestión de ' +
        'licencias y usuarios. Administra desarrolladoras, el catálogo de videojuegos, ' +
        'los usuarios registrados y las licencias (compras) con su código de activación. ' +
        'Construida con Node.js, Express y PostgreSQL.',
      contact: { name: 'Equipo de desarrollo' },
    },
    servers: [{ url: `http://localhost:${PORT}`, description: 'Servidor local' }],
    tags: [
      { name: 'Desarrolladoras', description: 'Empresas que crean los videojuegos' },
      { name: 'Videojuegos', description: 'Catálogo de la tienda' },
      { name: 'Usuarios', description: 'Clientes registrados' },
      { name: 'Licencias', description: 'Compras y códigos de activación' },
    ],
    components: {
      parameters: {
        IdPath: {
          in: 'path',
          name: 'id',
          required: true,
          schema: { type: 'integer', minimum: 1 },
          description: 'Identificador numérico del registro',
          example: 1,
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Mensaje descriptivo del error' },
            detalle: { type: 'string' },
          },
        },
      },
      responses: {
        PeticionInvalida: {
          description: 'Petición inválida (faltan campos o el formato es incorrecto)',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: { error: 'Los campos obligatorios no fueron enviados' },
            },
          },
        },
        NoEncontrado: {
          description: 'El registro solicitado no existe',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: { error: 'Registro no encontrado' },
            },
          },
        },
        Conflicto: {
          description: 'Dato duplicado o el registro está siendo usado por otra tabla',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: { error: 'Registro duplicado', detalle: 'Key (nickname)=(dark_link) already exists.' },
            },
          },
        },
        ErrorServidor: {
          description: 'Error interno del servidor',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: { error: 'Error interno del servidor' },
            },
          },
        },
      },
    },
  },
  apis: ['./routes/*.js'], // Archivos donde están los comentarios @swagger
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs, {
  customSiteTitle: 'API Tienda de Videojuegos',
}));
// JSON crudo de la especificación (útil para importar en Hoppscotch)
app.get('/api-docs.json', (req, res) => res.json(swaggerDocs));

// ---------------------------------------------------------------------
// Rutas
// ---------------------------------------------------------------------
app.get('/', (req, res) => {
  res.json({
    mensaje: ' API Tienda Digital de Videojuegos funcionando',
    documentacion: `http://localhost:${PORT}/api-docs`,
    endpoints: ['/api/desarrolladoras', '/api/videojuegos', '/api/usuarios', '/api/licencias'],
  });
});

app.use('/api/desarrolladoras', desarrolladorasRoutes);
app.use('/api/videojuegos', videojuegosRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/licencias', licenciasRoutes);

// Ruta no encontrada (404)
app.use((req, res) => {
  res.status(404).json({ error: `La ruta ${req.method} ${req.originalUrl} no existe` });
});

// Manejador global de errores (JSON mal formado, errores no capturados)
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El cuerpo de la petición no es un JSON válido' });
  }
  console.error('Error no controlado:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// ---------------------------------------------------------------------
// Arranque del servidor
// ---------------------------------------------------------------------
app.listen(PORT, async () => {
  console.log(` Servidor corriendo en http://localhost:${PORT}`);
  console.log(` Documentación Swagger en http://localhost:${PORT}/api-docs`);
  try {
    await probarConexion();
  } catch (err) {
    console.error('  No se pudo conectar a PostgreSQL:', err.message);
    console.error('   Revisa tu archivo .env y que el servicio de PostgreSQL esté activo.');
  }
});
