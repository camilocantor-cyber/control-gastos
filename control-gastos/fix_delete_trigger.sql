-- Corregir la función del trigger para manejar el borrado (DELETE)
CREATE OR REPLACE FUNCTION update_journal_entry_totals()
RETURNS TRIGGER AS $$
DECLARE
    target_id UUID;
BEGIN
    -- Determinar el ID del asiento dependiendo de la operación
    IF (TG_OP = 'DELETE') THEN
        target_id := OLD.journal_entry_id;
    ELSE
        target_id := NEW.journal_entry_id;
    END IF;

    -- Solo actualizar si el asiento aún existe (evita errores en borrado en cascada)
    UPDATE journal_entries
    SET 
        total_debit = (
            SELECT COALESCE(SUM(debit_amount), 0)
            FROM journal_entry_details
            WHERE journal_entry_id = target_id
        ),
        total_credit = (
            SELECT COALESCE(SUM(credit_amount), 0)
            FROM journal_entry_details
            WHERE journal_entry_id = target_id
        ),
        updated_at = NOW()
    WHERE id = target_id;
    
    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Asegurar que la política RLS permita el borrado de detalles
DROP POLICY IF EXISTS "Usuarios pueden eliminar detalles de sus asientos" ON journal_entry_details;
CREATE POLICY "Usuarios pueden eliminar detalles de sus asientos" ON journal_entry_details
    FOR DELETE TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM journal_entries 
            WHERE id = journal_entry_id AND user_id = auth.uid()
        )
    );

-- Asegurar que la política de actualización permita el cambio de estado (Anular)
DROP POLICY IF EXISTS "Usuarios pueden actualizar sus asientos en borrador" ON journal_entries;
CREATE POLICY "Usuarios pueden actualizar sus propios asientos" ON journal_entries
    FOR UPDATE TO authenticated 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
