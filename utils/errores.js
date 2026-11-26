/**
 * manejarErrorPg.js
 * Traduce los códigos de error de PostgreSQL a respuestas HTTP claras.
 * Se usa en el bloque catch de todas las rutas para no repetir lógica.
 *
 * Códigos de PostgreSQL más comunes:
 *  23505 → unique_violation       (dato duplicado)       → 409
 *  23503 → foreign_key_violation  (FK inexistente / en uso) → 400 / 409
 *  23514 → check_violation        (ej. precio <= 0)      → 400
 *  23502 → not_null_violation     (falta un campo)       → 400
 *  22P02 → invalid_text_representation (tipo inválido)  → 400
 */
const manejarErrorPg = (err, res) => {
  switch (err.code) {
    case '23505':
      return res.status(409).json({ error: 'Registro duplicado', detalle: err.detail });
    case '23503':
      // En DELETE significa que otro registro depende de éste
      if (err.message.includes('update or delete')) {
        return res.status(409).json({
          error: 'No se puede eliminar: existen registros que dependen de éste',
          detalle: err.detail,
        });
      }
      return res.status(400).json({ error: 'La referencia (llave foránea) no existe', detalle: err.detail });
    case '23514':
      return res.status(400).json({ error: 'Un valor no cumple las reglas de validación', detalle: err.constraint });
    case '23502':
      return res.status(400).json({ error: `El campo "${err.column}" es obligatorio` });
    case '22P02':
    case '22007':
    case '22008':
      return res.status(400).json({ error: 'Tipo de dato inválido', detalle: err.message });
    default:
      console.error('❌ Error interno:', err);
      return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Valida que el parámetro :id sea un entero positivo.
 * @returns {number|null}
 */
const parsearId = (valor) => {
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 ? id : null;
};

module.exports = { manejarErrorPg, parsearId };
