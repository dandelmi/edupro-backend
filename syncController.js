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
      profesor_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS asignaturas (
      id SERIAL PRIMARY KEY,
      curso_id INTEGER NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
      nombre TEXT NOT NULL,
      color TEXT
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS estudiante_asignatura (
      estudiante_id INTEGER NOT NULL REFERENCES estudiantes(id) ON DELETE CASCADE,
      asignatura_id INTEGER NOT NULL REFERENCES asignaturas(id) ON DELETE CASCADE,
      PRIMARY KEY (estudiante_id, asignatura_id)
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS planificaciones (
      id SERIAL PRIMARY KEY,
      curso_id INTEGER REFERENCES cursos(id) ON DELETE CASCADE,
      asignatura_id INTEGER NOT NULL REFERENCES asignaturas(id) ON DELETE CASCADE,
      profesor_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
      tema TEXT NOT NULL,
      duracion INTEGER,
      json_plan TEXT NOT NULL,
      fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS asistencia (
      id SERIAL PRIMARY KEY,
      estudiante_id INTEGER NOT NULL REFERENCES estudiantes(id) ON DELETE CASCADE,
      asignatura_id INTEGER NOT NULL REFERENCES asignaturas(id) ON DELETE CASCADE,
      fecha TEXT NOT NULL,
      estado TEXT NOT NULL,
      comentario TEXT,
      UNIQUE (estudiante_id, asignatura_id, fecha)
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      nombre TEXT NOT NULL,
      apellido TEXT NOT NULL,
      correo TEXT NOT NULL UNIQUE,
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
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS calificacion_estandar (
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
      fecha TEXT,
      total_nota_acumulada REAL,
      UNIQUE (estudiante_id, asignatura_id, periodo)
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS calificacion_competencias (
      id SERIAL PRIMARY KEY,
      estudiante_id INTEGER NOT NULL REFERENCES estudiantes(id) ON DELETE CASCADE,
      asignatura_id INTEGER NOT NULL REFERENCES asignaturas(id) ON DELETE CASCADE,
      profesor_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      curso_id INTEGER NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
      periodo TEXT NOT NULL,
      fecha TEXT NOT NULL,
      c1 REAL,
      c2 REAL,
      c3 REAL,
      c4 REAL,
      completivo REAL,
      extraordinario REAL,
      promedio REAL,
      UNIQUE(estudiante_id, asignatura_id, curso_id, periodo)
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS registro_asistencia_detallado (
      id SERIAL PRIMARY KEY,
      curso_id INTEGER NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
      estudiante_id INTEGER NOT NULL REFERENCES estudiantes(id) ON DELETE CASCADE,
      nombre_estudiante TEXT,
      apellido_estudiante TEXT,
      estado TEXT NOT NULL,
      fecha TEXT NOT NULL,
      hora TEXT NOT NULL,
      dia_semana TEXT NOT NULL,
      comentario TEXT
    )`);

    console.log('[Render] Tablas verificadas o creadas correctamente (Espejo de local).');
  } finally {
    client.release();
  }
}
