import type { Activity, Transition } from '../types';

export function exportToBPMN(workflowName: string, activities: Activity[], transitions: Transition[]): string {
    const processId = `Process_${crypto.randomUUID().split('-')[0]}`;
    const diagramId = `Diagram_${crypto.randomUUID().split('-')[0]}`;
    const planeId = `Plane_${crypto.randomUUID().split('-')[0]}`;

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
                  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" 
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" 
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" 
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI" 
                  id="Definitions_1" 
                  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="${processId}" name="${workflowName}" isExecutable="false">
`;

    // Add Activities
    activities.forEach(activity => {
        const id = `Activity_${activity.id.replace(/-/g, '_')}`;
        const name = activity.name;

        switch (activity.type) {
            case 'start':
                xml += `    <bpmn:startEvent id="${id}" name="${name}">\n`;
                break;
            case 'task':
                xml += `    <bpmn:userTask id="${id}" name="${name}">\n`;
                break;
            case 'decision':
                xml += `    <bpmn:exclusiveGateway id="${id}" name="${name}">\n`;
                break;
            case 'end':
                xml += `    <bpmn:endEvent id="${id}" name="${name}">\n`;
                break;
        }

        // Add incoming/outgoing sequence flow references
        transitions.filter(t => t.target_id === activity.id).forEach(t => {
            xml += `      <bpmn:incoming>Flow_${t.id.replace(/-/g, '_')}</bpmn:incoming>\n`;
        });
        transitions.filter(t => t.source_id === activity.id).forEach(t => {
            xml += `      <bpmn:outgoing>Flow_${t.id.replace(/-/g, '_')}</bpmn:outgoing>\n`;
        });

        switch (activity.type) {
            case 'start': xml += `    </bpmn:startEvent>\n`; break;
            case 'task': xml += `    </bpmn:userTask>\n`; break;
            case 'decision': xml += `    </bpmn:exclusiveGateway>\n`; break;
            case 'end': xml += `    </bpmn:endEvent>\n`; break;
        }
    });

    // Add Transitions (Sequence Flows)
    transitions.forEach(transition => {
        const id = `Flow_${transition.id.replace(/-/g, '_')}`;
        const sourceId = `Activity_${transition.source_id.replace(/-/g, '_')}`;
        const targetId = `Activity_${transition.target_id.replace(/-/g, '_')}`;
        const condition = transition.condition ? ` name="${transition.condition}"` : '';

        xml += `    <bpmn:sequenceFlow id="${id}"${condition} sourceRef="${sourceId}" targetRef="${targetId}" />\n`;
    });

    xml += `  </bpmn:process>\n`;

    // Add DI (Diagram Interchange) for positions
    xml += `  <bpmndi:BPMNDiagram id="${diagramId}">
    <bpmndi:BPMNPlane id="${planeId}" bpmnElement="${processId}">
`;

    activities.forEach(activity => {
        const id = `Activity_${activity.id.replace(/-/g, '_')}_di`;
        const elementId = `Activity_${activity.id.replace(/-/g, '_')}`;
        const width = activity.type === 'decision' ? 50 : (activity.type === 'start' || activity.type === 'end' ? 36 : 100);
        const height = activity.type === 'decision' ? 50 : (activity.type === 'start' || activity.type === 'end' ? 36 : 80);

        // Centering adjusted based on our canvas logic
        xml += `      <bpmndi:BPMNShape id="${id}" bpmnElement="${elementId}">
        <dc:Bounds x="${activity.x_pos}" y="${activity.y_pos}" width="${width}" height="${height}" />
      </bpmndi:BPMNShape>\n`;
    });

    transitions.forEach(transition => {
        const id = `Flow_${transition.id.replace(/-/g, '_')}_di`;
        const elementId = `Flow_${transition.id.replace(/-/g, '_')}`;
        const source = activities.find(a => a.id === transition.source_id);
        const target = activities.find(a => a.id === transition.target_id);

        if (source && target) {
            xml += `      <bpmndi:BPMNEdge id="${id}" bpmnElement="${elementId}">
        <di:waypoint x="${source.x_pos + 50}" y="${source.y_pos + 40}" />
        <di:waypoint x="${target.x_pos + 50}" y="${target.y_pos + 40}" />
      </bpmndi:BPMNEdge>\n`;
        }
    });

    xml += `    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

    return xml;
}

