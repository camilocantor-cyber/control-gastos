import { useState, useEffect } from 'react';
import { Locate, Map as MapIcon, Globe, X, ExternalLink } from 'lucide-react';
import { clsx } from 'clsx';

interface GeoSelectorProps {
    value?: string; // Stored as "lat,lng" string
    onChange: (value: string) => void;
}

export function GeoSelector({ value, onChange }: GeoSelectorProps) {
    const [lat, setLat] = useState<string>('');
    const [lng, setLng] = useState<string>('');
    const [isLocating, setIsLocating] = useState(false);
    const [showMapPreview, setShowMapPreview] = useState(false);

    useEffect(() => {
        if (value && value.includes(',')) {
            const [vLat, vLng] = value.split(',');
            setLat(vLat.trim());
            setLng(vLng.trim());
        }
    }, [value]);

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            alert('La geolocalización no es compatible con este navegador.');
            return;
        }

        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const newLat = position.coords.latitude.toString();
                const newLng = position.coords.longitude.toString();
                setLat(newLat);
                setLng(newLng);
                onChange(`${newLat},${newLng}`);
                setIsLocating(false);
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
            if (val && lng) onChange(`${val},${lng}`);
        } else {
            setLng(val);
            if (lat && val) onChange(`${lat},${val}`);
        }
    };

    // OpenStreetMap URL for preview
    const mapUrl = (lat && lng)
        ? `https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(lng) - 0.005}%2C${parseFloat(lat) - 0.005}%2C${parseFloat(lng) + 0.005}%2C${parseFloat(lat) + 0.005}&layer=mapnik&marker=${lat}%2C${lng}`
        : '';

    const googleMapsUrl = (lat && lng) ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}` : '';

    return (
        <div className="space-y-3">
            <div className="flex gap-2">
                <div className="flex-1 grid grid-cols-2 gap-2">
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

                <button
                    type="button"
                    onClick={handleGetLocation}
                    disabled={isLocating}
                    className={clsx(
                        "w-10 h-10 flex items-center justify-center rounded-xl border-2 transition-all shrink-0 active:scale-90",
                        isLocating
                            ? "bg-blue-100 border-blue-200 text-blue-600 animate-pulse"
                            : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400 hover:text-blue-500 hover:border-blue-500/50 shadow-sm"
                    )}
                    title="Obtener ubicación actual"
                >
                    <Locate className={clsx("w-5 h-5", isLocating && "animate-spin")} />
                </button>

                {lat && lng && (
                    <button
                        type="button"
                        onClick={() => setShowMapPreview(!showMapPreview)}
                        className={clsx(
                            "w-10 h-10 flex items-center justify-center rounded-xl border-2 transition-all shrink-0",
                            showMapPreview
                                ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none"
                                : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400 hover:text-indigo-600 hover:border-indigo-500/50 shadow-sm"
                        )}
                        title="Previsualizar Mapa"
                    >
                        <MapIcon className="w-5 h-5" />
                    </button>
                )}
            </div>

            {showMapPreview && lat && lng && (
                <div className="animate-in slide-in-from-top-2 duration-300">
                    <div className="rounded-2xl border-2 border-slate-100 dark:border-slate-800 overflow-hidden relative group bg-slate-200 h-48 sm:h-64 shadow-inner">
                        <iframe
                            width="100%"
                            height="100%"
                            frameBorder="0"
                            scrolling="no"
                            marginHeight={0}
                            marginWidth={0}
                            src={mapUrl}
                            className="bg-slate-100"
                        />
                        <div className="absolute top-2 right-2 flex gap-1">
                            <a
                                href={googleMapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-white/90 dark:bg-slate-950/90 backdrop-blur p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-blue-600 shadow-xl border border-white/20 flex items-center gap-1.5 transition-all active:scale-95"
                            >
                                <Globe className="w-3.5 h-3.5" />
                                <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">Google Maps</span>
                                <ExternalLink className="w-3 h-3" />
                            </a>
                            <button
                                onClick={() => setShowMapPreview(false)}
                                className="bg-white/90 dark:bg-slate-950/90 backdrop-blur p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-rose-500 shadow-xl border border-white/20 transition-all active:scale-95"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-slate-950/90 backdrop-blur px-3 py-1.5 rounded-full text-[9px] font-black text-indigo-600 uppercase tracking-[0.2em] shadow-lg border border-indigo-100 dark:border-indigo-900/50">
                            Vista previa interactiva
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
