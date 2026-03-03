import { useEffect, useRef, useState } from 'react';
import * as OBF from '@thatopen/components';
import * as THREE from 'three';
// @ts-ignore
import { FragmentsManager, BoundingBoxer, IfcLoader, Worlds, SimpleScene, SimpleCamera, SimpleRenderer } from '@thatopen/components';
import { Highlighter } from '@thatopen/components-front';

interface IfcViewerProps {
    fileUrl: string | File;
    onObjectSelected: (properties: any) => void;
    objectStates?: Record<number, 'completed' | 'processing' | 'delayed' | 'pending'>;
    className?: string;
}

export function IfcViewer({ fileUrl, onObjectSelected, objectStates, className = '' }: IfcViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const componentsRef = useRef<OBF.Components | null>(null);
    const modelRef = useRef<any>(null);

    useEffect(() => {
        if (!componentsRef.current || !modelRef.current || !objectStates) return;

        const components = componentsRef.current;
        const model = modelRef.current;
        const highlighter = components.get(Highlighter) as any;

        const statusGroups: Record<string, number[]> = {
            completed: [],
            processing: [],
            delayed: [],
            pending: []
        };

        Object.entries(objectStates).forEach(([id, state]) => {
            if (statusGroups[state as string]) statusGroups[state as string].push(Number(id));
        });

        for (const [state, ids] of Object.entries(statusGroups)) {
            if (ids.length > 0) {
                try {
                    const selection = model.getFragmentMap(ids);
                    highlighter.highlight(state, selection);
                } catch (e) {
                    console.warn("Failed to update highlighter for state:", state, e);
                }
            }
        }
    }, [objectStates]);

    useEffect(() => {
        if (!containerRef.current) return;

        let components: OBF.Components;

        const initViewer = async () => {
            try {
                setIsLoading(true);
                setError(null);

                // 1. Initialize Components
                components = new OBF.Components();
                components.init();

                const fragments = components.get(FragmentsManager) as any;
                fragments.init("https://unpkg.com/@thatopen/fragments@3.3.6/dist/Worker/worker.mjs");

                componentsRef.current = components;

                // 2. Setup World & Camera
                const worlds = components.get(Worlds) as any;
                const world = worlds.create();

                world.scene = new SimpleScene(components);
                world.renderer = new SimpleRenderer(components, containerRef.current!);
                world.camera = new SimpleCamera(components);

                components.init(); // Wait for renderer sizing

                // Basic generic lighting
                world.scene.setup();
                world.scene.three.background = null; // Transparent/CSS controlled

                // 3. Setup IFC Loader
                const ifcLoader = components.get(IfcLoader) as any;
                ifcLoader.settings.wasm = {
                    path: "/wasm/",
                    absolute: false
                };
                await ifcLoader.setup(); // Downloads Web-IFC WASM

                // 4. Load File
                let buffer: Uint8Array;
                if (typeof fileUrl === 'string') {
                    const response = await fetch(fileUrl);
                    const arrayBuffer = await response.arrayBuffer();
                    buffer = new Uint8Array(arrayBuffer);
                } else {
                    const arrayBuffer = await fileUrl.arrayBuffer();
                    buffer = new Uint8Array(arrayBuffer);
                }

                // 5. Build Model
                const model = await ifcLoader.load(buffer);
                modelRef.current = model;
                world.scene.three.add(model);

                // Fit camera to model
                const bboxScanner = components.get(BoundingBoxer) as any;
                bboxScanner.add(model);
                const sphere = bboxScanner.getSphere();
                bboxScanner.reset();

                if (world.camera.controls) {
                    world.camera.controls.setLookAt(
                        sphere.center.x + sphere.radius * 2,
                        sphere.center.y + sphere.radius * 2,
                        sphere.center.z + sphere.radius * 2,
                        sphere.center.x,
                        sphere.center.y,
                        sphere.center.z,
                        true
                    );
                }

                // 6. Setup Raycaster / Selection & 4D Styles
                const highlighter = components.get(Highlighter) as any;
                highlighter.setup({ world });

                // Define 4D Status Styles
                const COMPLETED_COLOR = new (THREE as any).Color('#22c55e'); // Green 500
                const PROCESSING_COLOR = new (THREE as any).Color('#3b82f6'); // Blue 500
                const DELAYED_COLOR = new (THREE as any).Color('#ef4444');    // Red 500
                const PENDING_COLOR = new (THREE as any).Color('#f59e0b');    // Amber 500

                highlighter.add('completed', [COMPLETED_COLOR]);
                highlighter.add('processing', [PROCESSING_COLOR]);
                highlighter.add('delayed', [DELAYED_COLOR]);
                highlighter.add('pending', [PENDING_COLOR]);

                // Apply initial 4D colors if provided
                if (objectStates) {
                    const statusGroups: Record<string, number[]> = {
                        completed: [],
                        processing: [],
                        delayed: [],
                        pending: []
                    };

                    Object.entries(objectStates).forEach(([id, state]) => {
                        if (statusGroups[state]) statusGroups[state].push(Number(id));
                    });

                    for (const [state, ids] of Object.entries(statusGroups)) {
                        if (ids.length > 0) {
                            const selection = model.getFragmentMap(ids);
                            highlighter.highlight(state, selection);
                        }
                    }
                }


                highlighter.events.select.onHighlight.add(async (selection: any) => {
                    const fragmentId = Object.keys(selection)[0];
                    if (!fragmentId) return;

                    const expressIds = selection[fragmentId];
                    const id = [...expressIds][0]; // get first selected ID

                    if (id !== undefined && model.getItemsData) {
                        try {
                            const data = await model.getItemsData([id], { attributesDefault: true });
                            if (data && data.length > 0) {
                                const props = data[0].attributes || {};
                                onObjectSelected({
                                    id: props.expressID || id,
                                    name: props.Name?.value || props.name || 'Objeto BIM',
                                    type: props.ObjectType?.value || props.type || 'Tipo Desconocido',
                                    rawProps: props
                                });
                            }
                        } catch (err) {
                            console.error("Error getting item properties", err);
                        }
                    }
                });

                setIsLoading(false);
            } catch (err: any) {
                console.error("IFC Loading error", err);
                setError(err.message || "Failed to load IFC model");
                setIsLoading(false);
            }
        };

        initViewer();

        return () => {
            if (components) {
                components.dispose();
                componentsRef.current = null;
                modelRef.current = null;
            }
        };
    }, [fileUrl]);

    return (
        <div className={`relative w-full h-full overflow-hidden bg-slate-900 rounded-xl ${className}`}>
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-10">
                    <div className="flex flex-col items-center">
                        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="text-white font-bold tracking-widest text-xs uppercase">Cargando Modelo BIM...</p>
                    </div>
                </div>
            )}

            {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-rose-900/80 z-10">
                    <div className="text-white text-center max-w-sm px-4">
                        <p className="font-bold text-sm mb-2 uppercase tracking-widest text-rose-300">Error de BIM</p>
                        <p className="text-xs opacity-80">{error}</p>
                    </div>
                </div>
            )}

            <div ref={containerRef} className="w-full h-full outline-none" />

            <div className="absolute bottom-4 left-4 right-4 flex justify-between pointer-events-none">
                <div className="bg-slate-900/60 backdrop-blur text-white text-[10px] px-3 py-1.5 rounded-lg border border-slate-700 font-bold uppercase tracking-widest pointer-events-auto">
                    3D Viewer Activo
                </div>
                <div className="bg-indigo-600/90 text-white text-[10px] px-3 py-1.5 rounded-lg font-bold uppercase tracking-widest shadow-lg pointer-events-auto cursor-help" title="Haz clic en un objeto del modelo (puerta, ventana, etc.) para ver sus propiedades BIM.">
                    Click para inspeccionar
                </div>
            </div>
        </div>
    );
}
