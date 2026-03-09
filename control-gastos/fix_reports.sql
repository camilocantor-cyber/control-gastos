-- =====================================================
-- REPARACIÓN DE INFORMES CONTABLES
-- Ejecuta este script para asegurar que las funciones 
-- de reporte tengan los tipos correctos.
-- =====================================================

-- 1. Asegurar que los tipos de retorno coincidan exactamente con la tabla
CREATE OR REPLACE FUNCTION get_account_balances(
    p_user_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    account_code VARCHAR,
    account_name VARCHAR,
    account_type VARCHAR,
    nature VARCHAR,
    total_debit DECIMAL,
    total_credit DECIMAL,
    balance DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        jed.account_code::VARCHAR,
        coa.name::VARCHAR as account_name,
        coa.account_type::VARCHAR,
        coa.nature::VARCHAR,
        SUM(jed.debit_amount)::DECIMAL as total_debit,
        SUM(jed.credit_amount)::DECIMAL as total_credit,
        CASE 
            WHEN coa.nature = 'DEBITO' THEN SUM(jed.debit_amount) - SUM(jed.credit_amount)
            ELSE SUM(jed.credit_amount) - SUM(jed.debit_amount)
        END::DECIMAL as balance
    FROM journal_entry_details jed
    INNER JOIN chart_of_accounts coa ON jed.account_code = coa.code
    INNER JOIN journal_entries je ON jed.journal_entry_id = je.id
    WHERE je.user_id = p_user_id 
      AND je.status = 'POSTED'
      AND (p_start_date IS NULL OR je.entry_date >= p_start_date)
      AND (p_end_date IS NULL OR je.entry_date <= p_end_date)
    GROUP BY jed.account_code, coa.name, coa.account_type, coa.nature;
END;
$$ LANGUAGE plpgsql;

-- 2. Verificar que el PUC esté cargado (si no hay datos, esto no arreglará el reporte, pero es bueno saberlo)
-- El usuario debe haber ejecutado puc_data.sql previamente.
