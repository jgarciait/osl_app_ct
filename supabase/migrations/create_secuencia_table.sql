-- Crear tabla de secuencia si no existe
CREATE TABLE IF NOT EXISTS secuencia (
  id TEXT PRIMARY KEY,
  valor TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar configuración inicial para la secuencia si no existe
INSERT INTO secuencia (id, valor)
VALUES ('next_sequence', '1')
ON CONFLICT (id) DO NOTHING;

-- Crear política RLS para permitir acceso a usuarios autenticados
ALTER TABLE secuencia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden leer secuencia"
ON secuencia FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Administradores pueden modificar secuencia"
ON secuencia FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);
