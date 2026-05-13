import { supabase } from '../lib/supabase';
import type { 
    MktCliente, 
    MktCampana, 
    MktLead, 
    MktInteraccion, 
    MktCurso, 
    MktInscripcion, 
    MktMensaje 
} from '../types/crm';

// Helper function to get the next ID for a table
async function getNextId(tableName: string, idColumn: string): Promise<number> {
    const { data, error } = await supabase
        .from(tableName)
        .select(idColumn)
        .order(idColumn, { ascending: false })
        .limit(1);

    if (error) {
        console.warn(`Error getting max ${idColumn} for ${tableName}:`, error);
        return 1; // Fallback if error
    }

    if (data && data.length > 0) {
        const firstRow = data[0] as any;
        return Number(firstRow[idColumn]) + 1;
    }
    return 1; // First row
}

export const crmService = {
    // --- CLIENTES ---
    async getClients(organizationId: string): Promise<MktCliente[]> {
        const { data, error } = await supabase
            .from('mkt_clientes')
            .select('*')
            .eq('organization_id', organizationId)
            .order('fecha_registro', { ascending: false });
        if (error) throw error;
        return data || [];
    },
    async createClient(client: Partial<MktCliente>, organizationId: string): Promise<MktCliente> {
        // Manually generate ID
        const nextId = await getNextId('mkt_clientes', 'id_cliente');
        const payload = { ...client, id_cliente: nextId, organization_id: organizationId };

        const { data, error } = await supabase.from('mkt_clientes').insert(payload).select().single();
        if (error) throw error;
        return data;
    },
    async updateClient(id: number, client: Partial<MktCliente>): Promise<MktCliente> {
        const { data, error } = await supabase.from('mkt_clientes').update(client).eq('id_cliente', id).select().single();
        if (error) throw error;
        return data;
    },

    // --- CAMPAÑAS ---
    async getCampaigns(organizationId: string): Promise<MktCampana[]> {
        const { data, error } = await supabase
            .from('mkt_campanas')
            .select('*')
            .eq('organization_id', organizationId)
            .order('fecha_inicio', { ascending: false });
        if (error) throw error;
        return data || [];
    },
    async createCampaign(campaign: Partial<MktCampana>, organizationId: string): Promise<MktCampana> {
        // Manually generate ID
        const nextId = await getNextId('mkt_campanas', 'id_campaña');
        const payload = { ...campaign, "id_campaña": nextId, organization_id: organizationId };

        const { data, error } = await supabase.from('mkt_campanas').insert(payload).select().single();
        if (error) throw error;
        return data;
    },
    async updateCampaign(id: number, campaign: Partial<MktCampana>): Promise<MktCampana> {
        const { data, error } = await supabase.from('mkt_campanas').update(campaign).eq('id_campaña', id).select().single();
        if (error) throw error;
        return data;
    },

    // --- LEADS ---
    async getLeads(organizationId: string): Promise<MktLead[]> {
        const { data, error } = await supabase
            .from('mkt_leads')
            .select(`
                *,
                cliente:mkt_clientes(*),
                campana:mkt_campanas(*)
            `)
            .eq('organization_id', organizationId)
            .order('fecha_lead', { ascending: false });
        if (error) throw error;
        return data || [];
    },
    async createLead(lead: Partial<MktLead>, organizationId: string): Promise<MktLead> {
        // Manually generate ID
        const nextId = await getNextId('mkt_leads', 'id_lead');
        const payload = { ...lead, id_lead: nextId, organization_id: organizationId };

        const { data, error } = await supabase.from('mkt_leads').insert(payload).select().single();
        if (error) throw error;
        return data;
    },
    async updateLead(id: number, lead: Partial<MktLead>): Promise<MktLead> {
        const { data, error } = await supabase.from('mkt_leads').update(lead).eq('id_lead', id).select().single();
        if (error) throw error;
        return data;
    },

    // --- CURSOS ---
    async getCourses(organizationId: string): Promise<MktCurso[]> {
        const { data, error } = await supabase
            .from('mkt_cursos')
            .select('*')
            .eq('organization_id', organizationId)
            .order('fecha_inicio', { ascending: false });
        if (error) throw error;
        return data || [];
    },
    async createCourse(course: Partial<MktCurso>, organizationId: string): Promise<MktCurso> {
        // Manually generate ID
        const nextId = await getNextId('mkt_cursos', 'id_curso');
        const payload = { ...course, id_curso: nextId, organization_id: organizationId };

        const { data, error } = await supabase.from('mkt_cursos').insert(payload).select().single();
        if (error) throw error;
        return data;
    },
    async updateCourse(id: number, course: Partial<MktCurso>): Promise<MktCurso> {
        const { data, error } = await supabase.from('mkt_cursos').update(course).eq('id_curso', id).select().single();
        if (error) throw error;
        return data;
    },

    // --- INTERACCIONES ---
    async getInteractions(organizationId: string, clienteId?: number): Promise<MktInteraccion[]> {
        let query = supabase
            .from('mkt_interacciones')
            .select('*, cliente:mkt_clientes(*)')
            .eq('organization_id', organizationId)
            .order('fecha', { ascending: false });
        
        if (clienteId) {
            query = query.eq('id_cliente', clienteId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    },
    async createInteraction(interaction: Partial<MktInteraccion>, organizationId: string): Promise<MktInteraccion> {
        // Manually generate ID
        const nextId = await getNextId('mkt_interacciones', 'id_interaccion');
        const payload = { ...interaction, id_interaccion: nextId, organization_id: organizationId };

        const { data, error } = await supabase.from('mkt_interacciones').insert(payload).select().single();
        if (error) throw error;
        return data;
    },
    async updateInteraction(id: number, interaction: Partial<MktInteraccion>): Promise<MktInteraccion> {
        const { data, error } = await supabase.from('mkt_interacciones').update(interaction).eq('id_interaccion', id).select().single();
        if (error) throw error;
        return data;
    },

    // --- INSCRIPCIONES ---
    async getInscriptions(organizationId: string): Promise<MktInscripcion[]> {
        const { data, error } = await supabase
            .from('mkt_inscripciones')
            .select('*, cliente:mkt_clientes(*), curso:mkt_cursos(*)')
            .eq('organization_id', organizationId)
            .order('fecha_inscripcion', { ascending: false });
        if (error) throw error;
        return data || [];
    },

    // --- MENSAJES ---
    async getMessages(organizationId: string, clienteId?: number): Promise<MktMensaje[]> {
        let query = supabase
            .from('mkt_mensajes')
            .select('*, cliente:mkt_clientes(*)')
            .eq('organization_id', organizationId)
            .order('fecha', { ascending: false });
        
        if (clienteId) {
            query = query.eq('id_cliente', clienteId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }
};
