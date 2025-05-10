CREATE OR REPLACE FUNCTION public.get_all_peticiones()
RETURNS SETOF peticiones
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM peticiones ORDER BY created_at DESC;
$$;

-- Otorgar permisos para ejecutar la función
GRANT EXECUTE ON FUNCTION public.get_all_peticiones() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_peticiones() TO anon;
