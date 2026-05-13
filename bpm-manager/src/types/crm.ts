export type LeadStatus = 'nuevo' | 'contactado' | 'calificado' | 'convertido' | 'perdido' | string;

export interface MktCliente {
    id_cliente: number;
    organization_id: string;
    nombre: string;
    apellido?: string;
    email?: string;
    telefono?: string;
    ciudad?: string;
    pais?: string;
    especialidad?: string;
    institucion?: string;
    fecha_registro?: string;
    fuente_lead?: string;
    estado_lead?: string;
}

export interface MktCampana {
    id_campaña: number;
    organization_id: string;
    nombre: string;
    plataforma?: string;
    presupuesto?: number;
    fecha_inicio?: string;
    fecha_fin?: string;
    objetivo?: string;
}

export interface MktLead {
    id_lead: number;
    organization_id: string;
    id_cliente?: number;
    id_campaña?: number;
    fecha_lead?: string;
    origen?: string;
    estado?: string;
    
    // Virtual fields for relations (simulated populated fields)
    cliente?: MktCliente;
    campana?: MktCampana;
}

export interface MktInteraccion {
    id_interaccion: number;
    organization_id: string;
    id_cliente?: number;
    tipo?: string;
    fecha?: string;
    descripcion?: string;
    resultado?: string;

    cliente?: MktCliente;
}

export interface MktCurso {
    id_curso: number;
    organization_id: string;
    nombre_curso: string;
    categoria?: string;
    descripcion?: string;
    modalidad?: string;
    precio?: number;
    fecha_inicio?: string;
    duracion_horas?: number;
}

export interface MktInscripcion {
    id_inscripcion: number;
    organization_id: string;
    id_cliente?: number;
    id_curso?: number;
    fecha_inscripcion?: string;
    estado_pago?: string;
    estado_curso?: string;

    cliente?: MktCliente;
    curso?: MktCurso;
}

export interface MktMensaje {
    id_mensaje: number;
    organization_id: string;
    id_cliente?: number;
    tipo?: string;
    contenido?: string;
    fecha?: string;

    cliente?: MktCliente;
}

export interface MktAutomatizacion {
    id_automatizacion: number;
    nombre?: string;
    tipo_evento?: string;
    accion?: string;
}
