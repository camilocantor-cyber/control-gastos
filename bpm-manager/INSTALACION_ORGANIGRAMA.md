# 🚀 Guía de Instalación del Organigrama

## Opción 1: Ejecutar en Supabase Dashboard (Recomendado)

### Paso 1: Acceder al SQL Editor
1. Ve a tu proyecto en [https://supabase.com](https://supabase.com)
2. En el menú lateral, haz clic en **"SQL Editor"**
3. Haz clic en **"New query"**

### Paso 2: Copiar y Ejecutar la Migración
1. Abre el archivo: `supabase/migrations/20240215_organizational_chart.sql`
2. Copia TODO el contenido del archivo
3. Pégalo en el SQL Editor de Supabase
4. Haz clic en **"Run"** (o presiona Ctrl+Enter)

### Paso 3: Verificar la Instalación
Ejecuta esta consulta para verificar que las tablas se crearon:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('departments', 'positions', 'employee_positions')
ORDER BY table_name;
```

Deberías ver 3 tablas:
- ✅ departments
- ✅ employee_positions
- ✅ positions

---

## Opción 2: Instalar Supabase CLI (Opcional)

Si prefieres usar la línea de comandos:

### Paso 1: Instalar Supabase CLI

**Windows (PowerShell como Administrador):**
```powershell
# Usando Scoop
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# O usando npm
npm install -g supabase
```

### Paso 2: Inicializar Supabase
```bash
cd c:\Proyecto\OneDrive\Documentos\bpm-manager
supabase init
```

### Paso 3: Vincular tu Proyecto
```bash
supabase link --project-ref TU_PROJECT_REF
```

### Paso 4: Aplicar Migraciones
```bash
supabase db push
```

---

## 🎯 Después de la Instalación

### 1. Reinicia el Servidor de Desarrollo
```bash
npm run dev
```

### 2. Accede al Organigrama
1. Inicia sesión en tu aplicación
2. En el menú lateral, haz clic en **"Organigrama"**
3. ¡Comienza a crear tu estructura organizacional!

### 3. Crear tu Primera Estructura

**Ejemplo básico:**

1. **Crear Departamento Principal:**
   - Nombre: "Dirección General"
   - Descripción: "Dirección ejecutiva de la empresa"

2. **Crear Subdepartamentos:**
   - Nombre: "Recursos Humanos"
   - Departamento Padre: "Dirección General"
   
   - Nombre: "Ventas"
   - Departamento Padre: "Dirección General"

3. **Crear Posiciones:**
   - Título: "CEO"
   - Departamento: "Dirección General"
   - Nivel: 1
   
   - Título: "Gerente de RRHH"
   - Departamento: "Recursos Humanos"
   - Nivel: 2
   - Reporta a: "CEO"

4. **Asignar Empleados:**
   - Selecciona una posición
   - Asigna usuarios existentes
   - Marca la posición principal

---

## 🔍 Solución de Problemas

### Error: "relation already exists"
**Solución:** Las tablas ya existen. No necesitas ejecutar la migración nuevamente.

### Error: "permission denied"
**Solución:** Asegúrate de estar usando un usuario con permisos de administrador en Supabase.

### Error: "organization_members does not exist"
**Solución:** Primero ejecuta la migración `20240210_multi_tenancy.sql` si no lo has hecho.

### No veo el menú "Organigrama"
**Solución:** 
1. Verifica que hayas guardado los cambios en `Layout.tsx`
2. Reinicia el servidor de desarrollo
3. Limpia el caché del navegador (Ctrl+Shift+R)

---

## 📊 Datos de Prueba (Opcional)

Si quieres crear datos de prueba, ejecuta esto en el SQL Editor:

```sql
-- Obtener el ID de tu organización
DO $$
DECLARE
    org_id uuid;
    dept_rrhh_id uuid;
    dept_ventas_id uuid;
    pos_ceo_id uuid;
    pos_gerente_rrhh_id uuid;
BEGIN
    -- Obtener primera organización
    SELECT id INTO org_id FROM organizations LIMIT 1;
    
    -- Crear departamentos
    INSERT INTO departments (organization_id, name, description)
    VALUES 
        (org_id, 'Dirección General', 'Dirección ejecutiva de la empresa')
    RETURNING id INTO dept_rrhh_id;
    
    INSERT INTO departments (organization_id, name, description, parent_department_id)
    VALUES 
        (org_id, 'Recursos Humanos', 'Gestión del talento humano', dept_rrhh_id),
        (org_id, 'Ventas', 'Departamento comercial', dept_rrhh_id)
    RETURNING id INTO dept_ventas_id;
    
    -- Crear posiciones
    INSERT INTO positions (organization_id, department_id, title, level)
    VALUES 
        (org_id, dept_rrhh_id, 'CEO', 1)
    RETURNING id INTO pos_ceo_id;
    
    INSERT INTO positions (organization_id, department_id, title, level, reports_to_position_id)
    VALUES 
        (org_id, dept_rrhh_id, 'Gerente de RRHH', 2, pos_ceo_id),
        (org_id, dept_ventas_id, 'Gerente de Ventas', 2, pos_ceo_id);
    
    RAISE NOTICE 'Datos de prueba creados exitosamente!';
END $$;
```

---

## ✅ Checklist de Instalación

- [ ] Migración ejecutada en Supabase
- [ ] Tablas verificadas (departments, positions, employee_positions)
- [ ] Servidor de desarrollo reiniciado
- [ ] Menú "Organigrama" visible en la aplicación
- [ ] Primer departamento creado
- [ ] Primera posición creada
- [ ] Primer empleado asignado

---

## 🎓 Próximos Pasos

Una vez instalado, puedes:

1. **Definir tu estructura organizacional completa**
2. **Asignar todos tus empleados a sus posiciones**
3. **Configurar workflows para usar asignación automática**
4. **Probar la asignación de tareas basada en organigrama**

---

## 📞 Soporte

Si tienes problemas con la instalación:
1. Verifica que todas las migraciones anteriores estén aplicadas
2. Revisa los logs de error en Supabase
3. Asegúrate de tener las variables de entorno configuradas

**¡Listo para usar!** 🎉
