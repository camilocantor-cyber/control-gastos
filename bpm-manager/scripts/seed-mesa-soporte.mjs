/**
 * Seed script: MESA DE SOPORTE workflow
 * Actividad 1: Requerimiento de Sistemas
 * Actividad 2: Solución Requerimiento
 *
 * Run: node scripts/seed-mesa-soporte.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xmeoqyoccxbaaumsxamf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtZW9xeW9jY3hiYWF1bXN4YW1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1ODczNzUsImV4cCI6MjA4NjE2MzM3NX0.CACbsqx7EvEpsaO4ANJ83XrKVkS2QHI9oZt_4IB99zs';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── CONFIG ───────────────────────────────────────────────────────────────────
// Email del usuario administrador (debe existir en la BD)
const ADMIN_EMAIL = 'ccantor@gmail.com';
// ──────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔐  Autenticando sesión...');

  // Get current session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    console.error('❌  No hay sesión activa. Por favor inicia sesión en la app primero, o usa signInWithPassword.');
    console.log('\n💡  Intentando obtener organización directamente desde perfiles...');
  }

  // Get profile and organization of the admin user
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, organization_id, full_name')
    .eq('email', ADMIN_EMAIL)
    .limit(1);

  // If profiles table doesn't have email, try via auth
  let userId, organizationId;

  if (profileError || !profiles || profiles.length === 0) {
    console.log('⚠️  No se encontró perfil por email. Buscando por organization_members...');

    // Try to get via organization_members
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id, name')
      .limit(5);

    console.log('Organizaciones disponibles:', orgs);

    if (!orgs || orgs.length === 0) {
      console.error('❌  No se encontraron organizaciones. Verifica las credenciales.');
      process.exit(1);
    }

    // Use first org
    organizationId = orgs[0].id;
    console.log(`✅  Usando organización: ${orgs[0].name} (${organizationId})`);

    // Get a user from this org
    const { data: members } = await supabase
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', organizationId)
      .limit(1);

    userId = members?.[0]?.user_id;
    if (!userId) {
      console.error('❌  No se encontró ningún usuario en la organización.');
      process.exit(1);
    }
  } else {
    userId = profiles[0].id;
    organizationId = profiles[0].organization_id;
    console.log(`✅  Usuario: ${profiles[0].full_name} | Org: ${organizationId}`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. CREAR EL WORKFLOW
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n📋  Creando workflow MESA DE SOPORTE...');

  const { data: workflow, error: wfError } = await supabase
    .from('workflows')
    .insert([{
      organization_id: organizationId,
      name: 'MESA DE SOPORTE',
      description: 'Flujo para gestión de requerimientos de sistemas. Permite registrar solicitudes de soporte técnico y hacer seguimiento hasta su resolución.',
      created_by: userId,
      status: 'active',
      version: 'v1.0',
      name_template: 'Soporte #{{consecutivo}} - {{funcionario}}',
      is_public: false,
      category_id: null,
    }])
    .select()
    .single();

  if (wfError) {
    console.error('❌  Error creando workflow:', wfError.message);
    process.exit(1);
  }

  console.log(`✅  Workflow creado: ${workflow.id}`);

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. CREAR ACTIVIDADES
  // ─────────────────────────────────────────────────────────────────────────────

  // Activity 1: Requerimiento de Sistemas (start / task)
  console.log('\n🔷  Creando Actividad 1: Requerimiento de Sistemas...');
  const { data: act1, error: act1Error } = await supabase
    .from('activities')
    .insert([{
      workflow_id: workflow.id,
      name: 'Requerimiento de Sistemas',
      description: 'El funcionario diligencia el formulario con la solicitud de soporte a sistemas.',
      type: 'start',
      x_pos: 200,
      y_pos: 250,
      width: 200,
      height: 80,
      form_columns: 2,
      assignment_type: 'creator',
      assignment_strategy: 'manual',
    }])
    .select()
    .single();

  if (act1Error) {
    console.error('❌  Error creando actividad 1:', act1Error.message);
    process.exit(1);
  }
  console.log(`✅  Actividad 1 creada: ${act1.id}`);

  // Activity 2: Solución Requerimiento (task)
  console.log('\n🔷  Creando Actividad 2: Solución Requerimiento...');
  const { data: act2, error: act2Error } = await supabase
    .from('activities')
    .insert([{
      workflow_id: workflow.id,
      name: 'Solución Requerimiento',
      description: 'La Oficina de Sistemas diligencia la solución dada al requerimiento y el solicitante confirma recibido a conformidad.',
      type: 'task',
      x_pos: 550,
      y_pos: 250,
      width: 200,
      height: 80,
      form_columns: 2,
      assignment_type: 'manual',
      assignment_strategy: 'manual',
    }])
    .select()
    .single();

  if (act2Error) {
    console.error('❌  Error creando actividad 2:', act2Error.message);
    process.exit(1);
  }
  console.log(`✅  Actividad 2 creada: ${act2.id}`);

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. CAMPOS ACTIVIDAD 1 — Requerimiento de Sistemas
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n📝  Creando campos de Actividad 1...');

  const fields1 = [
    {
      activity_id: act1.id,
      name: 'fecha_solicitud',
      label: 'Fecha',
      type: 'date',
      required: true,
      order_index: 1,
      is_global_header: true,
      placeholder: 'AAAA-MM-DD',
      description: 'Fecha de la solicitud',
    },
    {
      activity_id: act1.id,
      name: 'funcionario',
      label: 'Funcionario',
      type: 'text',
      required: true,
      order_index: 2,
      is_global_header: true,
      placeholder: 'Nombre del funcionario que solicita',
    },
    {
      activity_id: act1.id,
      name: 'jefe_oficina',
      label: 'Jefe Oficina o Gerencia',
      type: 'text',
      required: false,
      order_index: 3,
      placeholder: 'Nombre del jefe o gerente',
    },
    {
      activity_id: act1.id,
      name: 'visto_bueno',
      label: 'Visto Bueno (Vo. Bd.)',
      type: 'boolean',
      required: false,
      order_index: 4,
      description: 'Aprobación del jefe de oficina o gerencia',
    },
    {
      activity_id: act1.id,
      name: 'descripcion_solicitud',
      label: 'Descripción de la Solicitud',
      type: 'textarea',
      required: true,
      order_index: 5,
      placeholder: 'Campo para detallar la solicitud. Por favor ser lo más claro posible.',
      description: 'Detalle completo del requerimiento de sistemas',
      rows: 6,
    },
    {
      activity_id: act1.id,
      name: 'consecutivo',
      label: 'Consecutivo No.',
      type: 'consecutivo',
      required: false,
      order_index: 6,
      consecutive_mask: 'SOP-YYYY-####',
      consecutive_id: 'MESA_SOPORTE',
      description: 'Número consecutivo asignado por la Oficina de Sistemas',
    },
    {
      activity_id: act1.id,
      name: 'recibido_por',
      label: 'Recibido Por (Sistemas)',
      type: 'text',
      required: false,
      order_index: 7,
      placeholder: 'Nombre del funcionario de sistemas que recibe',
      description: 'Diligenciado por la Oficina de Sistemas',
    },
    {
      activity_id: act1.id,
      name: 'fecha_recepcion_sistemas',
      label: 'Fecha Recepción (Sistemas)',
      type: 'date',
      required: false,
      order_index: 8,
      placeholder: 'AAAA-MM-DD',
      description: 'Fecha en que la Oficina de Sistemas recibe el requerimiento',
    },
    {
      activity_id: act1.id,
      name: 'hora_recepcion_sistemas',
      label: 'Hora Recepción (Sistemas)',
      type: 'text',
      required: false,
      order_index: 9,
      placeholder: 'HH:MM',
      description: 'Hora en que la Oficina de Sistemas recibe el requerimiento',
    },
  ];

  const { error: fields1Error } = await supabase
    .from('activity_field_definitions')
    .insert(fields1);

  if (fields1Error) {
    console.error('❌  Error creando campos actividad 1:', fields1Error.message);
    process.exit(1);
  }
  console.log(`✅  ${fields1.length} campos creados para Actividad 1`);

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. CAMPOS ACTIVIDAD 2 — Solución Requerimiento
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n📝  Creando campos de Actividad 2...');

  const fields2 = [
    {
      activity_id: act2.id,
      name: 'realizado_por',
      label: 'Realizado Por',
      type: 'text',
      required: true,
      order_index: 1,
      placeholder: 'Nombre del técnico o responsable de la solución',
      description: 'Funcionario de la Oficina de Sistemas que atendió el requerimiento',
    },
    {
      activity_id: act2.id,
      name: 'observaciones_solucion',
      label: 'Observaciones',
      type: 'textarea',
      required: true,
      order_index: 2,
      placeholder: 'Descripción de la solución implementada...',
      description: 'Detalle de la solución dada al requerimiento',
      rows: 5,
    },
    {
      activity_id: act2.id,
      name: 'fecha_solucion',
      label: 'Fecha Solución',
      type: 'date',
      required: true,
      order_index: 3,
      placeholder: 'AAAA-MM-DD',
    },
    {
      activity_id: act2.id,
      name: 'hora_solucion',
      label: 'Hora Solución',
      type: 'text',
      required: false,
      order_index: 4,
      placeholder: 'HH:MM',
    },
    {
      activity_id: act2.id,
      name: 'recibido_por_solicitante',
      label: 'Recibido Por (Solicitante)',
      type: 'text',
      required: false,
      order_index: 5,
      placeholder: 'Nombre del solicitante que recibe la solución',
      description: 'Diligenciado por quien realizó el requerimiento',
      source_activity_id: act1.id,
      source_field_name: 'funcionario',
    },
    {
      activity_id: act2.id,
      name: 'fecha_recepcion_solicitante',
      label: 'Fecha Recepción (Solicitante)',
      type: 'date',
      required: false,
      order_index: 6,
      placeholder: 'AAAA-MM-DD',
    },
    {
      activity_id: act2.id,
      name: 'hora_recepcion_solicitante',
      label: 'Hora Recepción (Solicitante)',
      type: 'text',
      required: false,
      order_index: 7,
      placeholder: 'HH:MM',
    },
    {
      activity_id: act2.id,
      name: 'recibido_conformidad',
      label: 'Recibido a Conformidad',
      type: 'boolean',
      required: true,
      order_index: 8,
      description: 'Confirmación de que el solicitante recibió la solución a satisfacción (SI / NO)',
      default_value: 'true',
    },
  ];

  const { error: fields2Error } = await supabase
    .from('activity_field_definitions')
    .insert(fields2);

  if (fields2Error) {
    console.error('❌  Error creando campos actividad 2:', fields2Error.message);
    process.exit(1);
  }
  console.log(`✅  ${fields2.length} campos creados para Actividad 2`);

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. CREAR TRANSICIONES (Act1 → Act2)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n🔗  Creando transición entre actividades...');

  const { error: transError } = await supabase
    .from('transitions')
    .insert([{
      workflow_id: workflow.id,
      source_id: act1.id,
      target_id: act2.id,
      condition: null,
    }]);

  if (transError) {
    console.error('❌  Error creando transición:', transError.message);
    process.exit(1);
  }
  console.log('✅  Transición creada');

  // ─────────────────────────────────────────────────────────────────────────────
  // RESUMEN
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(60));
  console.log('🎉  ¡MESA DE SOPORTE creado exitosamente!');
  console.log('═'.repeat(60));
  console.log(`  Workflow ID : ${workflow.id}`);
  console.log(`  Actividad 1 : ${act1.id} → Requerimiento de Sistemas (${fields1.length} campos)`);
  console.log(`  Actividad 2 : ${act2.id} → Solución Requerimiento (${fields2.length} campos)`);
  console.log('═'.repeat(60));
  console.log('\n✅  Abre la app y busca "MESA DE SOPORTE" en la lista de flujos.\n');
}

main().catch(err => {
  console.error('💥  Error inesperado:', err);
  process.exit(1);
});
