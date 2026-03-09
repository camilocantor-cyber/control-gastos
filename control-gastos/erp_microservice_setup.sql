-- =====================================================
-- MICROSERVICIO DE INTEGRACIÓN FINANCIERA (ERP BRIDGE)
-- =====================================================

-- 1. Tabla para gestionar las fuentes externas y sus API Keys
CREATE TABLE IF NOT EXISTS integration_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    api_key VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabla para log de movimientos integrados
CREATE TABLE IF NOT EXISTS external_intake_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID REFERENCES integration_sources(id),
    raw_payload JSONB,
    status VARCHAR(50), -- 'SUCCESS', 'ERROR'
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Habilitar RLS para seguridad
ALTER TABLE integration_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_intake_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden ver sus fuentes" ON integration_sources
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 4. FUNCIÓN NÚCLEO DEL MICROSERVICIO: Ingesta de Movimientos
-- Esta función será expuesta vía RPC y podrá ser llamada por el BPM u otros sistemas
CREATE OR REPLACE FUNCTION ingest_external_transaction(
    p_api_key VARCHAR,
    p_date DATE,
    p_amount DECIMAL,
    p_description TEXT,
    p_type VARCHAR, -- 'income' or 'expense'
    p_category VARCHAR,
    p_provider_name VARCHAR DEFAULT NULL,
    p_concept_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_source_id UUID;
    v_user_id UUID;
    v_transaction_id UUID;
    v_entry_id UUID;
    v_provider_id UUID := NULL;
    v_mapping_count INTEGER;
BEGIN
    -- 1. Validar API Key y obtener propietario
    SELECT id, user_id INTO v_source_id, v_user_id
    FROM integration_sources
    WHERE api_key = p_api_key AND is_active = true;

    IF v_source_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'API Key inválida o fuente inactiva');
    END IF;

    -- 2. Buscar o crear el proveedor si se proporciona
    IF p_provider_name IS NOT NULL AND p_provider_name != '' THEN
        SELECT id INTO v_provider_id FROM providers WHERE name = p_provider_name AND user_id = v_user_id LIMIT 1;
        
        IF v_provider_id IS NULL THEN
            INSERT INTO providers (name, user_id) VALUES (p_provider_name, v_user_id) RETURNING id INTO v_provider_id;
        END IF;
    END IF;

    -- 3. Insertar el movimiento financiero
    INSERT INTO transactions (
        user_id, date, amount, description, type, category, provider
    ) VALUES (
        v_user_id, p_date, p_amount, p_description, p_type, p_category, p_provider_name
    ) RETURNING id INTO v_transaction_id;

    -- 4. Si se proporcionó un concepto contable, disparar la contabilidad automática
    IF p_concept_id IS NOT NULL THEN
        -- Verificar si el concepto tiene mapeos
        SELECT COUNT(*) INTO v_mapping_count FROM concept_account_mappings WHERE concept_id = p_concept_id;
        
        IF v_mapping_count > 0 THEN
            -- Generar el asiento (Llamando a una versión SQL de la lógica que ya tenemos)
            INSERT INTO journal_entries (
                entry_number, entry_date, concept_id, transaction_id, 
                description, user_id, status, total_debit, total_credit
            ) VALUES (
                generate_entry_number(), p_date, p_concept_id, v_transaction_id,
                p_description, v_user_id, 'POSTED', p_amount, p_amount
            ) RETURNING id INTO v_entry_id;

            -- Insertar detalles basados en el mapeo
            INSERT INTO journal_entry_details (
                journal_entry_id, line_number, account_code, description, 
                debit_amount, credit_amount, provider_id
            )
            SELECT 
                v_entry_id, 
                position, 
                account_code, 
                p_description,
                CASE WHEN movement_type = 'DEBITO' THEN p_amount ELSE 0 END,
                CASE WHEN movement_type = 'CREDITO' THEN p_amount ELSE 0 END,
                CASE WHEN movement_type = 'CREDITO' THEN v_provider_id ELSE NULL END
            FROM concept_account_mappings
            WHERE concept_id = p_concept_id;
        END IF;
    END IF;

    -- 5. Registrar Log de éxito
    INSERT INTO external_intake_logs (source_id, status, raw_payload)
    VALUES (v_source_id, 'SUCCESS', json_build_object(
        'transaction_id', v_transaction_id,
        'entry_id', v_entry_id,
        'amount', p_amount
    ));

    RETURN json_build_object(
        'success', true, 
        'transaction_id', v_transaction_id, 
        'entry_id', v_entry_id
    );

EXCEPTION WHEN OTHERS THEN
    -- Registrar Log de error
    INSERT INTO external_intake_logs (source_id, status, error_message, raw_payload)
    VALUES (v_source_id, 'ERROR', SQLERRM, json_build_object('date', p_date, 'amount', p_amount));
    
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;
