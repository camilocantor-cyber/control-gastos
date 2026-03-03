# Plan de Pruebas Integrales - BPM Manager 🚀

Este documento detalla las funcionalidades principales del sistema **BPM Manager** agrupadas por módulo, diseñado para servir como lista de verificación (checklist) durante la fase de control de calidad y pruebas de usuario (UAT).

---

## 1. 🔐 Seguridad, Usuarios y Organigrama
Este módulo abarca la autenticación y la estructura organizacional de la empresa.

- [ ] **Login y Autenticación:** Verificación de inicio de sesión seguro usando las credenciales de Supabase.
- [ ] **Roles y Permisos:** Creación y asignación de roles jerárquicos.
- [ ] **Firmas Digitales:** Carga y visualización de una imagen de firma para cada usuario.
- [ ] **Gestión de Organigrama:** Creación de la estructura de la empresa, departamentos y cargos, incluyendo sus relaciones (quién reporta a quién).
- [ ] **Costos por Hora:** Inclusión de "Hourly Rate" en los cargos/posiciones para posteriores cálculos financieros.

## 2. 🛠️ Diseñador de Flujos (Workflow Builder)
El motor de procesos de negocio.

- [ ] **Creación Manual de Procesos:** Arrastrar y soltar nodos (actividades) en el lienzo.
- [ ] **Conexiones y Transiciones:** Unir actividades usando flechas configurables, definiendo la secuencia del trámite.
- [ ] **Generador con IA (Gemini/OpenAI):** Uso del prompt natural para generar automáticamente la estructura, actividades y formularios básicos de un flujo.
- [ ] **Auto-Layout:** Organización automática y limpia de los diagramas complejos tipo árbol.
- [ ] **Configuración de Variables de Formulario:** Adición de campos dinámicos (Texto, Fechas, Selección, Moneda, Archivos) a cada actividad.
- [ ] **Lógica de Asignaciones:** Probar las estrategias:
  -  *"Auto (Carga)"*: Asignar a la persona con menos trámites activos.
  -  *"Secuencial"*: Rotar asignaciones entre el equipo (Round Robin).
  -  *"Quien Inició"* y *"Directo"*.

## 3. ⚙️ Acciones Automatizadas en Transiciones
Funciones que se disparan en segundo plano al completar una actividad.

- [ ] **Notificaciones por Email:** Envío de correos configurables con variables `{{ }}` y prueba de uso del servidor SMTP o puente seguro.
- [ ] **Notificaciones por WhatsApp:** Configuración del proveedor de API (Evolution, Meta, etc.), token, envío de variables en los mensajes y recepción exitosa en el móvil corporativo o cliente.
- [ ] **Integración REST & Webhooks:** Envío y recepción de JSON payloads hacia servicios externos.
- [ ] **Integraciones SOAP:** Construcción del XML Request, mapeo automático de la respuesta XML a variables del trámite.
- [ ] **Módulo ERP/Financiero:** Consumo del puente financiero para asentar costos o ingresos en proyectos remotos.

## 4. 📝 Ejecución y Gestión del Trámite (Kanban & Tablas)
El centro principal de trabajo de los operadores.

- [ ] **Bandeja de Entrada Iniciar Trámite:** Visualización de permisos (Solo un usuario con rol autorizado puede iniciar el flujo específico).
- [ ] **Vista Kanban:** Mover tarjetas temporalmente, verificar que las etapas reflejan la actividad actual real.
- [ ] **Aprobaciones y Rechazos:** Verificación de bifurcaciones (Si se rechaza, el sistema devuelve la tarea a la persona o rol adecuado).
- [ ] **Vista de Historial Log:** Comprobación del registro de auditoría (Quién, Cuándo y Qué paso exacto se culminó o qué automatización falló).

## 5. 📊 Detalles del Proceso e Importación en Masa (XLS)
Manejo de tablas "Hijo" como listas de cotización, materiales asociados al flujo.

- [ ] **Definición de Columnas Detail:** Configurar tipos de campos desde el builder para ser usados en la etapa.
- [ ] **Descargar Plantilla XLS:** Generación del template exacto sin errores.
- [ ] **Importación de Datos (Bulk Upload):** Llenar el archivo XLS con información, subirlo y verificar la pre-carga masiva e instantánea de productos en la base de datos de los detalles.

## 6. 🏗️ Integración BIM 4D (IFC Viewer)
El visor de modelos de ingeniería y arquitectura 3D en la nube.

- [ ] **Carga del Modelo:** Subir y parsear archivos de formato `.ifc` dentro de un trámite o actividad.
- [ ] **Visualización Web:** Correcta navegación espacial asistida mediante ratón (órbita, zoom in/out).
- [ ] **Selección de Elementos y Colores 4D:** Coloreado en tiempo real según las variables y el estatus del flujo de construcción o de la parte física del edificio.
- [ ] **Panel de Propiedades BIM:** Al pulsar un muro o ventana, ver su Pset y propiedades de volumen o área asociadas de manera lateral.

## 7. 📈 Reportes, Predicción y Análisis Cuantitativo
Visualización gerencial del estado de la empresa.

- [ ] **Métricas Globales de Desempeño:** Tiempos muertos, cuellos de botella en cada flujo de trabajo.
- [ ] **Asignación de Costos por Organigrama:** Cálculo interactivo ("Hourly Rate" * "Horas de trámite activas") menos fines de semana, agrupados de nivel general al individual.
- [ ] **Predicción de Carga con IA (Forecast):** Uso del análisis temporal predictivo para modelar visualmente si un rol colapsará o proyectará ahorros en un futuro próximo evaluando su tendencia.
