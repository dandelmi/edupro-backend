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
        intentos_recuperacion INTEGER DEFAULT 0,
        escuela_id INTEGER
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS estudiantes (
        id SERIAL PRIMARY KEY,
        nombre TEXT NOT NULL,
        apellido TEXT NOT NULL,
        escuela_id INTEGER
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS cursos (
        id SERIAL PRIMARY KEY,
        nombre_curso TEXT NOT NULL,
        descripcion TEXT,
        profesor_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        escuela_id INTEGER
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS asignaturas (
        id SERIAL PRIMARY KEY,
        curso_id INTEGER NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
        nombre TEXT NOT NULL,
        color TEXT,
        escuela_id INTEGER
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS estudiante_asignatura (
        id SERIAL PRIMARY KEY,
        estudiante_id INTEGER REFERENCES estudiantes(id) ON DELETE CASCADE,
        asignatura_id INTEGER REFERENCES asignaturas(id) ON DELETE CASCADE
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
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        escuela_id INTEGER
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
        escuela_id INTEGER,
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
        escuela_id INTEGER,
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
        escuela_id INTEGER,
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
        ano_escolar TEXT NOT NULL,
        escuela_id INTEGER
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS pagos_asignaturas (
        id SERIAL PRIMARY KEY,
        profesor_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        cantidad_pagada INTEGER NOT NULL,
        cantidad_usada INTEGER DEFAULT 0,
        fecha_pago TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        escuela_id INTEGER
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

    console.log('[Render] ✅ Tablas verificadas/creadas correctamente.');
  } finally {
    client.release();
  }
}

// ==========================
// LOGIN
// ==========================
router.post('/login', async (req, res) => {
  const { correo, contrasena } = req.body;
  const client = await pool.connect();

  try {
    const result = await client.query(
      'SELECT id, nombre, apellido, rol, correo FROM usuarios WHERE correo = $1 AND contrasena = $2',
      [correo, contrasena]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Credenciales incorrectas' });
    }

    res.json({ message: 'Login exitoso', usuario: result.rows[0] });
  } catch (error) {
    console.error('[LOGIN ERROR]', error.message);
    res.status(500).json({ message: 'Error al iniciar sesión', error: error.message });
  } finally {
    client.release();
  }
});

// ==========================
// REGISTRO DE USUARIO
// ==========================
router.post('/register', async (req, res) => {
  const { nombre, apellido, correo, telefono, rol, contrasena } = req.body;
  const client = await pool.connect();

  try {
    const existe = await client.query('SELECT id FROM usuarios WHERE correo = $1', [correo]);
    if (existe.rows.length > 0) {
      return res.status(400).json({ message: 'El correo ya está registrado.' });
    }

    const result = await client.query(
      `INSERT INTO usuarios (nombre, apellido, correo, telefono, rol, contrasena)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, nombre, apellido, rol, correo`,
      [nombre, apellido, correo, telefono, rol, contrasena]
    );

    res.json({ message: 'Usuario registrado correctamente', usuario: result.rows[0] });
  } catch (error) {
    console.error('[REGISTER ERROR]', error.message);
    res.status(500).json({ message: 'Error al registrar usuario', error: error.message });
  } finally {
    client.release();
  }
});

// ==========================
// RECUPERAR CONTRASEÑA
// ==========================
router.post('/recover-password', async (req, res) => {
  const { telefono, nuevaContrasena, respuesta1, respuesta2, respuesta3 } = req.body;
  const client = await pool.connect();

  try {
    const usuario = await client.query(
      `SELECT * FROM usuarios 
       WHERE telefono = $1 AND respuesta1 = $2 AND respuesta2 = $3 AND respuesta3 = $4`,
      [telefono, respuesta1, respuesta2, respuesta3]
    );

    if (usuario.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Datos de seguridad incorrectos' });
    }

    await client.query(`UPDATE usuarios SET contrasena = $1 WHERE telefono = $2`, [nuevaContrasena, telefono]);
    res.json({ success: true, message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('[RECOVER ERROR]', error.message);
    res.status(500).json({ success: false, message: 'Error en la recuperación', error: error.message });
  } finally {
    client.release();
  }
});

// ==========================
// SINCRONIZACIÓN POST
// ==========================
router.post('/sync/:tabla', async (req, res) => {
  const tabla = req.params.tabla;
  const datos = req.body;

  const tablasPermitidas = [
    'usuarios', 'estudiantes', 'cursos', 'asignaturas',
    'planificaciones', 'asistencia', 'calificacion_estandar',
    'calificacion_competencias', 'registro_asistencia_detallado',
    'pagos_asignaturas'
  ];

  if (!tablasPermitidas.includes(tabla)) {
    return res.status(400).json({ message: 'Tabla no permitida.' });
  }

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
      const updateSet = columnas.map(col => `${col} = EXCLUDED.${col}`).join(', ');

      await client.query(
        `INSERT INTO ${tabla} (${columnas.join(', ')})
         VALUES (${placeholders})
         ON CONFLICT (id) DO UPDATE SET ${updateSet}`,
        valores
      );
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
// DESCARGA DE DATOS (GET)
// ==========================
router.get('/sync/:tabla/:usuarioId?', async (req, res) => {
  const tabla = req.params.tabla;
  const usuarioId = req.params.usuarioId;
  const client = await pool.connect();

  try {
    await createTablesIfNotExist();
    let query = `SELECT * FROM ${tabla}`;
    let params = [];

    if (usuarioId) {
      switch (tabla) {
        case 'usuarios':
          query += ` WHERE id = $1`; params.push(usuarioId); break;
        case 'cursos':
          query += ` WHERE profesor_id = $1`; params.push(usuarioId); break;
        case 'asignaturas':
          query += ` WHERE curso_id IN (SELECT id FROM cursos WHERE profesor_id = $1)`; params.push(usuarioId); break;
        case 'planificaciones':
        case 'calificacion_estandar':
        case 'calificacion_competencias':
          query += ` WHERE profesor_id = $1`; params.push(usuarioId); break;
        case 'estudiantes':
          query += ` WHERE id IN (
            SELECT e.id FROM estudiantes e
            JOIN estudiante_asignatura ea ON ea.estudiante_id = e.id
            JOIN asignaturas a ON a.id = ea.asignatura_id
            JOIN cursos c ON c.id = a.curso_id
            WHERE c.profesor_id = $1
          )`; params.push(usuarioId); break;
        case 'asistencia':
          query += ` WHERE estudiante_id IN (
            SELECT e.id FROM estudiantes e
            JOIN estudiante_asignatura ea ON ea.estudiante_id = e.id
            JOIN asignaturas a ON a.id = ea.asignatura_id
            JOIN cursos c ON c.id = a.curso_id
            WHERE c.profesor_id = $1
          )`; params.push(usuarioId); break;
        case 'registro_asistencia_detallado':
          query += ` WHERE curso_id IN (SELECT id FROM cursos WHERE profesor_id = $1)`; params.push(usuarioId); break;
        case 'pagos_asignaturas':
          query += ` WHERE profesor_id = $1`; params.push(usuarioId); break;
      }
    }

    const result = await client.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error(`[GET ERROR] ${tabla}:`, error.message);
    res.status(500).json({ message: 'Error al obtener datos.', error: error.message });
  } finally {
    client.release();
  }
});

// ==========================
// ELIMINAR REGISTROS
// ==========================
router.delete('/sync/:tabla/:id', async (req, res) => {
  const { tabla, id } = req.params;
  const client = await pool.connect();

  try {
    await client.query(`DELETE FROM ${tabla} WHERE id = $1`, [id]);
    res.json({ message: `${tabla} eliminado correctamente.` });
  } catch (error) {
    console.error('[DELETE ERROR]', error.message);
    res.status(500).json({ message: 'Error al eliminar', error: error.message });
  } finally {
    client.release();
  }
});

// ==========================
// SINCRONIZAR USUARIOS (PATCH)
// ==========================
router.post('/usuarios-sync', async (req, res) => {
  const usuarios = req.body;
  const client = await pool.connect();

  try {
    for (const user of usuarios) {
      const columnas = Object.keys(user);
      const valores = Object.values(user);
      const placeholders = columnas.map((_, idx) => `$${idx + 1}`).join(', ');
      const updateSet = columnas.map(col => `${col} = EXCLUDED.${col}`).join(', ');

      await client.query(
        `INSERT INTO usuarios (${columnas.join(', ')})
         VALUES (${placeholders})
         ON CONFLICT (id) DO UPDATE SET ${updateSet}`,
        valores
      );
    }
    res.json({ message: 'Usuarios sincronizados correctamente.' });
  } catch (error) {
    console.error('[SYNC USUARIOS ERROR]', error.message);
    res.status(500).json({ message: 'Error al sincronizar usuarios', error: error.message });
  } finally {
    client.release();
  }
});

// ==========================
// CHECK-USER
// ==========================
router.post('/check-user', async (req, res) => {
  const { telefono } = req.body;
  const client = await pool.connect();

  try {
    const result = await client.query('SELECT id FROM usuarios WHERE telefono = $1', [telefono]);
    res.json({ exists: result.rows.length > 0 });
  } catch (error) {
    console.error('[CHECK-USER ERROR]', error.message);
    res.status(500).json({ exists: false, message: 'Error al verificar usuario' });
  } finally {
    client.release();
  }
});

module.exports = router;
