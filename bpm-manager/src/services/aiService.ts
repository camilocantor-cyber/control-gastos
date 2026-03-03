import type { Activity, Transition } from '../types';

export type AIProviderName = 'openai' | 'gemini';

export interface AIGeneratedWorkflow {
    activities: Activity[];
    transitions: Transition[];
}

export async function generateWorkflowWithAI(prompt: string, apiKey: string, provider: AIProviderName = 'openai'): Promise<AIGeneratedWorkflow> {
    const systemPrompt = `
Eres un Analista Avanzado de Negocios y Arquitecto de Procesos BPMN. Tu misión es generar increíbles flujos de trabajo funcionales para "BPM Manager". 
El usuario te dará una idea en lenguaje natural de un proceso, y tú devolverás ÚNICAMENTE un JSON válido con la estructura exacta detallada abajo. ¡NADA de backticks \`\`\`, SOLO el raw JSON!

### Estructura del JSON Esperado:
Un objeto con dos arreglos: \`activities\` y \`transitions\`. Debes usar IDs numéricos simples como "1", "2", "3" para que puedas relacionarlos fácilmente. El sistema los convertirá a UUIDs luego.

\`\`\`json
{
  "activities": [
    {
      "id": "1",
      "workflow_id": "temp-workflow-id",
      "name": "Inicio Solicitud",
      "type": "start",
      "x_pos": 100,
      "y_pos": 200,
      "fields": [
        { "id": "f1", "activity_id": "1", "name": "motivo", "label": "Motivo", "type": "textarea", "required": true, "order_index": 0 }
      ]
    },
    {
      "id": "2",
      "workflow_id": "temp-workflow-id",
      "name": "Revisar Formulario",
      "type": "decision",
      "x_pos": 450,
      "y_pos": 200
    }
  ],
  "transitions": [
    {
      "id": "t1",
      "workflow_id": "temp-workflow-id",
      "source_id": "1",
      "target_id": "2",
      "condition": "Aprobado"
    }
  ]
}
\`\`\`

### Criterios y Reglas ORO (MANDATORIAS):
1. **El Primer Nodo (\`activities\`)**: Siempre debe ser \`type: 'start'\` y llamarse algo "Inicio". Debe contener TODOS los \`fields\` iniciales (tipos válidos: 'text', 'number', 'date', 'boolean', 'select', 'textarea', 'currency', 'email').
2. **Nodos de Decisión y Ramas**: Usa un \`decision\` para dividir el flujo. Importante: Para las \`transitions\`, si salen de una \`decision\`, usa el campo \`condition\` para poner la ruta (ej. "Aprobado" va a un lado, "Rechazado" va a otro lado).
3. **Flujo Visual**: 
   - Start Node: \`x_pos: 100\`
   - Tarea Sig: \`x_pos: 450\`
   - Decisión/Siguiente: \`x_pos: 800\`
   - Final: \`x_pos: 1150\`
   Avanza gradualmente en X (\`+350\`). Si hay ramas paralelas o de rechazo, súbelas o bájalas en Y (ej. \`y_pos: 400\` o \`0\`).
4. **Nodos de Finalización**: Termina las ramas con al menos un nodo \`type: 'end'\`.
5. ESTRICTO FORMATO DE RESPUESTA: Sólo el JSON CRUSO. Debe comenzar por '{' y terminar en '}'. SIN palabras de saludo ni comillas invertidas.
`;

    let rawContent = "{}";

    if (provider === 'gemini') {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    system_instruction: {
                        parts: [{ text: systemPrompt }]
                    },
                    contents: [
                        { role: 'user', parts: [{ text: prompt }] }
                    ],
                    generationConfig: {
                        temperature: 0.2,
                        responseMimeType: "application/json"
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'Error de comunicación con Gemini');
            }

            const data = await response.json();
            rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

        } catch (error: any) {
            console.error("Gemini Error:", error);
            throw new Error(`Error de comunicación con Gemini: ${error.message || 'Error desconocido'}`);
        }
    } else {
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
        rawContent = data.choices[0]?.message?.content || '{}';
    }

    try {
        // Mejoramos la robustez buscando el corchete de objeto para limpiar
        let cleanedContent = rawContent;
        const startIndex = rawContent.indexOf('{');
        const endIndex = rawContent.lastIndexOf('}');

        if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
            cleanedContent = rawContent.substring(startIndex, endIndex + 1);
        }

        const generatedData = JSON.parse(cleanedContent) as { activities?: any[], transitions?: any[] };

        const activities = generatedData.activities || [];
        const transitions = generatedData.transitions || [];

        // Mapeo seguro de IDs temporales a UUIDs reales
        const idMap = new Map<string, string>();

        const finalActivities: Activity[] = activities.map(act => {
            const newId = crypto.randomUUID();
            idMap.set(String(act.id), newId);

            // Fix field ids as well silently
            const finalFields = (act.fields || []).map((f: any) => ({
                ...f,
                id: crypto.randomUUID(),
                activity_id: newId
            }));

            return {
                ...act,
                id: newId,
                workflow_id: 'temp', // We replace this upstream
                fields: finalFields
            };
        });

        const finalTransitions: Transition[] = transitions.map(tr => {
            return {
                ...tr,
                id: crypto.randomUUID(),
                workflow_id: 'temp',
                source_id: idMap.get(String(tr.source_id)) || tr.source_id,
                target_id: idMap.get(String(tr.target_id)) || tr.target_id
            };
        });

        return { activities: finalActivities, transitions: finalTransitions };

    } catch (e) {
        throw new Error("La IA no devolvió un JSON válido. Intenta cambiar tu prompt.");
    }
}

