-- Drop function if it already exists
DROP FUNCTION IF EXISTS get_table_schema(text);

-- Create a function to get the schema of a table
CREATE OR REPLACE FUNCTION get_table_schema(target_table text)
RETURNS TABLE (
    column_name text,
    data_type text,
    is_nullable boolean,
    is_primary_key boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.column_name::text,
        c.data_type::text,
        (c.is_nullable = 'YES')::boolean AS is_nullable,
        COALESCE(
            (
                SELECT true 
                FROM information_schema.key_column_usage kcu
                JOIN information_schema.table_constraints tc 
                  ON kcu.constraint_name = tc.constraint_name 
                  AND kcu.table_schema = tc.table_schema
                WHERE kcu.column_name = c.column_name 
                  AND kcu.table_name = c.table_name 
                  AND tc.constraint_type = 'PRIMARY KEY'
                LIMIT 1
            ), false
        )::boolean AS is_primary_key
    FROM 
        information_schema.columns c
    WHERE 
        c.table_name = target_table
        AND c.table_schema = 'public';
END;
$$;
