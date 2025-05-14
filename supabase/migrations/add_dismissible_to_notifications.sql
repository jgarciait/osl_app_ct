-- Añadir la columna is_dismissible a la tabla system_notifications si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'system_notifications'
        AND column_name = 'is_dismissible'
    ) THEN
        ALTER TABLE public.system_notifications ADD COLUMN is_dismissible BOOLEAN NOT NULL DEFAULT true;
        COMMENT ON COLUMN public.system_notifications.is_dismissible IS 'Indica si el usuario puede cerrar la notificación';
    END IF;
END
$$;
