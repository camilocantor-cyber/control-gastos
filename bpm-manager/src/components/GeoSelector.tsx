import { useState, useEffect } from 'react';
import { Locate, Map as MapIcon, Globe, X, ExternalLink } from 'lucide-react';
import { clsx } from 'clsx';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Corregir el ícono por defecto de Leaflet en React (problema conocido con empaquetadores)
const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Componente para manejar clics en el mapa y centrar la vista
function LocationMarker({ position, onChange }: { position: L.LatLngExpression | null, onChange: (lat: number, lng: number) => void }) {
    const map = useMap();
    
    // Centrar el mapa cuando la posición cambia desde afuara
    useEffect(() => {
        if (position) {
            map.flyTo(position, map.getZoom(), { animate: true, duration: 0.5 });
        }
    }, [position, map]);

    useMapEvents({
        click(e) {
            onChange(e.latlng.lat, e.latlng.lng);
        },
    });

    return position === null ? null : (
        <Marker position={position} />
    );
}

interface GeoSelectorProps {
    value?: string; // Stored as "lat,lng" string OR postal code
    onChange: (value: string) => void;
    mode?: 'coordinates' | 'postal_code';
}

export function GeoSelector({ value, onChange, mode = 'coordinates' }: GeoSelectorProps) {
    const [lat, setLat] = useState<string>('');
    const [lng, setLng] = useState<string>('');
    const [postalCode, setPostalCode] = useState<string>('');
    const [isLocating, setIsLocating] = useState(false);
    const [showMapPreview, setShowMapPreview] = useState(false);

    useEffect(() => {
        if (mode === 'coordinates') {
            if (value && value.includes(',')) {
                const [vLat, vLng] = value.split(',');
                setLat(vLat.trim());
                setLng(vLng.trim());
            }
        } else {
            setPostalCode(value || '');
        }
    }, [value, mode]);

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            alert('La geolocalización no es compatible con este navegador.');
            return;
        }

        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const nLat = position.coords.latitude.toString();
                const nLng = position.coords.longitude.toString();

                setLat(nLat);
                setLng(nLng);

                if (mode === 'postal_code') {
                    try {
                        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${nLat}&lon=${nLng}&zoom=16&addressdetails=1`);
                        const data = await response.json();

                        let pc = data.address?.postcode ||
                            data.address?.['postcode:postal'] ||
                            data.address?.postal_code ||
                            '';

                        if (pc) {
                            setPostalCode(String(pc));
                            onChange(String(pc));
                        } else {
                            const res2 = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${nLat}&lon=${nLng}&zoom=14&addressdetails=1`);
                            const data2 = await res2.json();
                            pc = data2.address?.postcode || data2.address?.postal_code || '';

                            if (pc) {
                                setPostalCode(String(pc));
                                onChange(String(pc));
                            } else {
                                alert('No se pudo encontrar el código postal para esta ubicación exacta. Por favor, ingrésalo manualmente.');
                            }
                        }
                    } catch (err) {
                        console.error('Reverse geocoding error:', err);
                        alert('Error al obtener el código postal de forma automática.');
                    }
                } else {
                    onChange(`${nLat},${nLng}`);
                }
                setIsLocating(false);
                // Mostrar el mapa automáticamente al ubicar exitosamente en cualquiera de los modos
                setShowMapPreview(true);
            },
            (error) => {
                console.error('Geolocation error:', error);
                alert(`Error al obtener ubicación: ${error.message}`);
                setIsLocating(false);
            },
            { enableHighAccuracy: true }
        );
    };

    const handleInputChange = (field: 'lat' | 'lng', val: string) => {
        if (field === 'lat') {
            setLat(val);
            if (val && lng && !isNaN(Number(val)) && !isNaN(Number(lng))) onChange(`${val},${lng}`);
        } else {
            setLng(val);
            if (lat && val && !isNaN(Number(lat)) && !isNaN(Number(val))) onChange(`${lat},${val}`);
        }
    };

    const handleMapClick = async (nLat: number, nLng: number) => {
        const formattedLat = nLat.toFixed(6);
        const formattedLng = nLng.toFixed(6);
        setLat(formattedLat);
        setLng(formattedLng);
        
        if (mode === 'coordinates') {
            onChange(`${formattedLat},${formattedLng}`);
        } else if (mode === 'postal_code') {
            try {
                // Hacemos reverse geocoding para obtener el código postal del punto clickeado
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${formattedLat}&lon=${formattedLng}&zoom=16&addressdetails=1`);
                const data = await response.json();

                let pc = data.address?.postcode ||
                    data.address?.['postcode:postal'] ||
                    data.address?.postal_code ||
                    '';

                if (pc) {
                    setPostalCode(String(pc));
                    onChange(String(pc));
                } else {
                    const res2 = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${formattedLat}&lon=${formattedLng}&zoom=14&addressdetails=1`);
                    const data2 = await res2.json();
                    pc = data2.address?.postcode || data2.address?.postal_code || '';

                    if (pc) {
                        setPostalCode(String(pc));
                        onChange(String(pc));
                    }
                }
            } catch (err) {
                console.error('Reverse geocoding error on click:', err);
            }
        }
    };

    const googleMapsUrl = (lat && lng) ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}` : '';

    const centerPos: L.LatLngExpression | null = (lat && lng && !isNaN(Number(lat)) && !isNaN(Number(lng))) 
        ? [Number(lat), Number(lng)] 
        : null;

    // Si no hay centro, por defecto Bogotá o un punto global
    const defaultMapCenter: L.LatLngExpression = centerPos || [4.6097, -74.0817];

    return (
        <div className="space-y-3 relative z-10 w-full">
            <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1">
                    {mode === 'coordinates' ? (
                        <div className="grid grid-cols-2 gap-2">
                            <div className="relative">
                                <label className="absolute -top-1.5 left-2 bg-white dark:bg-slate-900 px-1 text-[8px] font-black text-slate-400 uppercase tracking-widest z-10">Latitud</label>
                                <input
                                    type="text"
                                    value={lat}
                                    onChange={(e) => handleInputChange('lat', e.target.value)}
                                    placeholder="-4.123"
                                    className="w-full h-10 bg-slate-50/50 dark:bg-slate-900/50 border-2 border-slate-100 dark:border-slate-800 rounded-xl px-3 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500/50 transition-all shadow-sm"
                                />
                            </div>
                            <div className="relative">
                                <label className="absolute -top-1.5 left-2 bg-white dark:bg-slate-900 px-1 text-[8px] font-black text-slate-400 uppercase tracking-widest z-10">Longitud</label>
                                <input
                                    type="text"
                                    value={lng}
                                    onChange={(e) => handleInputChange('lng', e.target.value)}
                                    placeholder="-74.456"
                                    className="w-full h-10 bg-slate-50/50 dark:bg-slate-900/50 border-2 border-slate-100 dark:border-slate-800 rounded-xl px-3 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500/50 transition-all shadow-sm"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="relative">
                            <label className="absolute -top-1.5 left-2 bg-white dark:bg-slate-900 px-1 text-[8px] font-black text-rose-500 uppercase tracking-widest z-10">Código Postal</label>
                            <input
                                type="text"
                                value={postalCode}
                                onChange={(e) => {
                                    setPostalCode(e.target.value);
                                    onChange(e.target.value);
                                }}
                                placeholder="Escribe o captura el C.P."
                                className="w-full h-10 bg-rose-50/30 dark:bg-rose-900/10 border-2 border-rose-100 dark:border-rose-900/30 rounded-xl px-3 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-rose-500/50 transition-all shadow-sm"
                            />
                        </div>
                    )}
                </div>

                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={handleGetLocation}
                        disabled={isLocating}
                        className={clsx(
                            "flex-1 sm:w-10 h-10 flex items-center justify-center rounded-xl border-2 transition-all shrink-0 active:scale-90",
                            isLocating
                                ? "bg-blue-100 border-blue-200 text-blue-600 animate-pulse"
                                : (mode === 'postal_code'
                                    ? "bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-900/40 text-rose-500 hover:border-rose-500 shadow-sm"
                                    : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400 hover:text-blue-500 hover:border-blue-500/50 shadow-sm")
                        )}
                        title={mode === 'postal_code' ? "Capturar Código Postal" : "Obtener ubicación actual"}
                    >
                        <Locate className={clsx("w-5 h-5", isLocating && "animate-spin")} />
                    </button>

                    <button
                        type="button"
                        onClick={() => setShowMapPreview(!showMapPreview)}
                        className={clsx(
                            "flex-1 sm:w-10 h-10 flex items-center justify-center rounded-xl border-2 transition-all shrink-0",
                            showMapPreview
                                ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none"
                                : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400 hover:text-indigo-600 hover:border-indigo-500/50 shadow-sm"
                        )}
                        title="Previsualizar Mapa Interactivo"
                    >
                        <MapIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {showMapPreview && (
                <div className="animate-in slide-in-from-top-2 duration-300 z-0">
                    <div className="rounded-2xl border-2 border-slate-100 dark:border-slate-800 overflow-hidden relative group bg-slate-200 h-64 sm:h-80 shadow-inner z-0">
                        <MapContainer 
                            center={defaultMapCenter} 
                            zoom={16} 
                            scrollWheelZoom={true} 
                            style={{ height: '100%', width: '100%' }}
                            className="bg-slate-100 z-0"
                        >
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <LocationMarker position={centerPos} onChange={handleMapClick} />
                        </MapContainer>
                        
                        {lat && lng && (
                            <div className="absolute top-2 right-2 flex gap-1 z-[1000]">
                                <a
                                    href={googleMapsUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-blue-600 shadow-xl border border-slate-200 dark:border-slate-800 flex items-center gap-1.5 transition-all active:scale-95"
                                >
                                    <Globe className="w-3.5 h-3.5" />
                                    <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">Google Maps</span>
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                                <button
                                    onClick={() => setShowMapPreview(false)}
                                    className="bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-rose-500 shadow-xl border border-slate-200 dark:border-slate-800 transition-all active:scale-95"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                        <div className="absolute bottom-2 left-2 z-[1000] pointer-events-none">
                            <div className="bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-xl text-[10px] font-bold text-white shadow-xl flex items-center gap-2">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                </span>
                                Haz clic en cualquier parte del mapa para ajustar el pin
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
