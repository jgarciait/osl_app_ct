-- Función para obtener y actualizar el número de secuencia en una sola operación atómica
CREATE OR REPLACE FUNCTION get_and_increment_sequence()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_sequence TEXT;
  next_seq INTEGER;
BEGIN
  -- Bloquear la fila para evitar condiciones de carrera
  SELECT valor INTO current_sequence
  FROM secuencia
  WHERE id = 'next_sequence'
  FOR UPDATE;
  
  -- Calcular el siguiente valor
  next_seq := CAST(current_sequence AS INTEGER) + 1;
  
  -- Actualizar el valor en la base de datos
  UPDATE secuencia
  SET valor = next_seq::TEXT,
      updated_at = NOW()
  WHERE id = 'next_sequence';
  
  -- Devolver el valor actual (antes de incrementar)
  RETURN current_sequence;
END;
$$;

-- Asegurar que la función sea accesible para usuarios autenticados
GRANT EXECUTE ON FUNCTION get_and_increment_sequence() TO authenticated;
