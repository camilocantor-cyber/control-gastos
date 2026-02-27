import type { Activity } from '../types';

export async function generateWorkflowWithAI(prompt: string, apiKey: string): Promise<Activity[]> {
    const systemPrompt = `
Eres un Arquitecto Experto de Procesos BPMN. Tu objetivo es generar un flujo de trabajo (workflow) funcional y correctamente estructurado para el sistema BPM Manager.
El usuario te dará una descripción en lenguaje natural de un proceso de negocio, y tú devolverás ÚNICAMENTE un JSON válido que represente el arreglo de actividades (Activity[]). No devuelvas ningún texto adicional, ni bloques \`\`\`json, SOLO la cadena JSON raw.

### Estructura del JSON Esperado:
Un arreglo de objetos Activity. Cada objeto DEBE tener estricta adherencia a esta interfaz TypeScript:

export interface Activity {
  id: string; // Genera un UUID válido v4
  workflow_id: string; // Utiliza "temp-workflow-id", el frontend lo reemplazará
  name: string; // Nombre de la actividad (ej: "Inicio", "Aprobación Jefe", "Fin")
  type: 'start' | 'task' | 'decision' | 'end';
  x_pos: number; // Posición X en el lienzo. Colócalas de forma lineal o en cuadrícula (ej. separadas por 250px en X).
  y_pos: number; // Posición Y en el lienzo. (ej. todas en Y=100)
  expected_hours?: number; // Tiempo SLA estimado en horas
  fields?: FieldDefinition[]; // Solo para 'start' y 'task'
}

export interface FieldDefinition {
  id: string; // UUID v4
  activity_id: string; // El mismo de la actividad superior
  name: string; // Nombre técnico sin espacios, ej. 'nombre_empleado'
  label: string; // Etiqueta visible
  type: 'text' | 'textarea' | 'number' | 'currency' | 'date' | 'select' | 'boolean' | 'email' | 'phone' | 'provider' | 'lookup';
  required: boolean;
  order_index: number;
  options?: string[]; // Si el tipo es 'select', un array de opciones.
}

### Reglas Críticas:
1. El primer nodo debe ser siempre \`type: 'start'\`.
2. El último nodo (o nodos) debe ser \`type: 'end'\`.
3. Si el usuario menciona condicionales ("si es aprobado", "si rechaza"), usa \`type: 'decision'\`.
4. Define \`fields\` en el nodo \`start\` que recopile todos los datos iniciales necesarios del solicitante.
5. Define \`fields\` en componentes \`task\` relevantes (ej: un comentario de aprobación, o un \`select\` con ["Aprobado", "Rechazado"]).
6. No generes transiciones (edges). El usuario las dibujará manualmente en UI, solo devuélvelas visualmente ordenadas en X/Y.
7. Tu respuesta debe ser *solo* el JSON válido, de lo contrario la aplicación fallará.
`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini', // Usando gpt-4o-mini por defecto para buena relación costo/calidad
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
            ],
            temperature: 0.2, // Baja temperatura para JSON estables
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Error de comunicación con OpenAI');
    }

    const data = await response.json();
    const rawContent = data.choices[0]?.message?.content || '[]';

    try {
        // Limpiamos el texto por si el LLM pone ```json al principio y al final
        let cleanedContent = rawContent.replace(/^```json/i, '').replace(/```$/i, '').trim();
        return JSON.parse(cleanedContent) as Activity[];
    } catch (e) {
        throw new Error("La IA no devolvió un JSON válido. Intenta cambiar tu prompt.");
    }
}
