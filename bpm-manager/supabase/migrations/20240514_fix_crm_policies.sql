-- Fix CRM Tables Policies

-- Clientes
DROP POLICY IF EXISTS "Users can view clients of their organization" ON public.mkt_clientes;
DROP POLICY IF EXISTS "Users can insert clients into their organization" ON public.mkt_clientes;
DROP POLICY IF EXISTS "Users can update clients of their organization" ON public.mkt_clientes;
DROP POLICY IF EXISTS "Users can delete clients of their organization" ON public.mkt_clientes;

CREATE POLICY "Users can view clients of their organization" 
    ON public.mkt_clientes FOR SELECT 
    USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert clients into their organization" 
    ON public.mkt_clientes FOR INSERT 
    WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can update clients of their organization" 
    ON public.mkt_clientes FOR UPDATE 
    USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can delete clients of their organization" 
    ON public.mkt_clientes FOR DELETE 
    USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));


-- Campañas
DROP POLICY IF EXISTS "Users can view campaigns of their organization" ON public.mkt_campanas;
DROP POLICY IF EXISTS "Users can insert campaigns into their organization" ON public.mkt_campanas;
DROP POLICY IF EXISTS "Users can update campaigns of their organization" ON public.mkt_campanas;
DROP POLICY IF EXISTS "Users can delete campaigns of their organization" ON public.mkt_campanas;

CREATE POLICY "Users can view campaigns of their organization" 
    ON public.mkt_campanas FOR SELECT 
    USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert campaigns into their organization" 
    ON public.mkt_campanas FOR INSERT 
    WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can update campaigns of their organization" 
    ON public.mkt_campanas FOR UPDATE 
    USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can delete campaigns of their organization" 
    ON public.mkt_campanas FOR DELETE 
    USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));


-- Leads
DROP POLICY IF EXISTS "Users can view leads of their organization" ON public.mkt_leads;
DROP POLICY IF EXISTS "Users can insert leads into their organization" ON public.mkt_leads;
DROP POLICY IF EXISTS "Users can update leads of their organization" ON public.mkt_leads;
DROP POLICY IF EXISTS "Users can delete leads of their organization" ON public.mkt_leads;

CREATE POLICY "Users can view leads of their organization" 
    ON public.mkt_leads FOR SELECT 
    USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert leads into their organization" 
    ON public.mkt_leads FOR INSERT 
    WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can update leads of their organization" 
    ON public.mkt_leads FOR UPDATE 
    USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can delete leads of their organization" 
    ON public.mkt_leads FOR DELETE 
    USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));


-- Cursos
DROP POLICY IF EXISTS "Users can view courses of their organization" ON public.mkt_cursos;
DROP POLICY IF EXISTS "Users can insert courses into their organization" ON public.mkt_cursos;
DROP POLICY IF EXISTS "Users can update courses of their organization" ON public.mkt_cursos;
DROP POLICY IF EXISTS "Users can delete courses of their organization" ON public.mkt_cursos;

CREATE POLICY "Users can view courses of their organization" 
    ON public.mkt_cursos FOR SELECT 
    USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert courses into their organization" 
    ON public.mkt_cursos FOR INSERT 
    WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can update courses of their organization" 
    ON public.mkt_cursos FOR UPDATE 
    USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can delete courses of their organization" 
    ON public.mkt_cursos FOR DELETE 
    USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));


-- Interacciones
DROP POLICY IF EXISTS "Users can view interactions of their organization" ON public.mkt_interacciones;
DROP POLICY IF EXISTS "Users can insert interactions into their organization" ON public.mkt_interacciones;
DROP POLICY IF EXISTS "Users can update interactions of their organization" ON public.mkt_interacciones;
DROP POLICY IF EXISTS "Users can delete interactions of their organization" ON public.mkt_interacciones;

CREATE POLICY "Users can view interactions of their organization" 
    ON public.mkt_interacciones FOR SELECT 
    USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert interactions into their organization" 
    ON public.mkt_interacciones FOR INSERT 
    WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can update interactions of their organization" 
    ON public.mkt_interacciones FOR UPDATE 
    USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can delete interactions of their organization" 
    ON public.mkt_interacciones FOR DELETE 
    USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));


-- Inscripciones
DROP POLICY IF EXISTS "Users can view inscriptions of their organization" ON public.mkt_inscripciones;
DROP POLICY IF EXISTS "Users can insert inscriptions into their organization" ON public.mkt_inscripciones;
DROP POLICY IF EXISTS "Users can update inscriptions of their organization" ON public.mkt_inscripciones;
DROP POLICY IF EXISTS "Users can delete inscriptions of their organization" ON public.mkt_inscripciones;

CREATE POLICY "Users can view inscriptions of their organization" 
    ON public.mkt_inscripciones FOR SELECT 
    USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert inscriptions into their organization" 
    ON public.mkt_inscripciones FOR INSERT 
    WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can update inscriptions of their organization" 
    ON public.mkt_inscripciones FOR UPDATE 
    USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can delete inscriptions of their organization" 
    ON public.mkt_inscripciones FOR DELETE 
    USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));


-- Mensajes
DROP POLICY IF EXISTS "Users can view messages of their organization" ON public.mkt_mensajes;
DROP POLICY IF EXISTS "Users can insert messages into their organization" ON public.mkt_mensajes;
DROP POLICY IF EXISTS "Users can update messages of their organization" ON public.mkt_mensajes;
DROP POLICY IF EXISTS "Users can delete messages of their organization" ON public.mkt_mensajes;

CREATE POLICY "Users can view messages of their organization" 
    ON public.mkt_mensajes FOR SELECT 
    USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert messages into their organization" 
    ON public.mkt_mensajes FOR INSERT 
    WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can update messages of their organization" 
    ON public.mkt_mensajes FOR UPDATE 
    USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can delete messages of their organization" 
    ON public.mkt_mensajes FOR DELETE 
    USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