export async function askAICopilot(prompt: string, context: string, apiKey: string): Promise<string> {
    const systemPrompt = `Eres un asistente de Inteligencia Artificial integrado en un sistema BPM (Business Process Management).
Estás ayudando a un usuario con una tarea específica de un flujo de trabajo.
El contexto del proceso y la actividad actual, así como los datos del formulario (y cualquier elemento BIM si aplica), te serán provistos.
Usa este contexto para dar respuestas precisas, útiles y concisas.

CONTEXTO DEL PROCESO ACTUAL:
${context}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
            ],
            temperature: 0.7,
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Error de comunicación con OpenAI');
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'Sin respuesta.';
}

export async function askDashboardAI(prompt: string, apiKey: string, analyticsData: any, statsData: any, provider: AIProviderName = 'openai'): Promise<string> {
    const rawData = JSON.stringify({
        estadisticasGenerales: statsData,
        analiticas: analyticsData
    }, null, 2);

    const systemPrompt = `Eres un asistente experto de Inteligencia Artificial para el Dashboard de BPM Manager.
Tu objetivo es responder preguntas del usuario basándote ESTRICTAMENTE en los datos de abajo. 
Los datos representan métricas en tiempo real de la organización (rendimiento, cuellos de botella, costos, usuarios).
Si el usuario te pregunta por el flujo más costoso, el más demorado, o el usuario más rápido, busca la respuesta en este JSON.
Responde de manera ejecutiva, clara, y con formato Markdown. NO inventes datos que no estén en el JSON.

DATOS DEL DASHBOARD ACTUALES:
\`\`\`json
${rawData}
\`\`\`
`;

    if (provider === 'gemini') {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system_instruction: { parts: [{ text: systemPrompt }] },
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.3 }
            })
        });
        if (!response.ok) throw new Error('Error al conectar con Gemini');
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "Sin respuesta.";
    } else {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.3,
            })
        });
        if (!response.ok) throw new Error('Error al conectar con OpenAI');
        const data = await response.json();
        return data.choices[0]?.message?.content || 'Sin respuesta.';
    }
}
