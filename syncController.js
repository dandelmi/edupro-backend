// syncController.js

const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

// Configura tu conexión PostgreSQL con variables de entorno de Render
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function createTablesIfNotExist() {
  const client = await pool.connect();
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS estudiantes (
      id SERIAL PRIMARY KEY,
      nombre TEXT NOT NULL,
      apellido TEXT NOT NULL
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS cursos (
      id SERIAL PRIMARY KEY,
      nombre_curso TEXT NOT NULL,
      descripcion TEXT,
      profesor_id INTEGER
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS asignaturas (
      id SERIAL PRIMARY KEY,
      curso_id INTEGER NOT NULL,
      nombre TEXT NOT NULL,
      color TEXT
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS planificaciones (
      id SERIAL PRIMARY KEY,
      curso_id INTEGER,
      asignatura_id INTEGER NOT NULL,
      profesor_id INTEGER,
      tema TEXT NOT NULL,
      duracion INTEGER,
      json_plan TEXT NOT NULL,
      fecha_creacion TEXT
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS asistencia (
      id SERIAL PRIMARY KEY,
      estudiante_id INTEGER NOT NULL,
      asignatura_id INTEGER NOT NULL,
      fecha TEXT NOT NULL,
      estado TEXT NOT NULL,
      comentario TEXT
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS calificacion_estandar (
      id SERIAL PRIMARY KEY,
      estudiante_id INTEGER NOT NULL,
      asignatura_id INTEGER NOT NULL,
      profesor_id INTEGER NOT NULL,
      curso_id INTEGER NOT NULL,
      periodo TEXT NOT NULL,
      asistencia REAL,
      comportamiento REAL,
      cuaderno REAL,
      actividades REAL,
      examen REAL,
      fecha TEXT,
      total_nota_acumulada REAL
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS calificacion_competencias (
      id SERIAL PRIMARY KEY,
      estudiante_id INTEGER NOT NULL,
      asignatura_id INTEGER NOT NULL,
      profesor_id INTEGER NOT NULL,
      curso_id INTEGER NOT NULL,
      periodo TEXT NOT NULL,
      fecha TEXT NOT NULL,
      c1 REAL,
      c2 REAL,
      c3 REAL,
      c4 REAL,
      completivo REAL,
      extraordinario REAL,
      promedio REAL
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS registro_asistencia_detallado (
      id SERIAL PRIMARY KEY,
      curso_id INTEGER NOT NULL,
      estudiante_id INTEGER NOT NULL,
      nombre_estudiante TEXT,
      apellido_estudiante TEXT,
      estado TEXT NOT NULL,
      fecha TEXT NOT NULL,
      hora TEXT NOT NULL,
      dia_semana TEXT NOT NULL,
      comentario TEXT
    )`);

    console.log('[Render] Tablas verificadas o creadas correctamente.');
  } finally {
    client.release();
  }
}

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

      // Construir consulta SQL con ON CONFLICT DO NOTHING
      const sql = `
        INSERT INTO ${tabla} (${columnas.join(', ')})
        VALUES (${placeholders})
        ON CONFLICT DO NOTHING
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

module.exports = router;
