-- Verificar si la tabla ya existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'peticionEstatus') THEN
        -- Crear la tabla peticionEstatus
        CREATE TABLE "peticionEstatus" (
            id SERIAL PRIMARY KEY,
            nombre TEXT NOT NULL,
            color TEXT NOT NULL DEFAULT '#3B82F6',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Insertar estatus predeterminados
        INSERT INTO "peticionEstatus" (nombre, color) VALUES
            ('Recibida', '#3B82F6'),
            ('Asignada', '#10B981'),
            ('En revisión', '#F59E0B'),
            ('Despachada', '#6366F1');
    END IF;
END
$$;

-- Asegurarse de que la columna peticionEstatus_id existe en la tabla peticiones
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'peticiones' 
        AND column_name = 'peticionEstatus_id'
    ) THEN
        ALTER TABLE "peticiones" ADD COLUMN "peticionEstatus_id" INTEGER REFERENCES "peticionEstatus"(id);
    END IF;
END
$$;
