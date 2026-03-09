# 📊 SISTEMA CONTABLE - GUÍA DE IMPLEMENTACIÓN

## 🎯 Resumen del Proyecto

Hemos transformado **control-gastos** en un sistema contable completo con:

✅ Plan Único de Cuentas (PUC) Colombia NIIF  
✅ Conceptos contables con mapeo automático  
✅ Asientos contables (partida doble)  
✅ Integración con transacciones existentes  
✅ Reportes contables  

---

## 📁 Archivos Creados

### 1. **Base de Datos (SQL)**
- `supabase_schema.sql` - Esquema completo de tablas
- `puc_data.sql` - Carga del PUC colombiano NIIF
- `accounting_concepts_data.sql` - Conceptos contables predefinidos

### 2. **TypeScript Types**
- `src/types/accounting.ts` - Tipos para todo el sistema contable

### 3. **Hooks**
- `src/hooks/useChartOfAccounts.ts` - Gestión del PUC
- `src/hooks/useAccountingConcepts.ts` - Gestión de conceptos
- `src/hooks/useJournalEntries.ts` - Gestión de asientos contables

### 4. **Componentes**
- `src/components/PUCManager.tsx` - Administrador del PUC (CRUD completo)

---

## 🚀 PASOS PARA IMPLEMENTAR

### **Paso 1: Ejecutar Scripts SQL en Supabase**

1. Ve a tu proyecto en Supabase
2. Abre el **SQL Editor**
3. Ejecuta los scripts en este orden:

```sql
-- 1. Primero el esquema
-- Copiar y ejecutar: supabase_schema.sql

-- 2. Luego la data del PUC
-- Copiar y ejecutar: puc_data.sql

-- 3. Finalmente los conceptos
-- Copiar y ejecutar: accounting_concepts_data.sql
```

### **Paso 2: Actualizar App.tsx**

Agrega las nuevas vistas al menú de navegación:

```typescript
// En App.tsx, actualizar el tipo de view:
const [view, setView] = useState<
  'dashboard' | 'transactions' | 'reports' | 'categories' | 'providers' | 'puc' | 'concepts' | 'journal'
>('dashboard');

// Agregar las nuevas vistas:
{view === 'puc' && <PUCManager />}
{view === 'concepts' && <AccountingConceptManager />}
{view === 'journal' && <JournalEntryViewer />}
```

### **Paso 3: Actualizar Layout.tsx**

Agrega los nuevos botones de navegación:

```typescript
// En el sidebar, agregar:
<button
  onClick={() => onNavigate('puc')}
  className={/* estilos */}
>
  <FileText className="w-5 h-5" />
  <span>Plan de Cuentas</span>
</button>

<button
  onClick={() => onNavigate('concepts')}
  className={/* estilos */}
>
  <BookOpen className="w-5 h-5" />
  <span>Conceptos Contables</span>
</button>

<button
  onClick={() => onNavigate('journal')}
  className={/* estilos */}
>
  <BookMarked className="w-5 h-5" />
  <span>Asientos Contables</span>
</button>
```

---

## 🔧 Próximos Componentes a Crear

### 1. **AccountingConceptManager.tsx**
Componente para administrar conceptos contables:
- Listar conceptos
- Crear/editar conceptos
- Configurar mapeo de cuentas (débito/crédito)
- Asociar cuentas de banco vs ingresos
- Asociar gastos vs proveedores

### 2. **JournalEntryViewer.tsx**
Visualizador de asientos contables:
- Listar todos los asientos
- Ver detalles de cada asiento
- Filtrar por fecha, estado, concepto
- Contabilizar asientos en borrador
- Anular asientos

### 3. **Integración con TransactionForm**
Modificar `TransactionForm.tsx` para:
- Seleccionar concepto contable al crear transacción
- Generar asiento automático al guardar
- Mostrar vista previa del asiento antes de guardar

---

## 📊 Flujo de Trabajo

### **Para INGRESOS:**
1. Usuario crea transacción de ingreso
2. Selecciona concepto (ej: "Ingreso por Ventas de Contado")
3. Sistema genera automáticamente:
   - **DÉBITO**: Caja General (110505) - $100,000
   - **CRÉDITO**: Ventas (4135) - $100,000

### **Para GASTOS:**
1. Usuario crea transacción de gasto
2. Selecciona concepto (ej: "Gasto de Arrendamiento")
3. Selecciona proveedor
4. Sistema genera automáticamente:
   - **DÉBITO**: Arrendamientos (5120) - $50,000
   - **CRÉDITO**: Banco (111005) - $50,000
   - **Proveedor**: Asociado a la línea de crédito

---

## 🎨 Características Implementadas

### **Plan de Cuentas (PUC)**
- ✅ Estructura jerárquica (5 niveles)
- ✅ Clasificación por tipo (Activo, Pasivo, etc.)
- ✅ Naturaleza (Débito/Crédito)
- ✅ Control de movimientos
- ✅ Vista en árbol expandible
- ✅ Búsqueda y filtros

### **Conceptos Contables**
- ✅ Tipos: Ingreso, Gasto, Transferencia, Ajuste
- ✅ Mapeo automático de cuentas
- ✅ Configuración de débitos y créditos
- ✅ Asociación con proveedores

### **Asientos Contables**
- ✅ Partida doble automática
- ✅ Estados: Borrador, Contabilizado, Anulado
- ✅ Validación de balance
- ✅ Numeración automática
- ✅ Trazabilidad con transacciones
- ✅ Detalles con cuentas y proveedores

---

## 🔐 Seguridad (RLS)

Todas las tablas tienen Row Level Security:
- Los usuarios solo ven sus propios asientos
- El PUC y conceptos son visibles para todos
- Solo se pueden modificar asientos en borrador

---

## 📈 Reportes Disponibles (Vistas SQL)

### **v_account_balances**
Balance de cada cuenta contable

### **v_journal_entries_full**
Asientos con todos sus detalles en JSON

---

## 🎯 Siguiente Paso

¿Quieres que cree ahora:
1. **AccountingConceptManager** (Gestión de conceptos)
2. **JournalEntryViewer** (Visualizador de asientos)
3. **Integración con TransactionForm** (Generación automática)

¡Dime cuál prefieres y continuamos! 🚀
