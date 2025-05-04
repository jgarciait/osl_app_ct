-- Función para listar todas las políticas RLS en el esquema public
CREATE OR REPLACE FUNCTION list_all_policies()
RETURNS TABLE (
    schema_name TEXT,
    table_name TEXT,
    policy_name TEXT,
    roles TEXT,
    cmd TEXT,
    qual TEXT,
    with_check TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        schemaname::TEXT,
        tablename::TEXT,
        policyname::TEXT,
        roles::TEXT,
        cmd::TEXT,
        qual::TEXT,
        with_check::TEXT
    FROM 
        pg_policies 
    WHERE 
        schemaname = 'public'
    ORDER BY 
        tablename, policyname;
END;
$$;

-- Asegurar que la función sea accesible para usuarios autenticados
GRANT EXECUTE ON FUNCTION list_all_policies() TO authenticated;