export function importFromBPMN(xml: string): { activities: Activity[], transitions: Transition[] } {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');

    const activities: Activity[] = [];
    const transitions: Transition[] = [];

    // Map to keep track of generated IDs to match sequence flows
    const idMap: { [key: string]: string } = {};

    // Helper to extract positions from DI
    const getPosition = (elementId: string) => {
        const shape = Array.from(doc.getElementsByTagName('bpmndi:BPMNShape')).find(s => s.getAttribute('bpmnElement') === elementId);
        if (shape) {
            const bounds = shape.getElementsByTagName('dc:Bounds')[0];
            if (bounds) {
                return {
                    x: parseFloat(bounds.getAttribute('x') || '100'),
                    y: parseFloat(bounds.getAttribute('y') || '100')
                };
            }
        }
        return { x: 100, y: 100 };
    };

    // Extract Start Events
    Array.from(doc.getElementsByTagName('bpmn:startEvent')).forEach(el => {
        const bpmnId = el.getAttribute('id') || '';
        const id = crypto.randomUUID();
        const pos = getPosition(bpmnId);
        idMap[bpmnId] = id;
        activities.push({
            id,
            workflow_id: '', // Will be set by host
            name: el.getAttribute('name') || 'Inicio',
            type: 'start',
            x_pos: pos.x,
            y_pos: pos.y,
            fields: []
        });
    });

    // Extract Tasks
    Array.from(doc.getElementsByTagName('bpmn:userTask')).forEach(el => {
        const bpmnId = el.getAttribute('id') || '';
        const id = crypto.randomUUID();
        const pos = getPosition(bpmnId);
        idMap[bpmnId] = id;
        activities.push({
            id,
            workflow_id: '',
            name: el.getAttribute('name') || 'Tarea',
            type: 'task',
            x_pos: pos.x,
            y_pos: pos.y,
            fields: []
        });
    });

    // Extract Gateways
    Array.from(doc.getElementsByTagName('bpmn:exclusiveGateway')).forEach(el => {
        const bpmnId = el.getAttribute('id') || '';
        const id = crypto.randomUUID();
        const pos = getPosition(bpmnId);
        idMap[bpmnId] = id;
        activities.push({
            id,
            workflow_id: '',
            name: el.getAttribute('name') || 'Decisión',
            type: 'decision',
            x_pos: pos.x,
            y_pos: pos.y,
            fields: []
        });
    });

    // Extract End Events
    Array.from(doc.getElementsByTagName('bpmn:endEvent')).forEach(el => {
        const bpmnId = el.getAttribute('id') || '';
        const id = crypto.randomUUID();
        const pos = getPosition(bpmnId);
        idMap[bpmnId] = id;
        activities.push({
            id,
            workflow_id: '',
            name: el.getAttribute('name') || 'Fin',
            type: 'end',
            x_pos: pos.x,
            y_pos: pos.y,
            fields: []
        });
    });

    // Extract Sequence Flows
    Array.from(doc.getElementsByTagName('bpmn:sequenceFlow')).forEach(el => {
        const sourceRef = el.getAttribute('sourceRef') || '';
        const targetRef = el.getAttribute('targetRef') || '';

        if (idMap[sourceRef] && idMap[targetRef]) {
            transitions.push({
                id: crypto.randomUUID(),
                workflow_id: '', // Will be set by host
                source_id: idMap[sourceRef],
                target_id: idMap[targetRef],
                condition: el.getAttribute('name') || undefined
            });
        }
    });

    return { activities, transitions };
}
