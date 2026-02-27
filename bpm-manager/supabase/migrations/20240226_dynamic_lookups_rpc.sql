-- Migrations for Dynamic PostgreSQL Lookups

-- 1. Helper function: Get all tables in the public schema
CREATE OR REPLACE FUNCTION get_database_tables()
RETURNS TABLE (table_name text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY 
    SELECT t.table_name::text
    FROM information_schema.tables t
    WHERE t.table_schema = 'public' 
      AND t.table_type = 'BASE TABLE'
    ORDER BY t.table_name;
END;
$$;

-- Grant EXECUTE permission to authenticated apps
GRANT EXECUTE ON FUNCTION get_database_tables() TO authenticated;


-- 2. Helper function: Get columns for a specific table
CREATE OR REPLACE FUNCTION get_table_columns(p_table_name text)
RETURNS TABLE (column_name text, data_type text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Basic validation to prevent arbitrary schema querying
    IF p_table_name IS NULL OR p_table_name = '' THEN
        RAISE EXCEPTION 'Table name cannot be empty';
    END IF;

    RETURN QUERY 
    SELECT c.column_name::text, c.data_type::text
    FROM information_schema.columns c
    WHERE c.table_schema = 'public' 
      AND c.table_name = p_table_name
    ORDER BY c.ordinal_position;
END;
$$;

-- Grant EXECUTE permission
GRANT EXECUTE ON FUNCTION get_table_columns(text) TO authenticated;


-- 3. The Core Lookup Execution Engine
-- Securely performs a dynamic query on a given table
CREATE OR REPLACE FUNCTION search_dynamic_table(
    p_table_name text,
    p_search_column text,
    p_search_term text,
    p_return_columns text[]
)
RETURNS TABLE (result_row jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sql text;
    v_columns text;
BEGIN
    -- 1. Sanitization & Validation (Crucial for Dynamic SQL)
    -- Ensure the table actually exists in the public schema
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = p_table_name
    ) THEN
        RAISE EXCEPTION 'Invalid table name or table does not exist in public schema';
    END IF;

    -- Ensure the search column exists in the table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = p_table_name AND column_name = p_search_column
    ) THEN
        RAISE EXCEPTION 'Invalid search column';
    END IF;

    -- Ensure all return columns exist in the table
    FOR i IN 1 .. array_length(p_return_columns, 1) LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = p_table_name AND column_name = p_return_columns[i]
        ) THEN
            RAISE EXCEPTION 'Invalid return column requested: %', p_return_columns[i];
        END IF;
    END LOOP;

    -- 2. Construct the safe SELECT columns string (e.g., "col1", "col2")
    SELECT string_agg(quote_ident(col), ', ')
    INTO v_columns
    FROM unnest(p_return_columns) AS col;

    -- Fallback if no columns provided
    IF v_columns IS NULL OR v_columns = '' THEN
        v_columns := '*';
    END IF;

    -- 3. Construct and Execute the Query securely using quote_ident() and parameter binding ($1)
    v_sql := format(
        'SELECT row_to_json(t.*)::jsonb FROM (SELECT %s FROM %I WHERE %I::text ILIKE $1 LIMIT 50) t',
        v_columns,
        p_table_name,
        p_search_column
    );

    -- Execute using ILIKE for case-insensitive partial matching
    RETURN QUERY EXECUTE v_sql USING '%' || p_search_term || '%';
END;
$$;

-- Grant EXECUTE permission
GRANT EXECUTE ON FUNCTION search_dynamic_table(text, text, text, text[]) TO authenticated;
