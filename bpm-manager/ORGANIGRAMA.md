# Sistema de Organigrama - BPM Manager

## 📋 Resumen

Se ha implementado un sistema completo de organigrama empresarial para BPM Manager que permite:
- Definir la estructura jerárquica de la empresa
- Crear departamentos y sub-departamentos
- Definir posiciones/cargos dentro de cada departamento
- Asignar empleados a posiciones
- Utilizar el organigrama para asignar tareas automáticamente en los flujos de trabajo

## 🗄️ Estructura de Base de Datos

### Tablas Creadas

#### 1. **departments** (Departamentos)
```sql
- id: uuid (PK)
- organization_id: uuid (FK → organizations)
- name: text (nombre del departamento)
- description: text (descripción opcional)
- parent_department_id: uuid (FK → departments, para jerarquía)
- created_at: timestamptz
- updated_at: timestamptz
```

**Características:**
- Soporte para jerarquía multinivel (departamentos y subdepartamentos)
- Cada departamento pertenece a una organización
- Restricción UNIQUE en (organization_id, name)

#### 2. **positions** (Posiciones/Cargos)
```sql
- id: uuid (PK)
- organization_id: uuid (FK → organizations)
- department_id: uuid (FK → departments, opcional)
- title: text (título del cargo)
- description: text (descripción opcional)
- level: integer (nivel jerárquico, 1 = más alto)
- reports_to_position_id: uuid (FK → positions, reporta a)
- created_at: timestamptz
- updated_at: timestamptz
```

**Características:**
- Define cargos/roles dentro de la organización
- Puede estar asociado a un departamento
- Nivel jerárquico numérico (1 = CEO, 2 = Gerente, 3 = Supervisor, etc.)
- Relación de reporte (quién reporta a quién)

#### 3. **employee_positions** (Asignación de Empleados)
```sql
- id: uuid (PK)
- user_id: uuid (FK → profiles)
- position_id: uuid (FK → positions)
- is_primary: boolean (posición principal del empleado)
- start_date: date (fecha de inicio)
- end_date: date (fecha de fin, opcional)
- created_at: timestamptz
```

**Características:**
- Un empleado puede tener múltiples posiciones
- Una posición puede ser marcada como "principal"
- Soporte para historial (start_date, end_date)

### Modificaciones a Tablas Existentes

#### **activities** (Actividades de Workflow)
Se agregaron campos para asignación automática:

```sql
- assignment_type: text ('manual', 'position', 'department', 'specific_user')
- assigned_position_id: uuid (FK → positions)
- assigned_department_id: uuid (FK → departments)
- assigned_user_id: uuid (FK → profiles)
```

## 🔧 Componentes Implementados

### 1. **useOrgChart.tsx** (Hook)
Hook personalizado para gestionar el organigrama.

**Funciones principales:**
- `buildDepartmentTree()` - Construye árbol jerárquico de departamentos
- `getPositionsWithEmployees()` - Obtiene posiciones con empleados asignados
- `createDepartment()` - Crear nuevo departamento
- `updateDepartment()` - Actualizar departamento
- `deleteDepartment()` - Eliminar departamento
- `createPosition()` - Crear nueva posición
- `updatePosition()` - Actualizar posición
- `deletePosition()` - Eliminar posición
- `assignEmployeeToPosition()` - Asignar empleado a posición
- `removeEmployeeFromPosition()` - Remover empleado de posición
- `getEmployeesInDepartment()` - Obtener empleados en un departamento
- `getEmployeesInPosition()` - Obtener empleados en una posición

### 2. **OrganizationalChart.tsx** (Componente Visual)
Interfaz completa para gestionar el organigrama.

**Características:**
- **Vista de Árbol**: Visualización jerárquica de departamentos y posiciones
- **Vista de Lista**: Tabla con todas las posiciones
- **Estadísticas**: Total de departamentos, posiciones y empleados
- **CRUD Completo**: Crear, editar y eliminar departamentos y posiciones
- **Modales Premium**: Diseño consistente con el resto de la aplicación
- **Expandir/Colapsar**: Navegación intuitiva del árbol organizacional

## 🎨 Interfaz de Usuario

### Vista de Árbol
```
📁 Recursos Humanos
  └─ 💼 Director de RRHH (Nivel 1)
  └─ 💼 Gerente de Reclutamiento (Nivel 2)
  └─ 📁 Capacitación
      └─ 💼 Coordinador de Capacitación (Nivel 3)

📁 Tecnología
  └─ 💼 CTO (Nivel 1)
  └─ 💼 Líder Técnico (Nivel 2)
```

### Vista de Lista
Tabla con columnas:
- Posición (con ícono)
- Departamento
- Nivel jerárquico
- Acciones (Editar/Eliminar)

### Estadísticas
- Total de Departamentos
- Total de Posiciones
- Total de Empleados Asignados

## 🔄 Flujo de Uso

### 1. Crear Estructura Organizacional

#### Paso 1: Crear Departamentos
1. Ir a **Organigrama** en el menú lateral
2. Clic en **"Nuevo Departamento"**
3. Ingresar:
   - Nombre del departamento
   - Descripción (opcional)
   - Departamento padre (opcional, para subdepartamentos)
4. Guardar

#### Paso 2: Crear Posiciones
1. Clic en **"Nueva Posición"**
2. Ingresar:
   - Título de la posición
   - Descripción (opcional)
   - Departamento
   - Nivel jerárquico (1 = más alto)
   - Reporta a (opcional)
