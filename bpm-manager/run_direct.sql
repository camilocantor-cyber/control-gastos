DROP POLICY IF EXISTS "Admins can insert categories" ON workflow_categories;
DROP POLICY IF EXISTS "Admins can update categories" ON workflow_categories;
DROP POLICY IF EXISTS "Admins can delete categories" ON workflow_categories;

CREATE POLICY "Users can insert categories"
    ON workflow_categories FOR INSERT
    WITH CHECK (organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can update categories"
    ON workflow_categories FOR UPDATE
    USING (organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can delete categories"
    ON workflow_categories FOR DELETE
    USING (organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
    ));
