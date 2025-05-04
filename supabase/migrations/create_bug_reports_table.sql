-- Crear la tabla de reportes de bugs
CREATE TABLE IF NOT EXISTS public.bug_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'abierto',
  priority TEXT NOT NULL DEFAULT 'media',
  screenshot_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Añadir restricción para valores válidos de status
ALTER TABLE public.bug_reports ADD CONSTRAINT valid_status 
  CHECK (status IN ('abierto', 'en progreso', 'resuelto', 'cerrado', 'pendiente', 'completado'));

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS bug_reports_user_id_idx ON public.bug_reports(user_id);
CREATE INDEX IF NOT EXISTS bug_reports_status_idx ON public.bug_reports(status);

-- Habilitar Row Level Security
ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad:

-- 1. Política para ver reportes (todos los usuarios autenticados pueden ver)
CREATE POLICY "Usuarios pueden ver todos los reportes de bugs"
ON public.bug_reports
FOR SELECT
USING (auth.role() = 'authenticated');

-- 2. Política para crear reportes (todos los usuarios autenticados pueden crear)
CREATE POLICY "Usuarios pueden crear reportes de bugs"
ON public.bug_reports
FOR INSERT
WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

-- 3. Política para actualizar reportes (solo el creador puede actualizar sus propios reportes)
CREATE POLICY "Usuarios pueden actualizar sus propios reportes"
ON public.bug_reports
FOR UPDATE
USING (auth.uid() = user_id);

-- 4. Política para eliminar reportes (solo administradores pueden eliminar)
CREATE POLICY "Solo administradores pueden eliminar reportes"
ON public.bug_reports
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Trigger para actualizar el campo updated_at
CREATE OR REPLACE FUNCTION update_bug_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_bug_reports_updated_at
BEFORE UPDATE ON public.bug_reports
FOR EACH ROW
EXECUTE FUNCTION update_bug_reports_updated_at();

-- Añadir la tabla a la API pública
COMMENT ON TABLE public.bug_reports IS 'Tabla para almacenar reportes de bugs y problemas de la aplicación';
