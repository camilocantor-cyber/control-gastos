-- Tabla de Clientes
CREATE TABLE IF NOT EXISTS public.mkt_clientes (
    id_cliente BIGSERIAL PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    apellido TEXT,
    email TEXT,
    telefono TEXT,
    ciudad TEXT,
    pais TEXT,
    especialidad TEXT,
    institucion TEXT,
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    fuente_lead TEXT,
    estado_lead TEXT
);

ALTER TABLE public.mkt_clientes ENABLE ROW LEVEL SECURITY;

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

-- Tabla de Campañas
CREATE TABLE IF NOT EXISTS public.mkt_campanas (
    id_campaña BIGSERIAL PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    plataforma TEXT,
    presupuesto NUMERIC,
    fecha_inicio TIMESTAMP WITH TIME ZONE,
    fecha_fin TIMESTAMP WITH TIME ZONE,
    objetivo TEXT
);

ALTER TABLE public.mkt_campanas ENABLE ROW LEVEL SECURITY;

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

-- Tabla de Leads
CREATE TABLE IF NOT EXISTS public.mkt_leads (
    id_lead BIGSERIAL PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    id_cliente BIGINT REFERENCES public.mkt_clientes(id_cliente) ON DELETE SET NULL,
    id_campaña BIGINT REFERENCES public.mkt_campanas(id_campaña) ON DELETE SET NULL,
    fecha_lead TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    origen TEXT,
    estado TEXT
);

ALTER TABLE public.mkt_leads ENABLE ROW LEVEL SECURITY;

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

-- Tabla de Cursos
CREATE TABLE IF NOT EXISTS public.mkt_cursos (
    id_curso BIGSERIAL PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    nombre_curso TEXT NOT NULL,
    categoria TEXT,
    descripcion TEXT,
    modalidad TEXT,
    precio NUMERIC,
    fecha_inicio TIMESTAMP WITH TIME ZONE,
    duracion_horas INTEGER
);

ALTER TABLE public.mkt_cursos ENABLE ROW LEVEL SECURITY;

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

-- Tabla de Interacciones
CREATE TABLE IF NOT EXISTS public.mkt_interacciones (
    id_interaccion BIGSERIAL PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    id_cliente BIGINT REFERENCES public.mkt_clientes(id_cliente) ON DELETE SET NULL,
    tipo TEXT,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    descripcion TEXT,
    resultado TEXT
);

ALTER TABLE public.mkt_interacciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view interactions of their organization" 
    ON public.mkt_interacciones FOR SELECT 
    USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert interactions into their organization" 
    ON public.mkt_interacciones FOR INSERT 
    WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update interactions of their organization" 
    ON public.mkt_interacciones FOR UPDATE 
    USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete interactions of their organization" 
    ON public.mkt_interacciones FOR DELETE 
    USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()));

-- Tabla de Inscripciones
CREATE TABLE IF NOT EXISTS public.mkt_inscripciones (
    id_inscripcion BIGSERIAL PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    id_cliente BIGINT REFERENCES public.mkt_clientes(id_cliente) ON DELETE SET NULL,
    id_curso BIGINT REFERENCES public.mkt_cursos(id_curso) ON DELETE SET NULL,
    fecha_inscripcion TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    estado_pago TEXT,
    estado_curso TEXT
);

ALTER TABLE public.mkt_inscripciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view inscriptions of their organization" 
    ON public.mkt_inscripciones FOR SELECT 
    USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert inscriptions into their organization" 
    ON public.mkt_inscripciones FOR INSERT 
    WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update inscriptions of their organization" 
    ON public.mkt_inscripciones FOR UPDATE 
    USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete inscriptions of their organization" 
    ON public.mkt_inscripciones FOR DELETE 
    USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()));

-- Tabla de Mensajes
CREATE TABLE IF NOT EXISTS public.mkt_mensajes (
    id_mensaje BIGSERIAL PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    id_cliente BIGINT REFERENCES public.mkt_clientes(id_cliente) ON DELETE SET NULL,
    tipo TEXT,
    contenido TEXT,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.mkt_mensajes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages of their organization" 
    ON public.mkt_mensajes FOR SELECT 
    USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert messages into their organization" 
    ON public.mkt_mensajes FOR INSERT 
    WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update messages of their organization" 
    ON public.mkt_mensajes FOR UPDATE 
    USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete messages of their organization" 
    ON public.mkt_mensajes FOR DELETE 
    USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()));

-- Tabla de Automatizaciones
CREATE TABLE IF NOT EXISTS public.mkt_automatizaciones (
    id_automatizacion BIGSERIAL PRIMARY KEY,
    nombre TEXT,
    tipo_evento TEXT,
    accion TEXT
);

-- Note: no organization_id in mkt_automatizaciones according to types, but might need it.
