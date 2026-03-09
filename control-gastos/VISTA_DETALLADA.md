# Vista Semanal/Diaria Más Detallada - Documentación

## 🎯 Funcionalidades Implementadas

### 1. **Filtro de Rango de Fechas Personalizado**
- Ubicación: Parte superior de la sección "Reportes y Gráficos"
- Permite seleccionar fecha de inicio y fecha de fin
- Botón "Limpiar filtro" para resetear el rango
- Filtra todas las transacciones y gráficos según el rango seleccionado

### 2. **Botón de Vista Detallada**
- Toggle para mostrar/ocultar la vista detallada
- Cambia de color cuando está activo (azul) vs inactivo (gris)
- Iconos de ChevronUp/ChevronDown para indicar el estado

### 3. **Desglose Detallado por Período**
La vista detallada agrupa las transacciones según el período seleccionado:
- **Año**: Agrupa por mes
- **Mes**: Agrupa por semana
- **Semana**: Agrupa por día

### 4. **Tarjetas de Período Expandibles**
Cada período muestra:

#### Encabezado (siempre visible):
- Icono indicador (verde para balance positivo, rojo para negativo)
- Nombre del período (ej: "Semana 1 - feb 2026")
- Número de transacciones
- Total de ingresos (+)
- Total de gastos (-)
- Balance neto del período
- Botón expandir/contraer

#### Contenido Expandido:
1. **Desglose por Categoría**
   - Grid de 2 columnas con todas las categorías
   - Muestra ingresos y gastos por categoría
   - Formato visual con colores (verde para ingresos, rojo para gastos)

2. **Tabla de Transacciones**
   - Todas las transacciones del período ordenadas por fecha
   - Columnas:
     - Fecha
     - Categoría (con badge)
     - Proveedor
     - Descripción
     - Monto (con color según tipo)
   - Hover effect en las filas
   - Scroll horizontal en móviles

## 🎨 Características de Diseño

### Colores y Estilos:
- **Ingresos**: Verde esmeralda (#10b981)
- **Gastos**: Rojo rosa (#f43f5e)
- **Fondo**: Blanco con bordes slate-100
- **Hover**: Slate-50
- **Sombras**: Sutiles para profundidad

### Animaciones:
- Fade-in al mostrar la vista detallada
- Transiciones suaves en hover
- Expansión/contracción fluida de las tarjetas

### Responsive:
- Grid de categorías: 1 columna en móvil, 2 en desktop
- Tabla con scroll horizontal en pantallas pequeñas
- Botones y filtros se adaptan al tamaño de pantalla

## 📊 Casos de Uso

### Ejemplo 1: Análisis Semanal
1. Seleccionar período "Semana"
2. Activar "Vista Detallada"
3. Ver cada día con sus transacciones
4. Expandir un día específico para ver detalles

### Ejemplo 2: Filtro de Rango Personalizado
1. Seleccionar fecha inicio: 2026-02-01
2. Seleccionar fecha fin: 2026-02-15
3. Ver solo transacciones de ese período
4. Activar vista detallada para análisis profundo

### Ejemplo 3: Análisis de Categorías
1. Activar vista detallada
2. Expandir un período
3. Revisar "Desglose por Categoría"
4. Identificar categorías con más gastos/ingresos

## 🔧 Componentes Técnicos

### Estado Nuevo:
```typescript
const [showDetailedView, setShowDetailedView] = useState(false);
const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: ''
});
```

### Datos Calculados:
```typescript
// Transacciones filtradas por rango
const filteredTransactions = useMemo(...)

// Desglose detallado por período
const detailedBreakdown = useMemo(...)
```

### Nuevo Componente:
```typescript
function DetailedPeriodCard({ periodData })
```

## 🚀 Mejoras Futuras Sugeridas

1. **Exportar período específico**: Botón para exportar solo las transacciones de un período
2. **Comparación de períodos**: Comparar semana actual vs semana anterior
3. **Gráficos por período**: Mini gráfico en cada tarjeta de período
4. **Búsqueda en transacciones**: Filtro de texto para buscar transacciones específicas
5. **Ordenamiento personalizado**: Ordenar por monto, fecha, categoría, etc.
6. **Vista de calendario**: Calendario visual con indicadores de actividad
7. **Notas por período**: Agregar notas o comentarios a períodos específicos
8. **Alertas**: Notificaciones cuando un período excede cierto presupuesto

## 📱 Acceso

Para ver las nuevas funcionalidades:
1. Abrir http://localhost:5173/
2. Navegar a "Reportes" en el menú lateral
3. Buscar la sección "Filtrar por rango" 
4. Hacer clic en "Vista Detallada"
5. Explorar los diferentes períodos y expandir para ver detalles
