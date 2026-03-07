import React, { useState, useMemo } from 'react';
import {
    Search, BookOpen, GitBranch, FolderOpen, FileText, Zap, Mail,
    ChevronRight, X, Users, BarChart3,
    Globe, Clock, Star, CheckCircle2, AlertCircle,
    HelpCircle, Code2, Layers, Box, History, Copy, Check
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Article Content ─────────────────────────────────────────────────────────

const ARTICLES: Article[] = [
    // ══════════ PLANTILLAS ══════════
    {
        id: 'templates-intro',
        category: 'Plantillas de Documentos',
        categoryIcon: FileText,
        categoryColor: 'blue',
        title: 'Introducción a las Plantillas Word',
        summary: 'Cómo subir y gestionar plantillas .docx para generación automática de documentos.',
        tags: ['plantilla', 'word', 'docx', 'documento', 'template'],
        content: [
            {
                type: 'intro',
                text: 'Las plantillas de documentos permiten generar archivos Word (.docx) automáticamente durante la ejecución de un proceso, usando datos capturados en los formularios.'
            },
            {
                type: 'section', title: 'Subir una plantilla',
                text: 'Navega a Flujos de Trabajo → selecciona el flujo → abre el editor → en la barra lateral encuentra "Plantillas". Puedes subir cualquier archivo .docx.'
            },
            {
                type: 'section', title: 'Variables de proceso',
                text: 'Dentro del documento Word, usa la sintaxis {{nombre_campo}} para insertar valores. Por ejemplo: {{nombre_cliente}}, {{fecha_inicio}}, {{numero_tramite}}.'
            },
            {
                type: 'tip',
                text: 'Los nombres de variables deben coincidir exactamente con los nombres de los campos del formulario (el "Nombre (Variable)", no la etiqueta visual).'
            },
            {
                type: 'section', title: 'Variables del sistema siempre disponibles',
                text: '{{nombre_tramite}} — Nombre del trámite\n{{fecha_inicio}} — Fecha de inicio\n{{id_tramite}} — ID único del trámite\n{{nro_tramite}} — Número consecutivo\n{{iniciador}} — Usuario que inició el proceso'
            },
        ]
    },
    {
        id: 'templates-carpetas',
        category: 'Plantillas de Documentos',
        categoryIcon: FileText,
        categoryColor: 'blue',
        title: 'Incluir Carpetas/Detalles como tabla en el documento',
        summary: 'Cómo usar la sintaxis de loop para insertar filas de una carpeta como tabla dinámica.',
        tags: ['carpeta', 'detalle', 'tabla', 'loop', 'iteración', 'filas', 'plantilla'],
        content: [
            {
                type: 'intro',
                text: 'Cuando un proceso tiene Carpetas (Maestro-Detalle) con múltiples filas de datos, puedes insertarlas automáticamente como una tabla en tu documento Word usando la sintaxis de loop de docxtemplater.'
            },
            {
                type: 'section', title: 'Nombre de la variable de la carpeta',
                text: 'El nombre de la variable se deriva automáticamente del nombre de la carpeta, convirtiéndolo a snake_case:\n\n"Contratos Adicionales" → contratos_adicionales\n"Ítems de Pedido" → items_de_pedido\n"Productos" → productos'
            },
            {
                type: 'code',
                title: 'Sintaxis en la tabla Word',
                text: 'Encabezado | Cantidad | Precio\n{{#items_de_pedido}}{{_fila}} | {{descripcion}} | {{cantidad}} | {{precio}}{{/items_de_pedido}}\nTOTAL: {{items_de_pedido_total}}'
            },
            {
                type: 'tip',
                text: 'Los marcadores {{#nombre_carpeta}} (apertura) y {{/nombre_carpeta}} (cierre) deben estar en la MISMA fila de la tabla. La fila completa se repetirá por cada registro ingresado.'
            },
            {
                type: 'section', title: 'Variables dentro del loop',
                text: '{{_fila}} — Número de fila (1, 2, 3…)\n{{nombre_campo}} — Cualquier campo definido en la carpeta\n{{nombre_carpeta_total}} — Total de registros (FUERA del loop)'
            },
            {
                type: 'section', title: 'Descargar plantilla pre-diseñada',
                text: 'En el Gestor de Carpetas, pestaña General de cada carpeta, encuentra el botón "Descargar Plantilla Word". Descarga un .docx listo con la tabla, el loop y los totales ya configurados.'
            },
            {
                type: 'warning',
                text: 'No elimines ni modifiques los marcadores {{#...}} y {{/...}}, ya que son procesados por el motor de plantillas. Solo puedes cambiar el formato visual (colores, fuentes) de las celdas.'
            }
        ]
    },
    {
        id: 'templates-predesign',
        category: 'Plantillas de Documentos',
        categoryIcon: FileText,
        categoryColor: 'blue',
        title: 'Generador automático de plantillas para Carpetas',
        summary: 'Descarga una plantilla Word pre-diseñada directamente desde el Gestor de Carpetas.',
        tags: ['plantilla', 'pre-diseño', 'descargar', 'carpeta', 'word', 'automático'],
        content: [
            {
                type: 'intro',
                text: 'BPM Manager puede generar automáticamente una plantilla Word (.docx) para cada Carpeta que hayas definido. La plantilla incluye la tabla de referencia de variables y la tabla principal con el loop ya configurado.'
            },
            {
                type: 'section', title: 'Cómo obtener la plantilla',
                text: '1. Abre el WorkflowBuilder de tu flujo\n2. Haz clic en "Gestor de Carpetas"\n3. Selecciona una carpeta en la lista lateral\n4. Ve a la pestaña "General"\n5. Haz clic en "Descargar Plantilla Word (.docx)"'
            },
            {
                type: 'section', title: 'Contenido de la plantilla generada',
                text: 'La plantilla descargada incluye:\n\n• Título y descripción de la carpeta\n• Tabla de referencia con todos los {{tags}} disponibles y su descripción\n• Tabla principal con encabezados, fila de loop y fila de totales\n• Pie de página con la fecha de generación'
            },
            {
                type: 'tip',
                text: 'Después de descargar la plantilla, puedes personalizarla en Word: cambiar colores, agregar el logo de la empresa, añadir texto adicional, y luego subirla al sistema.'
            },
            {
                type: 'section', title: 'Flujo completo de uso',
                text: '1. Definir la carpeta y sus campos\n2. Descargar plantilla pre-diseñada\n3. Personalizar en Word (opcional)\n4. Subir al Gestor de Plantillas del flujo\n5. Configurar una acción "Generar Documento" apuntando a esa plantilla\n6. ¡Listo! Al ejecutar el proceso, el documento se genera automáticamente'
            },
        ]
    },

    // ══════════ CARPETAS / DETALLES ══════════
    {
        id: 'folders-intro',
        category: 'Carpetas (Maestro-Detalle)',
        categoryIcon: FolderOpen,
        categoryColor: 'indigo',
        title: 'Qué son las Carpetas (Maestro-Detalle)',
        summary: 'Sub-estructuras repetibles que permiten capturar múltiples filas de datos en un formulario.',
        tags: ['carpeta', 'detalle', 'maestro', 'maestro-detalle', 'filas', 'tabla'],
        content: [
            {
                type: 'intro',
                text: 'Las Carpetas son sub-estructuras que puedes asociar a una actividad para capturar datos tabulares (múltiples filas). Por ejemplo: ítems de una orden, contratos adicionales, productos de un pedido.'
            },
            {
                type: 'section', title: 'Cuándo usar una Carpeta',
                text: 'Usa una carpeta cuando necesites capturar datos que se repiten un número variable de veces. Ejemplos:\n\n• Lista de ítems en una orden de compra\n• Contratos adicionales de un proyecto\n• Personas beneficiadas de un trámite\n• Observaciones técnicas durante una inspección'
            },
            {
                type: 'section', title: 'Crear una Carpeta',
                text: '1. En el WorkflowBuilder, haz clic en "Gestor de Carpetas"\n2. Crea una nueva carpeta\n3. Define sus campos en la pestaña "Estructura"\n4. Asocia la carpeta a una Actividad en sus Propiedades → "Carpetas Asociadas"'
            },
            {
                type: 'section', title: 'Campos disponibles en una Carpeta',
                text: 'Texto, Número, Fecha, Moneda, Selección Múltiple, Verdadero/Falso, Proveedor y Búsqueda Interactiva (Lookup).'
            },
            {
                type: 'tip',
                text: 'Puedes configurar la cardinalidad: obligatoria (al menos 1 fila), mínimo X filas, o libre (0 o más filas).'
            }
        ]
    },
    {
        id: 'folders-actions',
        category: 'Carpetas (Maestro-Detalle)',
        categoryIcon: FolderOpen,
        categoryColor: 'indigo',
        title: 'Acciones automáticas en Carpetas',
        summary: 'Configura webhooks y correos que se disparan al guardar o enviar filas de una carpeta.',
        tags: ['carpeta', 'acciones', 'webhook', 'correo', 'automático', 'trigger'],
        content: [
            {
                type: 'intro',
                text: 'Las carpetas pueden tener acciones automáticas que se ejecutan al guardar una fila individual o al enviar toda la carpeta como parte de la actividad.'
            },
            {
                type: 'section', title: 'Momentos de ejecución',
                text: '"Al Guardar/Actualizar Fila Individual" — Se ejecuta cada vez que el usuario guarda una única fila.\n\n"Al Enviar Todo el Maestro" — Se ejecuta cuando el usuario avanza la actividad completa.'
            },
            {
                type: 'section', title: 'Tipos de acciones disponibles',
                text: '• Webhook: Llama a una API externa con los datos de la fila\n• Correo: Envía un email con los datos de la fila'
            },
            {
                type: 'tip',
                text: 'Para acciones más complejas (múltiples pasos, generación de documentos), configúralas en las Acciones de la Actividad principal, no en la carpeta.'
            }
        ]
    },

    // ══════════ FLUJOS DE TRABAJO ══════════
    {
        id: 'workflows-intro',
        category: 'Flujos de Trabajo',
        categoryIcon: GitBranch,
        categoryColor: 'emerald',
        title: 'Crear y configurar un Flujo de Trabajo',
        summary: 'Conceptos básicos: actividades, transiciones, formularios y configuración general.',
        tags: ['flujo', 'workflow', 'proceso', 'actividad', 'transición', 'formulario'],
        content: [
            {
                type: 'intro',
                text: 'Un Flujo de Trabajo define la secuencia de pasos (Actividades) que debe seguir un trámite, las condiciones para avanzar (Transiciones) y los datos a capturar (Formularios).'
            },
            {
                type: 'section', title: 'Tipos de Actividades',
                text: '• Inicio (Start): Primer paso del proceso, siempre visible para el creador\n• Tarea (Task): Paso de trabajo donde se completan formularios\n• Decisión (Decision): Bifurcación basada en condiciones\n• Fin (End): Marca el cierre del proceso'
            },
            {
                type: 'section', title: 'Transiciones',
                text: 'Conectan actividades. Pueden tener condiciones (ej: campo_X == "Aprobado") que determinan qué camino tomar en una bifurcación.'
            },
            {
                type: 'section', title: 'Nombre dinámico del trámite',
                text: 'En la configuración del flujo puedes definir una plantilla para el nombre del trámite, usando variables de los campos del formulario de inicio. Ejemplo: "Solicitud {{nombre_cliente}} - {{fecha}}"'
            },
            {
                type: 'tip',
                text: 'Activa el modo "Público" en una actividad para que usuarios externos (sin cuenta) puedan completar ese formulario con un enlace especial.'
            }
        ]
    },
    {
        id: 'workflows-actions',
        category: 'Flujos de Trabajo',
        categoryIcon: GitBranch,
        categoryColor: 'emerald',
        title: 'Acciones automáticas en Actividades',
        summary: 'Webhooks, correos, WhatsApp, finanzas y generación de documentos al completar un paso.',
        tags: ['acciones', 'webhook', 'correo', 'whatsapp', 'documento', 'automático', 'api'],
        content: [
            {
                type: 'intro',
                text: 'Cada actividad puede tener una o más acciones automáticas que se ejecutan al completarla y avanzar al siguiente paso.'
            },
            {
                type: 'section', title: 'Tipos de acciones',
                text: '• Webhook/REST: Envía datos a una API externa\n• SOAP: Integración con servicios SOAP\n• Correo electrónico: Envío vía SMTP configurado\n• WhatsApp: Compatible con Evolution API, UltraMsg o Meta Cloud\n• Finanzas ERP: Integración con módulo de contabilidad\n• Generar Documento: Crea un PDF genérico o un Word desde plantilla'
            },
            {
                type: 'section', title: 'Variables en configuración de acciones',
                text: 'Usa {{nombre_campo}} en cualquier campo de configuración (URL, cuerpo, asunto de correo, mensaje). El sistema sustituirá los valores reales al ejecutar la acción.'
            },
            {
                type: 'section', title: 'Generación de documento con carpeta',
                text: 'Al configurar la acción "Generar Documento" con una plantilla Word, el sistema automáticamente inyecta los datos de todas las Carpetas del proceso como arrays. Usa la sintaxis de loop en tu plantilla para incluirlos como tabla.'
            },
            {
                type: 'tip',
                text: 'Las acciones se ejecutan secuencialmente (una tras otra). Si una falla, se registra en el historial del proceso pero el trámite continúa avanzando.'
            }
        ]
    },

    // ══════════ FORMULARIOS ══════════
    {
        id: 'forms-fields',
        category: 'Formularios',
        categoryIcon: Layers,
        categoryColor: 'violet',
        title: 'Tipos de campos disponibles',
        summary: 'Referencia completa de todos los tipos de campos que puedes agregar a un formulario.',
        tags: ['campo', 'formulario', 'tipo', 'texto', 'número', 'fecha', 'lookup', 'consecutivo'],
        content: [
            {
                type: 'intro',
                text: 'Los formularios de cada actividad pueden contener múltiples tipos de campos para capturar datos variados.'
            },
            {
                type: 'section', title: 'Tipos básicos',
                text: '• Texto: Entrada libre de texto corto\n• Área de Texto: Texto largo / notas\n• Número: Valores numéricos con validación min/max\n• Moneda: Montos con formato COP/USD\n• Fecha: Selector de fecha con valor por defecto hoy\n• Teléfono: Formato de teléfono\n• Email: Validación de formato de correo\n• Verdadero/Falso: Checkbox'
            },
            {
                type: 'section', title: 'Tipos avanzados',
                text: '• Selección Múltiple (Select): Lista desplegable con opciones configurables\n• Proveedor: Búsqueda en el directorio de proveedores de la empresa\n• Lookup (Búsqueda Interactiva): Conecta a una API o tabla de la BD y permite buscar/seleccionar\n• Consecutivo: Genera un código automático con máscara configurable (CON-YYYY-MM-####)\n• Ubicación Geográfica: Permite seleccionar un punto en el mapa\n• Grid (Tabla Interna): Mini-tabla de datos dentro del campo'
            },
            {
                type: 'section', title: 'Propiedades comunes',
                text: '• Obligatorio: Si es requerido para avanzar\n• Valor por defecto: Valor inicial del campo\n• Solo lectura: No se puede editar, solo visualizar\n• Condición de visibilidad: Mostrar/ocultar basado en otro campo (ej: otro_campo == "Sí")\n• Auto-poblar desde actividad anterior: Copia el valor de un campo de una actividad previa'
            },
            {
                type: 'tip',
                text: 'Usa el campo Consecutivo para generar números de radicado, órdenes de compra, o cualquier código secuencial. La máscara soporta YYYY (año), MM (mes), DD (día) y #### (número secuencial).'
            }
        ]
    },

    // ══════════ ASIGNACIÓN ══════════
    {
        id: 'assignment-rules',
        category: 'Asignación de Tareas',
        categoryIcon: Users,
        categoryColor: 'amber',
        title: 'Reglas de asignación de actividades',
        summary: 'Cómo configurar quién recibe cada paso del proceso: por cargo, departamento o estrategia.',
        tags: ['asignación', 'usuario', 'cargo', 'departamento', 'workload', 'balanceo'],
        content: [
            {
                type: 'intro',
                text: 'Cada actividad puede configurarse para asignarse automáticamente a un usuario específico, a un cargo, a un departamento, o al creador del proceso.'
            },
            {
                type: 'section', title: 'Tipos de asignación',
                text: '• Manual: El administrador asigna manualmente caso a caso\n• Creador: Siempre se asigna al usuario que inició el proceso\n• Usuario específico: Siempre va a la misma persona\n• Por Cargo: Va a usuarios que tienen ese cargo\n• Por Departamento: Va a usuarios del departamento\n• Por Cargo + Departamento: Intersección de ambos'
            },
            {
                type: 'section', title: 'Estrategias de balanceo',
                text: 'Cuando hay múltiples usuarios elegibles:\n\n• Carga Laboral (Workload): Al usuario con menos procesos activos\n• Eficiencia: Al usuario con más tareas completadas históricamente\n• Costo Óptimo: Al usuario con menor tarifa horaria\n• Aleatorio: Distribución al azar\n• Cola Compartida (Claim): Queda sin asignar; cualquiera del grupo puede reclamarla\n• Turnos: Basado en horario\n• Ponderado: Mayor probabilidad a los primeros en la lista'
            },
            {
                type: 'warning',
                text: 'Las asignaciones por cargo y departamento solo consideran usuarios de la MISMA empresa (organización activa), nunca de otras sucursales.'
            }
        ]
    },

    // ══════════ REPORTES ══════════
    {
        id: 'reports-overview',
        category: 'Reportes y Analytics',
        categoryIcon: BarChart3,
        categoryColor: 'rose',
        title: 'Módulo de Reportes',
        summary: 'Dashboard de métricas, reportes por departamento, mapa de calor y análisis predictivo.',
        tags: ['reporte', 'métricas', 'análisis', 'heatmap', 'departamento', 'costo'],
        content: [
            {
                type: 'intro',
                text: 'El módulo de Reportes ofrece visibilidad completa sobre el desempeño de los procesos, tiempos de ejecución, costos operativos y distribución de carga de trabajo.'
            },
            {
                type: 'section', title: 'Tipos de reportes disponibles',
                text: '• Dashboard General: KPIs principales, trámites activos, completados, en mora\n• Por Departamento: Métricas filtradas por área organizacional\n• Mapa de Calor de Flujos: Visualización de cuellos de botella\n• Mapa de Procesos con Costo: Costo acumulado por actividad\n• Análisis Predictivo: Estimaciones de duración basadas en histórico\n• Reporte BIM: Para proyectos con modelos 3D (IFC)'
            },
            {
                type: 'section', title: 'Costo operativo',
                text: 'El sistema calcula automáticamente el costo de cada actividad basándose en las horas invertidas × la tarifa horaria del cargo del usuario asignado. Los costos se acumulan por proceso y están disponibles en los reportes.'
            },
            {
                type: 'tip',
                text: 'Para que el cálculo de costos sea preciso, asegúrate de configurar la tarifa horaria en los cargos del Organigrama.'
            }
        ]
    },

    // ══════════ INTEGRACIONES ══════════
    {
        id: 'integrations-webhook',
        category: 'Integraciones',
        categoryIcon: Zap,
        categoryColor: 'orange',
        title: 'Configurar un Webhook (REST/API)',
        summary: 'Cómo conectar una actividad con una API externa usando acciones de tipo Webhook.',
        tags: ['webhook', 'api', 'rest', 'integración', 'http', 'json', 'bearer'],
        content: [
            {
                type: 'intro',
                text: 'Las acciones de tipo Webhook permiten llamar a cualquier API REST/HTTP cuando se completa una actividad, enviando datos del proceso y recibiendo respuestas.'
            },
            {
                type: 'section', title: 'Configuración básica',
                text: '• URL: Endpoint de la API (puede usar variables {{campo}})\n• Método: GET, POST, PUT, PATCH, DELETE\n• Cuerpo (Body): JSON o XML con variables del proceso\n• Autenticación: Bearer Token, Basic Auth, o sin autenticación\n• Variable de salida: Nombre para guardar la respuesta'
            },
            {
                type: 'code',
                title: 'Ejemplo de cuerpo JSON',
                text: '{\n  "tramite": "{{nombre_tramite}}",\n  "cliente": "{{nombre_cliente}}",\n  "total": {{monto_total}},\n  "fecha": "{{fecha_inicio}}"\n}'
            },
            {
                type: 'section', title: 'Encadenamiento de pasos',
                text: 'Puedes agregar múltiples pasos en una sola acción. La salida (output_variable) de un paso puede usarse en el cuerpo del siguiente paso con {{nombre_variable}}.'
            },
            {
                type: 'tip',
                text: 'El Monitor de API registra el historial de todas las llamadas realizadas, con sus respuestas y errores. Úsalo para depurar integraciones.'
            }
        ]
    },
    {
        id: 'integrations-email',
        category: 'Integraciones',
        categoryIcon: Mail,
        categoryColor: 'orange',
        title: 'Envío de Correos Automáticos',
        summary: 'Configura envío de emails vía SMTP al completar una actividad.',
        tags: ['correo', 'email', 'smtp', 'notificación', 'automático'],
        content: [
            {
                type: 'intro',
                text: 'La acción de tipo Correo permite enviar emails automáticamente al completar una actividad, usando plantillas con variables del proceso.'
            },
            {
                type: 'section', title: 'Configuración SMTP',
                text: '• Servidor SMTP: ej. smtp.gmail.com\n• Puerto: 587 (TLS) o 465 (SSL)\n• Usuario: cuenta de correo remitente\n• Contraseña: app password o contraseña SMTP\n• TLS/SSL: activa según el puerto'
            },
            {
                type: 'section', title: 'Campos del mensaje',
                text: '• De (From): Remitente, ej. "BPM Manager <noreply@empresa.com>"\n• Para (To): Destinatario, puede usar {{email_cliente}}\n• CC: Con copia, separados por coma\n• Asunto: Puede incluir variables, ej. "Aprobación - {{nombre_tramite}}"\n• Cuerpo: Texto HTML o plano con variables'
            },
            {
                type: 'tip',
                text: 'Para Gmail, debes generar una "Contraseña de aplicación" en la configuración de seguridad de Google, ya que las contraseñas normales no funcionan con SMTP externo.'
            }
        ]
    },

    // ══════════ PORTAL ══════════
    {
        id: 'portal-public',
        category: 'Portal y Acceso Externo',
        categoryIcon: Globe,
        categoryColor: 'teal',
        title: 'Formularios Públicos y Portal de Autoservicio',
        summary: 'Permite que usuarios externos inicien procesos o completen pasos sin cuenta.',
        tags: ['público', 'portal', 'autoservicio', 'externo', 'enlace', 'url'],
        content: [
            {
                type: 'intro',
                text: 'BPM Manager ofrece dos mecanismos para que personas sin cuenta en el sistema puedan interactuar con procesos: el Portal de Autoservicio y los Formularios Públicos.'
            },
            {
                type: 'section', title: 'Portal de Autoservicio',
                text: 'Accesible en la URL raíz para usuarios con rol "Viewer". Solo pueden ver y ejecutar trámites que les correspondan, sin acceso a la configuración.'
            },
            {
                type: 'section', title: 'Formulario Público de Inicio',
                text: 'Puedes marcar un flujo como "Público" para que cualquier persona pueda iniciar un proceso sin autenticarse. La URL para compartir tiene el formato: ?public_process=ID_DEL_FLUJO'
            },
            {
                type: 'section', title: 'Actividad Pública',
                text: 'Cualquier actividad intermedia también puede marcarse como pública. Cuando un proceso llegue a esa actividad, se generará un enlace único: ?public_activity=ID&process_id=ID. Usa la acción de correo para enviar este enlace al interesado.'
            },
            {
                type: 'tip',
                text: 'Combina la acción de Correo con la variable {{enlace_publico}} para enviar el link de la actividad pública al destinatario externo automáticamente.'
            }
        ]
    },

    // ══════════ SLAs ══════════
    {
        id: 'sla-alerts',
        category: 'SLA y Alertas',
        categoryIcon: Clock,
        categoryColor: 'red',
        title: 'Configurar SLA y Alertas de Tiempo',
        summary: 'Define tiempos máximos por actividad y activa alertas automáticas por mora.',
        tags: ['sla', 'alerta', 'tiempo', 'mora', 'vencimiento', 'supervisor'],
        content: [
            {
                type: 'intro',
                text: 'Cada actividad puede tener un tiempo límite de resolución (SLA). El sistema calcula el tiempo invertido descontando fines de semana y puede alertar cuando una tarea está próxima a vencer o ya venció.'
            },
            {
                type: 'section', title: 'Configurar el SLA de una actividad',
                text: 'En las Propiedades de la actividad:\n\n• Horas para la SLA: Tiempo máximo para completar la actividad (horas laborales)\n• Horas de alerta previa: Cuántas horas antes de vencer se muestra advertencia\n• Alertas de supervisor: Si se activa, notifica al supervisor cuando la tarea vence'
            },
            {
                type: 'section', title: 'Cálculo del tiempo',
                text: 'El sistema calcula las horas invertidas excluyendo sábados y domingos. Una actividad iniciada el viernes a las 5pm y revisada el lunes a las 9am habrá consumido solo 4 horas laborales.'
            },
            {
                type: 'tip',
                text: 'El Dashboard principal muestra un contador de trámites "En Mora" y próximos a vencer para que el administrador tenga visibilidad inmediata.'
            }
        ]
    },
    {
        id: 'bim-viewer',
        category: 'BIM e Ingeniería',
        categoryIcon: Box,
        categoryColor: 'indigo',
        title: 'Uso del Visor BIM (IFC)',
        summary: 'Cómo visualizar modelos 3D y vincular estados de obra con los procesos de BPM.',
        tags: ['bim', 'ifc', '3d', 'ingeniería', 'obra', 'visualización'],
        content: [
            {
                type: 'intro',
                text: 'El sistema integra un visor de modelos BIM que permite cargar archivos en formato IFC y visualizar el estado de los elementos constructivos vinculados a los trámites.'
            },
            {
                type: 'section', title: 'Cargar un modelo IFC',
                text: 'Simplemente adjunta un archivo con extensión .ifc en la sección de "Adjuntos" de cualquier trámite. El sistema detectará automáticamente el archivo y habilitará la pestaña "BIM" en la parte superior.'
            },
            {
                type: 'section', title: 'Interacción con el modelo',
                text: '• Selección: Haz clic en cualquier elemento para ver sus propiedades IFC\n• Estados: Los elementos pueden mostrar colores según su estado (Completado, Pendiente, En proceso)\n• Sincronización: Al completar ciertas actividades, el sistema puede actualizar el estado de los elementos vinculados en el modelo.'
            },
            {
                type: 'tip',
                text: 'Para una mejor experiencia, asegúrate de que los archivos IFC no excedan los 50MB y utilicen el esquema IFC2x3 o IFC4.'
            }
        ]
    },
    {
        id: 'process-history',
        category: 'Auditoría y Control',
        categoryIcon: History,
        categoryColor: 'blue',
        title: 'Historial y Auditoría de Procesos',
        summary: 'Rastrea cada movimiento, comentario y cambio de estado en un trámite.',
        tags: ['historial', 'auditoría', 'trazabilidad', 'logs', 'comentarios'],
        content: [
            {
                type: 'intro',
                text: 'Cada trámite mantiene un registro inmutable de todas las acciones realizadas, quién las ejecutó y cuánto tiempo tomó cada paso.'
            },
            {
                type: 'section', title: 'Acceder al Historial',
                text: 'Dentro de la ejecución de un trámite, haz clic en el icono de reloj (History) en la cabecera. Se abrirá una línea de tiempo con todos los eventos.'
            },
            {
                type: 'section', title: 'Qué se registra',
                text: '• Cambios de actividad: Cuándo pasó de un paso a otro\n• Usuarios: Quién realizó la acción\n• Comentarios: Notas dejadas por los usuarios al avanzar\n• Tiempos: Duración exacta en cada etapa'
            },
            {
                type: 'section', title: 'Detalle Técnico',
                text: 'Al hacer clic en un evento del historial, puedes ver los datos exactos que se capturaron en ese paso del formulario, sirviendo como una "foto" del estado del proceso en ese momento.'
            }
        ]
    }
];

// ─── Types ────────────────────────────────────────────────────────────────────

type ContentBlock = {
    type: 'intro' | 'section' | 'tip' | 'warning' | 'code';
    title?: string;
    text: string;
};

type Article = {
    id: string;
    category: string;
    categoryIcon: React.ElementType;
    categoryColor: string;
    title: string;
    summary: string;
    tags: string[];
    content: ContentBlock[];
};

// ─── Category config ──────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
    blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800', dot: 'bg-blue-500' },
    indigo: { bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-800', dot: 'bg-indigo-500' },
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800', dot: 'bg-emerald-500' },
    violet: { bg: 'bg-violet-50 dark:bg-violet-900/20', text: 'text-violet-700 dark:text-violet-300', border: 'border-violet-200 dark:border-violet-800', dot: 'bg-violet-500' },
    amber: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800', dot: 'bg-amber-500' },
    rose: { bg: 'bg-rose-50 dark:bg-rose-900/20', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800', dot: 'bg-rose-500' },
    orange: { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-800', dot: 'bg-orange-500' },
    teal: { bg: 'bg-teal-50 dark:bg-teal-900/20', text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-200 dark:border-teal-800', dot: 'bg-teal-500' },
    red: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800', dot: 'bg-red-500' },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function ContentBlock({ block }: { block: ContentBlock }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success('Copiado al portapapeles');
        setTimeout(() => setCopied(false), 2000);
    };

    if (block.type === 'intro') {
        return (
            <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed font-medium border-l-4 border-blue-300 dark:border-blue-700 pl-4 py-1">
                {block.text}
            </p>
        );
    }
    if (block.type === 'tip') {
        return (
            <div className="flex gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-emerald-800 dark:text-emerald-200 leading-relaxed">{block.text}</p>
            </div>
        );
    }
    if (block.type === 'warning') {
        return (
            <div className="flex gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">{block.text}</p>
            </div>
        );
    }
    if (block.type === 'code') {
        return (
            <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 group/code relative">
                {block.title && (
                    <div className="flex items-center justify-between px-4 py-2 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-2">
                            <Code2 className="w-4 h-4 text-slate-400" />
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{block.title}</span>
                        </div>
                    </div>
                )}
                <button
                    onClick={() => handleCopy(block.text)}
                    className="absolute top-10 right-3 p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg backdrop-blur transition-all opacity-0 group-hover/code:opacity-100 z-10"
                    title="Copiar código"
                >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
                <pre className="p-4 bg-slate-950 text-emerald-400 text-sm overflow-x-auto leading-relaxed font-mono whitespace-pre-wrap pt-12">
                    {block.text}
                </pre>
            </div>
        );
    }
    // 'section'
    return (
        <div className="space-y-2">
            {block.title && (
                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0" />
                    {block.title}
                </h4>
            )}
            <div className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line pl-3.5">
                {block.text}
            </div>
        </div>
    );
}

function ArticleCard({ article, onClick }: { article: Article; onClick: () => void }) {
    const colors = CATEGORY_COLORS[article.categoryColor] || CATEGORY_COLORS.blue;
    const Icon = article.categoryIcon;
    return (
        <button
            onClick={onClick}
            className="w-full text-left p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl hover:border-blue-200 dark:hover:border-blue-700 hover:shadow-md dark:hover:shadow-blue-900/10 transition-all group"
        >
            <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colors.bg} ${colors.border} border`}>
                    <Icon className={`w-5 h-5 ${colors.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${colors.text}`}>{article.category}</p>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{article.title}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{article.summary}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-blue-500 transition-colors flex-shrink-0 mt-1" />
            </div>
        </button>
    );
}

function ArticleViewer({ article, onBack }: { article: Article; onBack: () => void }) {
    const colors = CATEGORY_COLORS[article.categoryColor] || CATEGORY_COLORS.blue;
    const Icon = article.categoryIcon;
    return (
        <div className="animate-in slide-in-from-right-4 fade-in duration-300">
            {/* Back */}
            <button
                onClick={onBack}
                className="flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 font-bold mb-6 transition-colors group"
            >
                <ChevronRight className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
                Volver al listado
            </button>

            {/* Header */}
            <div className={`p-6 rounded-3xl border ${colors.bg} ${colors.border} mb-8`}>
                <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-white/70 dark:bg-white/10 border ${colors.border}`}>
                        <Icon className={`w-5 h-5 ${colors.text}`} />
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${colors.text}`}>{article.category}</span>
                </div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white leading-tight mb-2">{article.title}</h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">{article.summary}</p>
            </div>

            {/* Content blocks */}
            <div className="space-y-6">
                {article.content.map((block, i) => (
                    <ContentBlock key={i} block={block} />
                ))}
            </div>

            {/* Tags */}
            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs text-slate-400 dark:text-slate-600 font-bold uppercase tracking-wider mb-2">Palabras clave</p>
                <div className="flex flex-wrap gap-2">
                    {article.tags.map(t => (
                        <span key={t} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs rounded-lg font-mono">#{t}</span>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function HelpCenter({ initialArticleId, onClose }: { initialArticleId?: string; onClose?: () => void }) {
    const [query, setQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

    // Initial article handling
    React.useEffect(() => {
        if (initialArticleId) {
            const art = ARTICLES.find(a => a.id === initialArticleId);
            if (art) {
                setSelectedArticle(art);
                setQuery('');
                setActiveCategory(null);
            }
        }
    }, [initialArticleId]);

    // Unique categories
    const categories = useMemo(() => {
        const seen = new Set<string>();
        return ARTICLES.filter(a => {
            if (seen.has(a.category)) return false;
            seen.add(a.category);
            return true;
        }).map(a => ({ name: a.category, icon: a.categoryIcon, color: a.categoryColor }));
    }, []);

    // Filtered articles
    const filtered = useMemo(() => {
        let list = ARTICLES;
        if (activeCategory) list = list.filter(a => a.category === activeCategory);
        if (query.trim()) {
            const q = query.toLowerCase();
            list = list.filter(a =>
                a.title.toLowerCase().includes(q) ||
                a.summary.toLowerCase().includes(q) ||
                a.tags.some(t => t.includes(q)) ||
                a.category.toLowerCase().includes(q)
            );
        }
        return list;
    }, [query, activeCategory]);

    const featuredArticles = ARTICLES.filter(a =>
        ['templates-carpetas', 'templates-predesign', 'folders-intro', 'workflows-actions'].includes(a.id)
    );

    return (
        <div className="max-w-6xl mx-auto pb-20">
            {/* Hero */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 p-10 mb-8 shadow-2xl shadow-blue-200/50 dark:shadow-blue-900/30">
                {/* Decorative circles */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full translate-x-20 -translate-y-20" />
                <div className="absolute bottom-0 left-10 w-40 h-40 bg-white/5 rounded-full translate-y-10" />

                {/* Close Button */}
                {onClose && (
                    <button
                        onClick={onClose}
                        className="absolute top-8 right-8 p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl backdrop-blur-md transition-all border border-white/20 active:scale-95 group z-20"
                        title="Cerrar ayuda"
                    >
                        <X className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                )}

                <div className="relative">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                            <BookOpen className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-blue-200 text-[10px] font-black uppercase tracking-widest">BPM MANAGER</p>
                            <h1 className="text-2xl font-black text-white leading-none">Centro de Ayuda</h1>
                        </div>
                    </div>
                    <p className="text-blue-100 text-base mb-6 max-w-xl">
                        Encuentra respuestas sobre flujos de trabajo, plantillas, carpetas, integraciones y todo lo que necesitas para sacar el máximo provecho al sistema.
                    </p>

                    {/* Search */}
                    <div className="relative max-w-xl">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            value={query}
                            onChange={e => { setQuery(e.target.value); setSelectedArticle(null); }}
                            placeholder="Buscar: plantillas, carpetas, webhooks, SLA…"
                            className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 rounded-2xl text-slate-800 dark:text-white placeholder-slate-400 text-sm font-medium shadow-xl focus:outline-none focus:ring-4 focus:ring-white/30"
                            id="help-search"
                        />
                        {query && (
                            <button onClick={() => setQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    <p className="text-blue-200/70 text-xs mt-3">
                        {ARTICLES.length} artículos disponibles · {categories.length} categorías
                    </p>
                </div>
            </div>

            {selectedArticle ? (
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 border border-slate-100 dark:border-slate-800 shadow-xl">
                    <ArticleViewer article={selectedArticle} onBack={() => setSelectedArticle(null)} />
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Sidebar: categories */}
                    <div className="space-y-2">
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest px-3 mb-3">Categorías</p>
                        <button
                            onClick={() => setActiveCategory(null)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all text-left ${!activeCategory ? 'bg-blue-600 text-white shadow-lg shadow-blue-200/50' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}
                        >
                            <BookOpen className="w-4 h-4 flex-shrink-0" />
                            Todos los artículos
                            <span className={`ml-auto text-xs px-2 py-0.5 rounded-md font-black ${!activeCategory ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                                {ARTICLES.length}
                            </span>
                        </button>

                        {categories.map(cat => {
                            const colors = CATEGORY_COLORS[cat.color] || CATEGORY_COLORS.blue;
                            const Icon = cat.icon;
                            const count = ARTICLES.filter(a => a.category === cat.name).length;
                            const isActive = activeCategory === cat.name;
                            return (
                                <button
                                    key={cat.name}
                                    onClick={() => { setActiveCategory(cat.name); setQuery(''); }}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all text-left ${isActive ? `${colors.bg} ${colors.text} border ${colors.border}` : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}
                                >
                                    <Icon className="w-4 h-4 flex-shrink-0" />
                                    <span className="truncate text-xs">{cat.name}</span>
                                    <span className={`ml-auto text-xs px-2 py-0.5 rounded-md font-black flex-shrink-0 ${isActive ? 'bg-white/30' : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500'}`}>
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Main content */}
                    <div className="lg:col-span-3 space-y-6">
                        {/* Featured - only on home (no filter/search) */}
                        {!query && !activeCategory && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Star className="w-4 h-4 text-amber-500" />
                                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Artículos Destacados</p>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {featuredArticles.map(a => (
                                        <ArticleCard key={a.id} article={a} onClick={() => setSelectedArticle(a)} />
                                    ))}
                                </div>
                                <div className="h-px bg-slate-100 dark:bg-slate-800 my-2" />
                                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Todos los artículos</p>
                            </div>
                        )}

                        {/* Results */}
                        {query && (
                            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                <Search className="w-4 h-4" />
                                <span>{filtered.length} resultado{filtered.length !== 1 ? 's' : ''} para <strong className="text-slate-800 dark:text-white">"{query}"</strong></span>
                            </div>
                        )}

                        {filtered.length > 0 ? (
                            <div className="grid grid-cols-1 gap-3">
                                {filtered.map(a => (
                                    <ArticleCard key={a.id} article={a} onClick={() => setSelectedArticle(a)} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
                                <HelpCircle className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                                <p className="font-bold text-slate-500 dark:text-slate-400">No se encontraron artículos</p>
                                <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Intenta con otros términos de búsqueda</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
