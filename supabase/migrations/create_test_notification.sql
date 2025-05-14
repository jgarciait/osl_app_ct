-- Crear una notificación de prueba si no existe ninguna
INSERT INTO public.system_notifications (
  title, 
  message, 
  type, 
  is_active, 
  is_dismissible, 
  priority
)
SELECT 
  'Notificación de prueba', 
  'Esta es una notificación de prueba para verificar que el sistema de notificaciones funciona correctamente.', 
  'info', 
  true, 
  true, 
  3
WHERE NOT EXISTS (
  SELECT 1 FROM public.system_notifications LIMIT 1
);
