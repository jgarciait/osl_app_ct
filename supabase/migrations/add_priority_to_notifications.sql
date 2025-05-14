-- Añadir la columna priority a la tabla system_notifications si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'system_notifications'
        AND column_name = 'priority'
    ) THEN
        ALTER TABLE public.system_notifications ADD COLUMN priority INTEGER DEFAULT 1;
        COMMENT ON COLUMN public.system_notifications.priority IS 'Prioridad de la notificación (mayor número = mayor prioridad)';
    END IF;
END
$$;
