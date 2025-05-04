-- Crear la tabla de audit_trail_expresiones si no existe
CREATE TABLE IF NOT EXISTS public.audit_trail_expresiones (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id),
    action TEXT
);

-- Comentario en la tabla
COMMENT ON TABLE public.audit_trail_expresiones IS 'Registro de acciones de usuarios en el sistema';

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_audit_trail_user_id ON public.audit_trail_expresiones(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_created_at ON public.audit_trail_expresiones(created_at);

-- Políticas de seguridad RLS
ALTER TABLE public.audit_trail_expresiones ENABLE ROW LEVEL SECURITY;

-- Política para permitir a los usuarios ver solo sus propios registros
DROP POLICY IF EXISTS "Users can view their own audit trail" ON public.audit_trail_expresiones;
CREATE POLICY "Users can view their own audit trail" 
    ON public.audit_trail_expresiones 
    FOR SELECT 
    TO authenticated 
    USING (user_id = auth.uid());

-- Política para permitir a los administradores ver todos los registros
DROP POLICY IF EXISTS "Admins can view all audit trail" ON public.audit_trail_expresiones;
CREATE POLICY "Admins can view all audit trail" 
    ON public.audit_trail_expresiones 
    FOR SELECT 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM user_permissions up
            JOIN permissions p ON up.permission_id = p.id
            WHERE up.user_id = auth.uid()
            AND p.resource = 'audit_trail'
            AND p.action = 'view'
        )
    );

-- Política para permitir a cualquier usuario autenticado insertar registros
DROP POLICY IF EXISTS "Users can insert audit trail" ON public.audit_trail_expresiones;
CREATE POLICY "Users can insert audit trail" 
    ON public.audit_trail_expresiones 
    FOR INSERT 
    TO authenticated 
    WITH CHECK (user_id = auth.uid());

-- Política para permitir a los administradores insertar registros para cualquier usuario
DROP POLICY IF EXISTS "Admins can insert audit trail for any user" ON public.audit_trail_expresiones;
CREATE POLICY "Admins can insert audit trail for any user" 
    ON public.audit_trail_expresiones 
    FOR INSERT 
    TO authenticated 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_permissions up
            JOIN permissions p ON up.permission_id = p.id
            WHERE up.user_id = auth.uid()
            AND p.resource = 'audit_trail'
            AND p.action = 'manage'
        )
    );