3. Guardar

#### Paso 3: Asignar Empleados
1. Seleccionar una posición
2. Asignar usuarios a esa posición
3. Marcar posición principal si aplica

### 2. Usar en Workflows

Cuando creas o editas una actividad en un workflow, puedes configurar la asignación automática:

#### Asignación Manual
La tarea se asigna manualmente cuando se ejecuta el proceso.

#### Asignación por Posición
```
Tipo: position
Posición: "Gerente de Ventas"
→ La tarea se asigna a todos los usuarios con ese cargo
```

#### Asignación por Departamento
```
Tipo: department
Departamento: "Recursos Humanos"
→ La tarea se asigna a todos los usuarios en ese departamento
```

#### Asignación a Usuario Específico
```
Tipo: specific_user
Usuario: "juan.perez@empresa.com"
→ La tarea se asigna directamente a ese usuario
```

## 📊 Ejemplo de Estructura

```
Mi Empresa
├─ Dirección General
│  └─ CEO (Nivel 1)
│
├─ Recursos Humanos
│  ├─ Director de RRHH (Nivel 1)
│  ├─ Gerente de Reclutamiento (Nivel 2)
│  ├─ Gerente de Nómina (Nivel 2)
│  └─ Capacitación
│      └─ Coordinador de Capacitación (Nivel 3)
│
├─ Ventas
│  ├─ Director Comercial (Nivel 1)
│  ├─ Gerente de Ventas (Nivel 2)
│  └─ Ejecutivo de Ventas (Nivel 3)
│
└─ Tecnología
   ├─ CTO (Nivel 1)
   ├─ Líder Técnico (Nivel 2)
   ├─ Desarrollador Senior (Nivel 3)
   └─ Desarrollador Junior (Nivel 4)
```

## 🚀 Casos de Uso

### Caso 1: Aprobación de Vacaciones
```
Workflow: "Solicitud de Vacaciones"

Actividad 1: "Solicitar Vacaciones"
- Tipo: manual
- Cualquier empleado puede iniciar

Actividad 2: "Aprobar Vacaciones"
- Tipo: position
- Asignado a: "Gerente de RRHH"
- → Se asigna automáticamente al gerente de RRHH
```

### Caso 2: Aprobación por Jerarquía
```
Workflow: "Aprobación de Gastos"

Actividad 1: "Solicitar Reembolso"
- Tipo: manual

Actividad 2: "Aprobación Supervisor"
- Tipo: position
- Asignado a: posición que reporta el solicitante
- → Se asigna al jefe directo

Actividad 3: "Aprobación Gerencia" (si monto > $1000)
- Tipo: department
- Asignado a: "Finanzas"
- → Se asigna a cualquiera en finanzas
```

### Caso 3: Revisión por Departamento
```
Workflow: "Revisión de Documentos"

Actividad 1: "Subir Documento"
- Tipo: manual

Actividad 2: "Revisión Legal"
- Tipo: department
- Asignado a: "Legal"
- → Cualquier abogado puede revisar
```

## 🔐 Seguridad (RLS)

Todas las tablas tienen Row Level Security habilitado:

- **Departamentos**: Solo visibles para usuarios de la misma organización
- **Posiciones**: Solo visibles para usuarios de la misma organización
- **Asignaciones**: Solo visibles para usuarios de la misma organización
- **Modificaciones**: Solo administradores pueden crear/editar/eliminar

## 📝 Migración

Para aplicar la migración:

```bash
# Si usas Supabase CLI
supabase db push

# O ejecuta manualmente el archivo:
# supabase/migrations/20240215_organizational_chart.sql
```

## 🎯 Próximos Pasos (Opcional)

- [ ] Visualización gráfica del organigrama (diagrama de árbol)
- [ ] Importar/exportar estructura desde Excel
- [ ] Historial de cambios de posiciones
- [ ] Delegación temporal de responsabilidades
- [ ] Matriz de responsabilidades (RACI)
- [ ] Integración con sistema de permisos
- [ ] Reportes de carga de trabajo por posición
- [ ] Sugerencias de asignación basadas en carga actual

## 📦 Archivos Creados/Modificados

```
supabase/
└── migrations/
    └── 20240215_organizational_chart.sql  (NUEVO)

src/
├── types/
│   └── index.ts                           (MODIFICADO)
├── hooks/
│   └── useOrgChart.tsx                    (NUEVO)
├── components/
│   ├── OrganizationalChart.tsx            (NUEVO)
│   └── Layout.tsx                         (MODIFICADO)
└── App.tsx                                (MODIFICADO)
```

## ✅ Testing

### 1. Crear Estructura Básica
```
1. Crear departamento "Ventas"
2. Crear posición "Gerente de Ventas" en "Ventas", nivel 1
3. Crear posición "Ejecutivo de Ventas" en "Ventas", nivel 2
4. Asignar un usuario a "Gerente de Ventas"
```

### 2. Probar Jerarquía
```
1. Crear departamento "Tecnología"
2. Crear subdepartamento "Desarrollo" dentro de "Tecnología"
3. Verificar que aparece en el árbol correctamente
```

### 3. Probar Asignación en Workflow
```
1. Crear un workflow
2. Agregar actividad tipo "task"
3. Configurar asignación por posición
4. Ejecutar proceso y verificar que se asigna correctamente
```

---

**Desarrollado para BPM Manager**  
Sistema de Organigrama Empresarial con Asignación Automática de Tareas
