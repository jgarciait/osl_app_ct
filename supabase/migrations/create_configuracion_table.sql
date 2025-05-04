-- Crear tabla de configuración si no existe
CREATE TABLE IF NOT EXISTS configuracion (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clave TEXT NOT NULL UNIQUE,
  valor TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar configuración inicial para la secuencia si no existe
INSERT INTO configuracion (clave, valor)
VALUES ('next_sequence', '1')
ON CONFLICT (clave) DO NOTHING;

-- Crear política RLS para permitir acceso a usuarios autenticados
ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden leer configuración"
ON configuracion FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Administradores pueden modificar configuración"
ON configuracion FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);
