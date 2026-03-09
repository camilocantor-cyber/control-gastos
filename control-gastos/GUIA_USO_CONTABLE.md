# 🎉 SISTEMA CONTABLE COMPLETO - GUÍA DE USO

## ✅ IMPLEMENTACIÓN COMPLETADA

### 🆕 **Nuevas Funcionalidades**

#### 1. **Asientos Contables Manuales** 📝
Ahora puedes crear asientos contables manualmente con balance automático.

**Características:**
- ✅ Agregar líneas de débito y crédito
- ✅ Balanceo automático con un clic
- ✅ Validación de partida doble en tiempo real
- ✅ Selección de cuentas desde el PUC
- ✅ Indicador visual de balance
- ✅ Mínimo 2 líneas por asiento

**Cómo usar:**
1. Ve a **Asientos** en el menú lateral
2. Clic en **"Nuevo Asiento Manual"**
3. Completa la información general:
   - Fecha
   - Concepto (opcional)
   - Referencia (opcional)
   - Descripción
4. Agrega líneas de débito/crédito:
   - Selecciona cuenta del PUC
   - Ingresa monto en débito O crédito
   - Agrega descripción (opcional)
5. Si no está balanceado, clic en **"Balancear Automáticamente"**
6. Clic en **"Guardar Asiento"**

#### 2. **Generación Automática de Asientos** 🤖
Los ingresos y gastos ahora generan asientos contables automáticamente.

**Características:**
- ✅ Selector de concepto contable en el formulario de transacciones
- ✅ Generación automática al guardar
- ✅ Asociación con proveedores
- ✅ Asientos contabilizados automáticamente
- ✅ Indicador visual cuando se selecciona un concepto

**Cómo usar:**
1. Crea un nuevo movimiento (ingreso o gasto)
2. Completa los datos normales (monto, categoría, etc.)
3. **Nuevo:** Selecciona un **Concepto Contable**
   - El sistema filtra automáticamente por tipo (ingreso/gasto)
   - Aparece mensaje: "✓ Se generará un asiento contable automáticamente"
4. Guarda el movimiento
5. El asiento se crea automáticamente en segundo plano

---

## 📊 FLUJO DE TRABAJO COMPLETO

### **Opción A: Asiento Automático (Recomendado)**

```
1. Usuario crea transacción
   ├─ Tipo: Ingreso
   ├─ Monto: $100,000
   ├─ Categoría: Ventas
   ├─ Concepto: "Ingreso por Ventas de Contado" ← NUEVO
   └─ Guardar

2. Sistema genera automáticamente:
   ├─ Transacción guardada
   └─ Asiento contable creado:
       ├─ DÉBITO: Caja (110505) - $100,000
       └─ CRÉDITO: Ventas (4135) - $100,000
       └─ Estado: POSTED (Contabilizado)
```

### **Opción B: Asiento Manual**

```
1. Usuario va a "Asientos"
2. Clic en "Nuevo Asiento Manual"
3. Completa información:
   ├─ Fecha: 2026-02-16
   ├─ Descripción: "Venta de contado"
   └─ Líneas:
       ├─ Línea 1: Caja (110505) - DÉBITO: $100,000
       └─ Línea 2: Ventas (4135) - CRÉDITO: $100,000
4. Sistema valida balance ✓
5. Guardar → Asiento creado en DRAFT
```

---

## 🎯 CASOS DE USO

### **Caso 1: Venta de Contado**

**Método Automático:**
1. Nuevo Movimiento → Ingreso
2. Monto: $500,000
3. Concepto: "Ingreso por Ventas de Contado"
4. Guardar

**Resultado:**
```
ASIENTO #2026-000001
DÉBITO:  Caja (110505)      $500,000
CRÉDITO: Ventas (4135)      $500,000
Estado: POSTED
```

### **Caso 2: Pago de Arriendo**

**Método Automático:**
1. Nuevo Movimiento → Gasto
2. Monto: $1,200,000
3. Proveedor: "Inmobiliaria XYZ"
4. Concepto: "Gasto de Arrendamiento"
5. Guardar

**Resultado:**
```
ASIENTO #2026-000002
DÉBITO:  Arrendamientos (5120)  $1,200,000
CRÉDITO: Banco (111005)         $1,200,000
Proveedor: Inmobiliaria XYZ
Estado: POSTED
```

### **Caso 3: Asiento Complejo (Manual)**

**Escenario:** Compra de activo con IVA

1. Nuevo Asiento Manual
2. Descripción: "Compra equipo de cómputo"
3. Líneas:
   - Equipo de cómputo (152405) - DÉBITO: $2,000,000
   - IVA Descontable (240805) - DÉBITO: $380,000
   - Banco (111005) - CRÉDITO: $2,380,000
4. Balance automático ✓
5. Guardar

---

## 🔧 CONFIGURACIÓN DE CONCEPTOS

