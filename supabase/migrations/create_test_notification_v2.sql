-- Eliminar notificaciones existentes para empezar limpio
DELETE FROM public.user_notification_status;
DELETE FROM public.system_notifications;

-- Crear una notificación de prueba con alta prioridad
INSERT INTO public.system_notifications (
  title, 
  message, 
  type, 
  is_active,
  created_at,
  updated_at
)
VALUES (
  'Notificación Importante', 
  'Este es un mensaje de prueba para verificar que el sistema de notificaciones está funcionando correctamente.', 
  'info', 
  true,
  NOW(),
  NOW()
);

-- Si las columnas existen, actualizar sus valores
DO $$
BEGIN
  -- Verificar si la columna priority existe
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'system_notifications'
    AND column_name = 'priority'
  ) THEN
    UPDATE public.system_notifications
    SET priority = 3
    WHERE title = 'Notificación Importante';
  END IF;

  -- Verificar si la columna is_dismissible existe
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'system_notifications'
    AND column_name = 'is_dismissible'
  ) THEN
    UPDATE public.system_notifications
    SET is_dismissible = true
    WHERE title = 'Notificación Importante';
  END IF;
END
$$;
