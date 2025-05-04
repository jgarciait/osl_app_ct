-- Crear tabla de grupos si no existe
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  parent_id UUID REFERENCES groups(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de permisos si no existe
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(resource, action)
);

-- Crear tabla de relación entre grupos y permisos si no existe
CREATE TABLE IF NOT EXISTS group_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, permission_id)
);

-- Crear tabla de relación entre usuarios y grupos si no existe
CREATE TABLE IF NOT EXISTS user_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, group_id)
);

-- Habilitar RLS en todas las tablas
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_groups ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS para grupos
CREATE POLICY "Users can view groups" ON groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert groups" ON groups FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update groups" ON groups FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can delete groups" ON groups FOR DELETE TO authenticated USING (true);

-- Crear políticas RLS para permisos
CREATE POLICY "Users can view permissions" ON permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert permissions" ON permissions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update permissions" ON permissions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can delete permissions" ON permissions FOR DELETE TO authenticated USING (true);

-- Crear políticas RLS para group_permissions
CREATE POLICY "Users can view group permissions" ON group_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert group permissions" ON group_permissions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update group permissions" ON group_permissions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can delete group permissions" ON group_permissions FOR DELETE TO authenticated USING (true);

-- Crear políticas RLS para user_groups
CREATE POLICY "Users can view their own groups" ON user_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert their own groups" ON user_groups FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update their own groups" ON user_groups FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can delete their own groups" ON user_groups FOR DELETE TO authenticated USING (true);
