const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ==========================
// CREACIÓN DE TABLAS
// ==========================
async function createTablesIfNotExist() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nombre TEXT NOT NULL,
        apellido TEXT NOT NULL,
        correo TEXT UNIQUE NOT NULL,
        telefono TEXT NOT NULL,
        rol TEXT NOT NULL,
        contrasena TEXT NOT NULL,
        pregunta1 TEXT NOT NULL,
        respuesta1 TEXT NOT NULL,
        pregunta2 TEXT NOT NULL,
        respuesta2 TEXT NOT NULL,
        pregunta3 TEXT NOT NULL,
        respuesta3 TEXT NOT NULL,
        intentos_recuperacion INTEGER DEFAULT 0
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS estudiantes (
        id SERIAL PRIMARY KEY,
        nombre TEXT NOT NULL,
        apellido TEXT NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS cursos (
        id SERIAL PRIMARY KEY,
        nombre_curso TEXT NOT NULL,
        descripcion TEXT,
        profesor_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS asignaturas (
        id SERIAL PRIMARY KEY,
        curso_id INTEGER NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
        nombre TEXT NOT NULL,
        color TEXT
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS planificaciones (
        id SERIAL PRIMARY KEY,
        curso_id INTEGER REFERENCES cursos(id) ON DELETE CASCADE,
        asignatura_id INTEGER NOT NULL REFERENCES asignaturas(id) ON DELETE CASCADE,
        profesor_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        tema TEXT NOT NULL,
        duracion INTEGER,
        json_plan TEXT NOT NULL,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS asistencia (
        id SERIAL PRIMARY KEY,
        estudiante_id INTEGER NOT NULL REFERENCES estudiantes(id) ON DELETE CASCADE,
        asignatura_id INTEGER NOT NULL REFERENCES asignaturas(id) ON DELETE CASCADE,
        fecha DATE NOT NULL,
        estado TEXT NOT NULL,
        comentario TEXT,
        UNIQUE (estudiante_id, asignatura_id, fecha)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS calificacion_estandar (
        id SERIAL PRIMARY KEY,
        estudiante_id INTEGER NOT NULL REFERENCES estudiantes(id) ON DELETE CASCADE,
        asignatura_id INTEGER NOT NULL REFERENCES asignaturas(id) ON DELETE CASCADE,
        profesor_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        curso_id INTEGER NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
        periodo TEXT NOT NULL,
        asistencia REAL,
        comportamiento REAL,
        cuaderno REAL,
        actividades REAL,
        examen REAL,
        fecha DATE,
        total_nota_acumulada REAL,
        ano_escolar TEXT NOT NULL,
        UNIQUE(estudiante_id, asignatura_id, periodo, ano_escolar)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS calificacion_competencias (
        id SERIAL PRIMARY KEY,
        estudiante_id INTEGER NOT NULL REFERENCES estudiantes(id) ON DELETE CASCADE,
        asignatura_id INTEGER NOT NULL REFERENCES asignaturas(id) ON DELETE CASCADE,
        profesor_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        curso_id INTEGER NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
        periodo TEXT NOT NULL,
        fecha DATE,
        c1 REAL,
        c2 REAL,
        c3 REAL,
        c4 REAL,
        completivo REAL,
        extraordinario REAL,
        promedio REAL,
        ano_escolar TEXT NOT NULL,
        UNIQUE(estudiante_id, asignatura_id, curso_id, periodo, ano_escolar)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS registro_asistencia_detallado (
        id SERIAL PRIMARY KEY,
        curso_id INTEGER NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
        estudiante_id INTEGER NOT NULL REFERENCES estudiantes(id) ON DELETE CASCADE,
        nombre_estudiante TEXT,
        apellido_estudiante TEXT,
        estado TEXT NOT NULL,
        fecha DATE NOT NULL,
        hora TEXT NOT NULL,
        dia_semana TEXT NOT NULL,
        comentario TEXT,
        ano_escolar TEXT NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ministerio (
        id SERIAL PRIMARY KEY,
        nombre TEXT NOT NULL,
        correo_contacto TEXT,
        telefono_contacto TEXT
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS regionales (
        id SERIAL PRIMARY KEY,
        ministerio_id INTEGER NOT NULL REFERENCES ministerio(id) ON DELETE CASCADE,
        codigo_acceso TEXT UNIQUE NOT NULL,
        nombre TEXT NOT NULL,
        correo_contacto TEXT,
        telefono_contacto TEXT
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS distritos (
        id SERIAL PRIMARY KEY,
        regional_id INTEGER NOT NULL REFERENCES regionales(id) ON DELETE CASCADE,
        codigo_acceso TEXT UNIQUE NOT NULL,
        nombre TEXT NOT NULL,
        correo_contacto TEXT,
        telefono_contacto TEXT
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS escuelas (
        id SERIAL PRIMARY KEY,
        distrito_id INTEGER NOT NULL REFERENCES distritos(id) ON DELETE CASCADE,
        codigo_acceso TEXT UNIQUE NOT NULL,
        nombre TEXT NOT NULL,
        director_nombre TEXT NOT NULL,
        direccion_fisica TEXT NOT NULL,
        correo_contacto TEXT,
        telefono_contacto TEXT
      );
    `);

    console.log('[Render] Tablas verificadas/creadas correctamente.');
  } finally {
    client.release();
  }
}

// ==========================
// RUTA POST (Subida de datos)
// ==========================
router.post('/sync/:tabla', async (req, res) => {
  const tabla = req.params.tabla;
  const datos = req.body;

  if (!Array.isArray(datos) || datos.length === 0) {
    return res.status(400).json({ message: 'No hay datos para sincronizar.' });
  }

  const client = await pool.connect();
  try {
    await createTablesIfNotExist();

    for (const dato of datos) {
      const columnas = Object.keys(dato);
      const valores = Object.values(dato);
      const placeholders = columnas.map((_, idx) => `$${idx + 1}`).join(', ');

      const updateSet = columnas
        .map((col, idx) => `${col} = EXCLUDED.${col}`)
        .join(', ');

      const sql = `
        INSERT INTO ${tabla} (${columnas.join(', ')})
        VALUES (${placeholders})
        ON CONFLICT (id) DO UPDATE SET ${updateSet}
      `;

      await client.query(sql, valores);
    }

    res.json({ message: `Sincronización completada para ${tabla}.` });
  } catch (error) {
    console.error('[SYNC ERROR]', error.message);
    res.status(500).json({ message: 'Error al sincronizar datos.', error: error.message });
  } finally {
    client.release();
  }
});

// ==========================
// RUTA GET (Descarga de datos)
// ==========================
router.get('/sync/:tabla', async (req, res) => {
  const tabla = req.params.tabla;
  const client = await pool.connect();

  try {
    await createTablesIfNotExist();
    const result = await client.query(`SELECT * FROM ${tabla}`);
    res.json(result.rows);
  } catch (error) {
    console.error(`[GET ERROR] ${tabla}:`, error.message);
    res.status(500).json({ message: 'Error al obtener datos.', error: error.message });
  } finally {
    client.release();
  }
});

module.exports = router;
