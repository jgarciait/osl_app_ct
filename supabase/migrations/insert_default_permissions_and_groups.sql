-- Insertar permisos predeterminados
INSERT INTO permissions (name, resource, action, description)
VALUES
  ('Ver Expresiones', 'expressions', 'view', 'Permite ver expresiones'),
  ('Gestionar Expresiones', 'expressions', 'manage', 'Permite crear, editar y eliminar expresiones'),
  ('Ver Usuarios', 'users', 'view', 'Permite ver usuarios'),
  ('Gestionar Usuarios', 'users', 'manage', 'Permite crear, editar y eliminar usuarios'),
  ('Ver Grupos', 'groups', 'view', 'Permite ver grupos'),
  ('Gestionar Grupos', 'groups', 'manage', 'Permite crear, editar y eliminar grupos'),
  ('Ver Permisos', 'permissions', 'view', 'Permite ver permisos'),
  ('Gestionar Permisos', 'permissions', 'manage', 'Permite crear, editar y eliminar permisos')
ON CONFLICT (name) DO NOTHING;

-- Insertar grupos predeterminados
INSERT INTO groups (name, description)
VALUES
  ('Administradores', 'Grupo con acceso completo al sistema'),
  ('Gestores', 'Grupo con permisos para gestionar expresiones'),
  ('Lectores', 'Grupo con permisos solo de lectura')
ON CONFLICT (name) DO NOTHING;

-- Asignar permisos a grupos
-- Obtener IDs
DO $$
DECLARE
  admin_group_id UUID;
  manager_group_id UUID;
  reader_group_id UUID;
  
  view_expressions_id UUID;
  manage_expressions_id UUID;
  view_users_id UUID;
  manage_users_id UUID;
  view_groups_id UUID;
  manage_groups_id UUID;
  view_permissions_id UUID;
  manage_permissions_id UUID;
BEGIN
  -- Obtener IDs de grupos
  SELECT id INTO admin_group_id FROM groups WHERE name = 'Administradores';
  SELECT id INTO manager_group_id FROM groups WHERE name = 'Gestores';
  SELECT id INTO reader_group_id FROM groups WHERE name = 'Lectores';
  
  -- Obtener IDs de permisos
  SELECT id INTO view_expressions_id FROM permissions WHERE name = 'Ver Expresiones';
  SELECT id INTO manage_expressions_id FROM permissions WHERE name = 'Gestionar Expresiones';
  SELECT id INTO view_users_id FROM permissions WHERE name = 'Ver Usuarios';
  SELECT id INTO manage_users_id FROM permissions WHERE name = 'Gestionar Usuarios';
  SELECT id INTO view_groups_id FROM permissions WHERE name = 'Ver Grupos';
  SELECT id INTO manage_groups_id FROM permissions WHERE name = 'Gestionar Grupos';
  SELECT id INTO view_permissions_id FROM permissions WHERE name = 'Ver Permisos';
  SELECT id INTO manage_permissions_id FROM permissions WHERE name = 'Gestionar Permisos';
  
  -- Asignar todos los permisos al grupo de Administradores
  INSERT INTO group_permissions (group_id, permission_id)
  VALUES
    (admin_group_id, view_expressions_id),
    (admin_group_id, manage_expressions_id),
    (admin_group_id, view_users_id),
    (admin_group_id, manage_users_id),
    (admin_group_id, view_groups_id),
    (admin_group_id, manage_groups_id),
    (admin_group_id, view_permissions_id),
    (admin_group_id, manage_permissions_id)
  ON CONFLICT (group_id, permission_id) DO NOTHING;
  
  -- Asignar permisos de expresiones al grupo de Gestores
  INSERT INTO group_permissions (group_id, permission_id)
  VALUES
    (manager_group_id, view_expressions_id),
    (manager_group_id, manage_expressions_id),
    (manager_group_id, view_users_id)
  ON CONFLICT (group_id, permission_id) DO NOTHING;
  
  -- Asignar permisos de solo lectura al grupo de Lectores
  INSERT INTO group_permissions (group_id, permission_id)
  VALUES
    (reader_group_id, view_expressions_id)
  ON CONFLICT (group_id, permission_id) DO NOTHING;
  
END $$;

-- Asignar usuarios administradores al grupo de Administradores
DO $$
DECLARE
  admin_group_id UUID;
  admin_user_id UUID;
BEGIN
  -- Obtener ID del grupo de Administradores
  SELECT id INTO admin_group_id FROM groups WHERE name = 'Administradores';
  
  -- Asignar todos los usuarios con rol 'admin' al grupo de Administradores
  FOR admin_user_id IN SELECT id FROM profiles WHERE role = 'admin'
  LOOP
    INSERT INTO user_groups (user_id, group_id)
    VALUES (admin_user_id, admin_group_id)
    ON CONFLICT (user_id, group_id) DO NOTHING;
  END LOOP;
END $$;
