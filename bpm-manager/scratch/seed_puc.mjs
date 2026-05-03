import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Manual env parsing
const envPath = path.resolve(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedPUC() {
    try {
        // 1. Get the first organization
        const { data: orgs, error: orgError } = await supabase
            .from('organizations')
            .select('id, name')
            .limit(1);

        if (orgError) throw orgError;
        if (!orgs || orgs.length === 0) {
            console.error('No organizations found');
            return;
        }

        const orgId = orgs[0].id;
        console.log(`Seeding PUC for organization: ${orgs[0].name} (${orgId})`);

        // 2. Define accounts
        const accounts = [
            // Level 1
            { code: '1', name: 'ACTIVO', account_type: 'ACTIVO', level: 1, nature: 'DEBITO', organization_id: orgId },
            { code: '2', name: 'PASIVO', account_type: 'PASIVO', level: 1, nature: 'CREDITO', organization_id: orgId },
            { code: '3', name: 'PATRIMONIO', account_type: 'PATRIMONIO', level: 1, nature: 'CREDITO', organization_id: orgId },
            { code: '4', name: 'INGRESOS', account_type: 'INGRESO', level: 1, nature: 'CREDITO', organization_id: orgId },
            { code: '5', name: 'GASTOS', account_type: 'GASTO', level: 1, nature: 'DEBITO', organization_id: orgId },
            { code: '6', name: 'COSTOS DE VENTAS', account_type: 'COSTOS', level: 1, nature: 'DEBITO', organization_id: orgId },
            { code: '7', name: 'COSTOS DE PRODUCCION O DE OPERACION', account_type: 'COSTOS', level: 1, nature: 'DEBITO', organization_id: orgId },
            { code: '8', name: 'CUENTAS DE ORDEN DEUDORAS', account_type: 'ORDEN', level: 1, nature: 'DEBITO', organization_id: orgId },
            { code: '9', name: 'CUENTAS DE ORDEN ACREEDORAS', account_type: 'ORDEN', level: 1, nature: 'CREDITO', organization_id: orgId },
            
            // Level 2 - Activos
            { code: '11', name: 'DISPONIBLE', account_type: 'ACTIVO', level: 2, nature: 'DEBITO', parent_code: '1', organization_id: orgId },
            { code: '12', name: 'INVERSIONES', account_type: 'ACTIVO', level: 2, nature: 'DEBITO', parent_code: '1', organization_id: orgId },
            { code: '13', name: 'DEUDORES', account_type: 'ACTIVO', level: 2, nature: 'DEBITO', parent_code: '1', organization_id: orgId },
            { code: '14', name: 'INVENTARIOS', account_type: 'ACTIVO', level: 2, nature: 'DEBITO', parent_code: '1', organization_id: orgId },
            { code: '15', name: 'PROPIEDADES, PLANTA Y EQUIPO', account_type: 'ACTIVO', level: 2, nature: 'DEBITO', parent_code: '1', organization_id: orgId },
            
            // Level 2 - Pasivos
            { code: '21', name: 'OBLIGACIONES FINANCIERAS', account_type: 'PASIVO', level: 2, nature: 'CREDITO', parent_code: '2', organization_id: orgId },
            { code: '22', name: 'PROVEEDORES', account_type: 'PASIVO', level: 2, nature: 'CREDITO', parent_code: '2', organization_id: orgId },
            { code: '23', name: 'CUENTAS POR PAGAR', account_type: 'PASIVO', level: 2, nature: 'CREDITO', parent_code: '2', organization_id: orgId },
            { code: '24', name: 'IMPUESTOS, GRAVAMENES Y TASAS', account_type: 'PASIVO', level: 2, nature: 'CREDITO', parent_code: '2', organization_id: orgId },
            { code: '25', name: 'OBLIGACIONES LABORALES', account_type: 'PASIVO', level: 2, nature: 'CREDITO', parent_code: '2', organization_id: orgId },
            
            // Level 2 - Patrimonio
            { code: '31', name: 'CAPITAL SOCIAL', account_type: 'PATRIMONIO', level: 2, nature: 'CREDITO', parent_code: '3', organization_id: orgId },
            { code: '32', name: 'SUPERAVIT DE CAPITAL', account_type: 'PATRIMONIO', level: 2, nature: 'CREDITO', parent_code: '3', organization_id: orgId },
            { code: '33', name: 'RESERVAS', account_type: 'PATRIMONIO', level: 2, nature: 'CREDITO', parent_code: '3', organization_id: orgId },
            
            // Level 2 - Ingresos
            { code: '41', name: 'OPERACIONALES', account_type: 'INGRESO', level: 2, nature: 'CREDITO', parent_code: '4', organization_id: orgId },
            { code: '42', name: 'NO OPERACIONALES', account_type: 'INGRESO', level: 2, nature: 'CREDITO', parent_code: '4', organization_id: orgId },
            
            // Level 2 - Gastos
            { code: '51', name: 'OPERACIONALES DE ADMINISTRACION', account_type: 'GASTO', level: 2, nature: 'DEBITO', parent_code: '5', organization_id: orgId },
            { code: '52', name: 'OPERACIONALES DE VENTAS', account_type: 'GASTO', level: 2, nature: 'DEBITO', parent_code: '5', organization_id: orgId },
            { code: '53', name: 'NO OPERACIONALES', account_type: 'GASTO', level: 2, nature: 'DEBITO', parent_code: '5', organization_id: orgId },
            
            // Level 3 - Common movement accounts
            { code: '1105', name: 'CAJA', account_type: 'ACTIVO', level: 3, nature: 'DEBITO', parent_code: '11', organization_id: orgId, accepts_movement: true },
            { code: '1110', name: 'BANCOS', account_type: 'ACTIVO', level: 3, nature: 'DEBITO', parent_code: '11', organization_id: orgId, accepts_movement: true },
            { code: '1305', name: 'CLIENTES', account_type: 'ACTIVO', level: 3, nature: 'DEBITO', parent_code: '13', organization_id: orgId, accepts_movement: true },
            { code: '2205', name: 'NACIONALES (PROVEEDORES)', account_type: 'PASIVO', level: 3, nature: 'CREDITO', parent_code: '22', organization_id: orgId, accepts_movement: true },
            { code: '4135', name: 'COMERCIO AL POR MAYOR Y AL POR MENOR', account_type: 'INGRESO', level: 3, nature: 'CREDITO', parent_code: '41', organization_id: orgId, accepts_movement: true },
            { code: '5105', name: 'GASTOS DE PERSONAL', account_type: 'GASTO', level: 3, nature: 'DEBITO', parent_code: '51', organization_id: orgId, accepts_movement: true },
            { code: '5135', name: 'SERVICIOS', account_type: 'GASTO', level: 3, nature: 'DEBITO', parent_code: '51', organization_id: orgId, accepts_movement: true },
            { code: '110505', name: 'CAJA GENERAL', account_type: 'ACTIVO', level: 4, nature: 'DEBITO', parent_code: '1105', organization_id: orgId, accepts_movement: true },
            { code: '111005', name: 'MONEDA NACIONAL (BANCOS)', account_type: 'ACTIVO', level: 4, nature: 'DEBITO', parent_code: '1110', organization_id: orgId, accepts_movement: true }
        ];

        console.log(`Inserting ${accounts.length} accounts...`);
        
        for (const account of accounts) {
            const { error: insertError } = await supabase
                .from('chart_of_accounts')
                .upsert([account], { onConflict: 'code,organization_id' });
            
            if (insertError) {
                console.warn(`Error inserting account ${account.code}: ${insertError.message}`);
            } else {
                console.log(`Inserted: ${account.code} - ${account.name}`);
            }
        }

        console.log('PUC Seeding completed successfully');
    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

seedPUC();
