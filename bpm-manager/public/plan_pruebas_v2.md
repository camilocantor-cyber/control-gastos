# Plan de Pruebas: BPM Manager v2 (Características Avanzadas)

Este documento contiene un conjunto de pruebas paso a paso estructurado para validar los tres nuevos componentes principales del motor: Maestro-Detalle (Carpetas), Búsquedas Interactivas en PostgreSQL, y el Arquitecto IA.

---

## 🏗️ 1. Módulo: Maestro-Detalle (Carpetas / Subformularios)

**Objetivo:** Validar que se puedan crear colecciones de datos (uno a muchos) que persistan y sean visibles a través de múltiples actividades en un mismo proceso.

### Caso de Prueba 1.1: Creación de Detalle en el Builder
1. Entra a editar cualquier Flujo de Trabajo (Workflow Builder).
2. Haz clic en el botón superior **"Gestor de Carpetas (Maestro-Detalle)"**.
3. Haz clic en "Nueva Carpeta/Detalle". Llámala "Ítems de Factura".
4. Agrégale dos campos: "Descripción del Ítem" (tipo Texto) y "Valor" (tipo Moneda).
5. Guarda los cambios. Verifica que la carpeta aparezca en la lista lateral. Cierra el modal.

### Caso de Prueba 1.2: Asociación a Actividades
1. En el lienzo, haz clic en el nodo "Inicio" (o cualquier tarea).
2. En el panel lateral derecho (Propiedades), busca la nueva sección "Detalles Asociados".
3. Selecciona "Ítems de Factura" para conectarla a este nodo.
4. Repite el proceso con el **siguiente** nodo (ej. Aprobación).
5. Haz clic en Guardar y Publica el flujo.

### Caso de Prueba 1.3: Ejecución y Persistencia en Caliente
1. Ve al Dashboard e Inicia un nuevo Trámite del flujo que acabas de publicar.
2. En la pantalla de ejecución, observa que ahora hay **dos pestañas**: "Formulario Principal" y "Ítems de Factura".
3. Ve a la pestaña "Ítems de Factura" y haz clic en "Agregar Registro".
4. Llena los datos y guarda. Agrega al menos 2 registros distintos.
5. Haz clic en el botón azul de la esquina superior derecha para "Completar Actividad / Avanzar".
6. Abre la bandeja de tareas pendientes, y entra a la segunda actividad del proceso.
7. **RESULTADO ESPERADO:** Debes ver la pestaña "Ítems de Factura" y los dos registros que agregaste en el paso anterior deben seguir ahí, listos para ser editados o simplemente visualizados.

---

## 🔍 2. Módulo: Búsquedas Interactivas a Catálogo BD (Lookup)

**Objetivo:** Validar que los campos tipo "Lookup" puedan interrogar dinámicamente tablas en PostgreSQL usando ILIKE, sin código intermedio, y autocompletar otros campos del formulario.

### Caso de Prueba 2.1: Configuración
1. En el Workflow Builder, selecciona cualquier Tarea y agrega dos campos nuevos:
   - Campo A: `lupa_usuario` (Tipo: Búsqueda Interactiva)
   - Campo B: `correo_copia` (Tipo: Texto)
2. Abre la configuración de campo del `lupa_usuario`.
3. Mueve el toggle de "API Externa" a **"Catálogo B.D."**.
4. Llena los siguientes datos:
   - **Tabla a consultar:** Elige `profiles` (se cargan automáticamente de tu DB).
   - **Columna de búsqueda:** `full_name`
   - **Valor a guardar (Value):** `id`
   - **Columnas a mostrar (Display):** Escribe `full_name` y `email`. (Presiona Enter para agregar cada una como un chip).
   - **Mapeo Autofill:** En nombre de origen escribe `email`, en nombre de destino escribe `correo_copia` (el nombre técnico del Campo B).
5. Guarda el flujo.

### Caso de Prueba 2.2: Ejecución e Inteligencia del Componente
1. Inicia un trámite de este flujo.
2. Haz clic en el campo `lupa_usuario`. Escribe 2 letras del nombre de algún usuario que exista en tu sistema (ej. "Ca" para Camilo).
3. Espera 500ms. 
4. **RESULTADO ESPERADO 1:** Debe aparecer un modal elegante tipo combobox flotante mostrando el nombre y el correo de las coincidencias.
5. Haz clic o presiona Enter sobre una de las opciones.
6. **RESULTADO ESPERADO 2:** El campo de búsqueda asume el ID del usuario internamente, y mágicamente, el campo "correo_copia" se debe rellenar automáticamente con el email del usuario seleccionado.

---

## 🤖 3. Módulo: AI Workflow Architect

**Objetivo:** Validar que el asistente de IA sea capaz de diseñar JSONs válidos que el lienzo pueda interpretar e instanciar en tiempo real.

### Caso de Prueba 3.1: Autenticación y Generación Limpia (Replace)
1. En el Workflow Builder vacía el lienzo eliminando todo, o entra a un flujo en blanco.
2. Haz clic en el botón "IA" (ícono de Varita Mágica) en el cabezote.
3. Ingresa tu API Key de OpenAI válida (Inicia por `sk-...`).
4. En el prompt escribe: *"Necesito un proceso de reembolso de viáticos. Primero el empleado solicita indicando el monto y la fecha. Luego el supervisor lo revisa. Si es menor a 100 dolares lo aprueba de inmediato, si es mayor pasa a gerencia. Al final todo termina en finanzas para pago."*
5. Selecciona la opción **"Reemplazar Todo"** y haz clic en "Generar Magia".
6. **RESULTADO ESPERADO:** Tras unos segundos de "pensar", el modal se cierra y el lienzo se auto-ordena, mostrando nodos de Inicio, Tareas, y Decisiones condicionales con los nombres correctos. Si abres las propiedades de las actividades generadas, deberían tener campos sugeridos (ej: monto, fecha).

### Caso de Prueba 3.2: Generación Extendida (Append)
1. Con un flujo ya existente en el lienzo, abre de nuevo la Varita Mágica.
2. Escribe en el prompt: *"Añade un par de nodos extra para hacer una encuesta de satisfacción del cliente después de entregar el producto."*
3. Selecciona la opción **"Añadir al Final"**.
4. **RESULTADO ESPERADO:** Los nuevos nodos (Inicio, Envío de Encuesta, Recepción, Fin) deben ser agregados al lienzo sin borrar tu modelo de viáticos original, permitiéndote conectarlos manualmente.

---

### Criterios de Éxito / Firma ✍️

- [ ] Maestro-Detalle no pisa los datos entre múltiples trámites (aislamiento de data).
- [ ] La búsqueda en BD ignora las mayúsculas (ILIKE es case-insensitive).
- [ ] Las fechas de los campos se conservan correctamente en las grillas.
- [ ] El AI Builder no rompe el renderizado de flechas si intenta generar una conexión huérfana.

**Tester:** Camilo Cantor
**Fecha de Ejecución:** _______________