### **Conceptos Predefinidos Disponibles:**

#### **Ingresos:**
- Ingreso por Ventas de Contado
- Ingreso por Ventas con Tarjeta
- Ingreso por Servicios Profesionales
- Otros Ingresos

#### **Gastos:**
- Gasto de Arrendamiento
- Gasto de Servicios Públicos
- Gasto de Honorarios
- Gasto de Mantenimiento
- Gasto de Viajes
- Gasto de Publicidad
- Gasto de Seguros
- Otros Gastos

#### **Transferencias:**
- Transferencia entre Cuentas
- Consignación Bancaria

### **Crear Concepto Personalizado:**

1. Ve a **Conceptos** en el menú
2. Clic en **"Nuevo Concepto"**
3. Completa:
   - Código (ej: ING-001)
   - Nombre
   - Tipo (Ingreso/Gasto/Transferencia)
   - Descripción
4. Configura mapeos de cuentas:
   - Cuenta débito
   - Cuenta crédito
   - Marcar cuenta principal
5. Guardar

---

## 📈 REPORTES Y CONSULTAS

### **Ver Asientos Contables:**

1. Ve a **Asientos** en el menú
2. Usa filtros:
   - Búsqueda por número o descripción
   - Estado (Borrador/Contabilizado/Anulado)
   - Rango de fechas
3. Clic en 👁️ para ver detalles completos

### **Estadísticas Disponibles:**

- Total de asientos
- Borradores pendientes
- Asientos contabilizados
- Asientos anulados

### **Acciones Disponibles:**

- **Borradores:**
  - Ver detalles
  - Contabilizar (✓)
  
- **Contabilizados:**
  - Ver detalles
  - Anular (✗)

- **Anulados:**
  - Solo ver detalles

---

## 🎨 CARACTERÍSTICAS DE UI

### **Asiento Manual:**
- ✅ Modal grande y centrado
- ✅ Tabla dinámica de líneas
- ✅ Agregar/eliminar líneas
- ✅ Balance en tiempo real
- ✅ Botón de balanceo automático
- ✅ Validación visual (verde/naranja)
- ✅ Totales destacados

### **Formulario de Transacción:**
- ✅ Selector de concepto con icono
- ✅ Filtrado automático por tipo
- ✅ Mensaje de confirmación
- ✅ Integración sin fricción

### **Visor de Asientos:**
- ✅ Tabla completa con todos los datos
- ✅ Filtros avanzados
- ✅ Estadísticas en cards
- ✅ Modal de detalles expandido
- ✅ Indicadores de estado con colores

---

## ⚡ ATAJOS Y TIPS

### **Balanceo Rápido:**
1. Ingresa todas las líneas excepto la última
2. Deja la última línea vacía
3. Clic en "Balancear Automáticamente"
4. El sistema completa la última línea

### **Conceptos Frecuentes:**
- Guarda como favoritos los conceptos más usados
- Usa nombres descriptivos
- Mantén activos solo los que uses

### **Validación:**
- El sistema valida automáticamente:
  - Partida doble
  - Cuentas válidas
  - Montos positivos
  - Balance exacto

---

## 🔒 SEGURIDAD

### **Asientos Manuales:**
- Se crean en estado DRAFT
- Pueden editarse antes de contabilizar
- Una vez contabilizados, son inmutables
- Solo se pueden anular

### **Asientos Automáticos:**
- Se crean directamente en POSTED
- No se pueden editar
- Solo se pueden anular
- Mantienen referencia a la transacción

---

## 📞 PREGUNTAS FRECUENTES

### **¿Puedo editar un asiento contabilizado?**
No. Los asientos contabilizados son inmutables. Solo puedes anularlos y crear uno nuevo.

### **¿Qué pasa si no selecciono un concepto?**
La transacción se guarda normalmente, pero NO se genera asiento contable.

### **¿Puedo crear asientos sin transacción?**
Sí. Usa "Nuevo Asiento Manual" para crear asientos independientes.

### **¿Cómo anulo un asiento?**
1. Ve a Asientos
2. Busca el asiento contabilizado
3. Clic en el botón ✗ (Anular)
4. Confirma la acción

### **¿El balance se valida automáticamente?**
Sí. El sistema valida en tiempo real que débitos = créditos.

---

## 🎊 ¡SISTEMA COMPLETO!

Ahora tienes un sistema contable profesional con:

✅ **Asientos Manuales** - Control total  
✅ **Asientos Automáticos** - Eficiencia máxima  
✅ **Plan de Cuentas** - NIIF Colombia  
✅ **Conceptos Configurables** - Flexibilidad  
✅ **Partida Doble** - Validación automática  
✅ **Reportes** - Información en tiempo real  
✅ **Seguridad** - RLS y validaciones  
✅ **UI Moderna** - Experiencia premium  

**¡Felicidades! 🚀**
