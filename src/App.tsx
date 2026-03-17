import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import L from 'leaflet';
import Plotly from 'plotly.js-dist-min';
import { 
  FileSpreadsheet, 
  Filter, 
  Map as MapIcon, 
  BarChart3, 
  TrendingUp, 
  Package, 
  MapPin,
  Calendar,
  Upload,
  Info,
  Trash2,
  BrainCircuit,
  Download,
  Sparkles,
  RotateCcw
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import Markdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import 'leaflet/dist/leaflet.css';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
interface Zone {
  id: number;
  name: string;
  lat: number;
  lng: number;
}

interface DailyRecord {
  Fecha: string;
  Pedidos: number;
  Kilos: number;
  Euros: number;
  Bultos: number;
}

interface DailyZoneRecord extends DailyRecord {
  Zona: number;
  ZonaNombre: string;
  DiaSemanaN: number;
  DiaSemana: string;
  Mes: string;
}

interface DashboardData {
  source_file: string;
  generated_at: string;
  min_fecha: string;
  max_fecha: string;
  total_pedidos: number;
  total_kilos: number;
  total_euros: number;
  total_bultos: number;
  months: string[];
  weekdays: string[];
  zones: Zone[];
  daily_all: DailyRecord[];
  daily_zone: DailyZoneRecord[];
}

// --- Initial Data ---
const INITIAL_ZONES: Zone[] = [
  {"id": 0, "name": "PALMA", "lat": 39.5696, "lng": 2.6502}, 
  {"id": 1, "name": "POLLENÇA", "lat": 39.877, "lng": 3.017}, 
  {"id": 2, "name": "ALCUDIA", "lat": 39.853, "lng": 3.122}, 
  {"id": 3, "name": "CAN PICAFORT", "lat": 39.764, "lng": 3.154}, 
  {"id": 4, "name": "CALA RATJADA", "lat": 39.712, "lng": 3.463}, 
  {"id": 5, "name": "CALA MILLOR", "lat": 39.603, "lng": 3.384}, 
  {"id": 6, "name": "CALES DE MALLORCA", "lat": 39.487, "lng": 3.274}, 
  {"id": 7, "name": "CALA D'OR", "lat": 39.377, "lng": 3.23}, 
  {"id": 8, "name": "COL. SANT JORDI", "lat": 39.318, "lng": 2.993}, 
  {"id": 9, "name": "ARENAL", "lat": 39.5, "lng": 2.751}, 
  {"id": 10, "name": "MAGALUF", "lat": 39.511, "lng": 2.536}, 
  {"id": 11, "name": "PALMANOVA", "lat": 39.519, "lng": 2.539}, 
  {"id": 12, "name": "CALA MAJOR/ILLETES", "lat": 39.548, "lng": 2.593}, 
  {"id": 13, "name": "ANDRATX", "lat": 39.579, "lng": 2.421}, 
  {"id": 14, "name": "SANTA PONSA", "lat": 39.508, "lng": 2.477}, 
  {"id": 15, "name": "PAGUERA", "lat": 39.537, "lng": 2.449}, 
  {"id": 16, "name": "AEROPORT", "lat": 39.553, "lng": 2.73}, 
  {"id": 17, "name": "HOSPITAL SON ESPASES", "lat": 39.594, "lng": 2.634}, 
  {"id": 18, "name": "SOLLER", "lat": 39.766, "lng": 2.715}, 
  {"id": 19, "name": "LLUCALCARI", "lat": 39.754, "lng": 2.64}, 
  {"id": 20, "name": "INCA", "lat": 39.721, "lng": 2.91}, 
  {"id": 21, "name": "SON FERRIOL", "lat": 39.567, "lng": 2.716}, 
  {"id": 22, "name": "FESTIVAL PARK", "lat": 39.64, "lng": 2.738}, 
  {"id": 23, "name": "PORTO CRISTO/ CALA MANDIA", "lat": 39.54, "lng": 3.333}, 
  {"id": 24, "name": "LLUCMAJOR", "lat": 39.49, "lng": 2.895}, 
  {"id": 25, "name": "MANACOR", "lat": 39.569, "lng": 3.209}, 
  {"id": 26, "name": "PORTO COLOM", "lat": 39.416, "lng": 3.264}, 
  {"id": 27, "name": "VALLDEMOSA", "lat": 39.713, "lng": 2.622}, 
  {"id": 28, "name": "COLONIA SANT PERE", "lat": 39.736, "lng": 3.277}, 
  {"id": 29, "name": "ESPORLES", "lat": 39.669, "lng": 2.579}, 
  {"id": 30, "name": "MONTUIRI", "lat": 39.569, "lng": 2.984}, 
  {"id": 31, "name": "SANTANYI", "lat": 39.355, "lng": 3.13}, 
  {"id": 32, "name": "CALVIA", "lat": 39.565, "lng": 2.506}, 
  {"id": 33, "name": "CAMPOS", "lat": 39.432, "lng": 3.019}, 
  {"id": 34, "name": "CANYAMEL", "lat": 39.655, "lng": 3.45}
];

const INITIAL_DATA: DashboardData = {
  source_file: "DDD.xls",
  generated_at: "2026-02-19 11:02:57",
  min_fecha: "2025-01-02",
  max_fecha: "2025-01-31",
  total_pedidos: 63232,
  total_kilos: 410577.12,
  total_euros: 587463.04,
  total_bultos: 45643.0,
  months: ["2025-01", "2025-02", "2025-03", "2025-04", "2025-05", "2025-06", "2025-07", "2025-08", "2025-09", "2025-10", "2025-11", "2025-12"],
  weekdays: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"],
  zones: INITIAL_ZONES,
  daily_all: [
    {"Fecha": "2025-01-02", "Pedidos": 57, "Kilos": 468.9, "Euros": 835.51, "Bultos": 50}, 
    {"Fecha": "2025-01-03", "Pedidos": 118, "Kilos": 822.8, "Euros": 1727.81, "Bultos": 112}, 
    {"Fecha": "2025-01-07", "Pedidos": 176, "Kilos": 1063.8, "Euros": 1786.13, "Bultos": 137}, 
    {"Fecha": "2025-01-08", "Pedidos": 128, "Kilos": 627.7, "Euros": 1121.41, "Bultos": 67}, 
    {"Fecha": "2025-01-09", "Pedidos": 89, "Kilos": 642.4, "Euros": 1193.8, "Bultos": 73}, 
    {"Fecha": "2025-01-10", "Pedidos": 104, "Kilos": 627.9, "Euros": 1411.12, "Bultos": 84}
  ],
  daily_zone: [
    {"Fecha": "2025-01-02", "Zona": 0, "ZonaNombre": "PALMA", "DiaSemanaN": 3, "DiaSemana": "Jueves", "Mes": "2025-01", "Pedidos": 25, "Kilos": 183.2, "Euros": 324.46, "Bultos": 17}, 
    {"Fecha": "2025-01-02", "Zona": 1, "ZonaNombre": "POLLENÇA", "DiaSemanaN": 3, "DiaSemana": "Jueves", "Mes": "2025-01", "Pedidos": 3, "Kilos": 35.0, "Euros": 90.71, "Bultos": 5},
    {"Fecha": "2025-01-03", "Zona": 0, "ZonaNombre": "PALMA", "DiaSemanaN": 4, "DiaSemana": "Viernes", "Mes": "2025-01", "Pedidos": 34, "Kilos": 137.7, "Euros": 320.98, "Bultos": 24},
    {"Fecha": "2025-01-03", "Zona": 9, "ZonaNombre": "ARENAL", "DiaSemanaN": 4, "DiaSemana": "Viernes", "Mes": "2025-01", "Pedidos": 14, "Kilos": 119.6, "Euros": 213.39, "Bultos": 14}
  ]
};
const EMPTY_DATA: DashboardData = {
  source_file: "Ninguno",
  generated_at: "-",
  min_fecha: "",
  max_fecha: "",
  total_pedidos: 0,
  total_kilos: 0,
  total_euros: 0,
  total_bultos: 0,
  months: [],
  weekdays: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"],
  zones: INITIAL_ZONES,
  daily_all: [],
  daily_zone: []
};

const rebuildZones = (localData: DailyZoneRecord[]): Zone[] => {
  const uniqueZoneIds = new Set(localData.map(d => d.Zona));
  const activeZones: Zone[] = [...INITIAL_ZONES];
  
  let unknownOffset = 0;
  uniqueZoneIds.forEach(zid => {
    if (!activeZones.find(z => z.id === zid)) {
      const name = localData.find(d => d.Zona === zid)?.ZonaNombre || `Zona ${zid}`;
      activeZones.push({
        id: zid,
        name: name,
        lat: 39.6167 + (unknownOffset * 0.03), // Offset slightly from center of Mallorca
        lng: 2.9833 + (unknownOffset * 0.03)
      });
      unknownOffset++;
    }
  });
  return activeZones;
};

// --- Components ---

const Card = ({ title, children, className, headerAction }: { title: string, children: React.ReactNode, className?: string, headerAction?: React.ReactNode }) => (
  <div className={cn("bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden", className)}>
    <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
      <h3 className="font-semibold text-slate-800 flex items-center gap-2">
        {title}
      </h3>
      {headerAction}
    </div>
    <div className="p-5">
      {children}
    </div>
  </div>
);

const KPI = ({ label, value, icon: Icon, color }: { label: string, value: string | number, icon: any, color: string }) => (
  <div className="bg-white border border-slate-200 p-4 rounded-xl flex flex-col gap-1 shadow-sm">
    <div className="flex justify-between items-start">
      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</span>
      <Icon size={16} className={color} />
    </div>
    <div className="text-xl font-bold font-mono text-slate-900 tracking-tight">{value}</div>
  </div>
);

// --- IndexedDB Helper Functions ---
const DB_NAME = 'LogisticaDB';
const STORE_NAME = 'DailyData';

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: ['Fecha', 'Zona'] });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const saveToDB = async (data: DailyZoneRecord[]) => {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  data.forEach(item => store.put(item));
  return new Promise((resolve) => { tx.oncomplete = () => resolve(true); });
};

const loadFromDB = async (): Promise<DailyZoneRecord[]> => {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const request = store.getAll();
  return new Promise((resolve) => { request.onsuccess = () => resolve(request.result); });
};

const clearLocalDB = async () => {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  store.clear();
  return new Promise((resolve) => { tx.oncomplete = () => resolve(true); });
};

export default function App() {
  const [data, setData] = useState<DashboardData>(EMPTY_DATA);
  const [filters, setFilters] = useState({
    month: 'ALL',
    dateFrom: EMPTY_DATA.min_fecha,
    dateTo: EMPTY_DATA.max_fecha,
    dow: 'ALL',
    mapMode: 'range' as 'range' | 'day'
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0 });
  const [isDbLoading, setIsDbLoading] = useState(true);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'alert' | 'confirm';
    onConfirm?: () => void;
  }>({ isOpen: false, title: '', message: '', type: 'alert' });

  const showAlert = (title: string, message: string) => {
    setModalConfig({ isOpen: true, title, message, type: 'alert' });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setModalConfig({ isOpen: true, title, message, type: 'confirm', onConfirm });
  };

  const closeModal = () => {
    setModalConfig(prev => ({ ...prev, isOpen: false }));
  };
  
  const leafletMap = useRef<L.Map | null>(null);
  const layerGroup = useRef<L.LayerGroup | null>(null);

  const mapRef = useCallback((node: HTMLDivElement | null) => {
    if (node !== null && !leafletMap.current) {
      leafletMap.current = L.map(node, { zoomControl: true }).setView([39.62, 2.95], 9);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap'
      }).addTo(leafletMap.current);
      
      layerGroup.current = L.layerGroup().addTo(leafletMap.current);
      setIsMapReady(true);

      // Fix for map tiles not loading correctly in some containers
      setTimeout(() => {
        leafletMap.current?.invalidateSize();
      }, 100);
    } else if (node === null && leafletMap.current) {
      leafletMap.current.remove();
      leafletMap.current = null;
      layerGroup.current = null;
      setIsMapReady(false);
    }
  }, []);
  const chartRef = useRef<HTMLDivElement>(null);

  // Load data from IndexedDB on mount
  useEffect(() => {
    const init = async () => {
      try {
        const localData = await loadFromDB();
        if (localData && localData.length > 0) {
          const dailyAllMap: Record<string, DailyRecord> = {};
          const months = new Set<string>();
          
          localData.forEach(dz => {
            if (!dailyAllMap[dz.Fecha]) {
              dailyAllMap[dz.Fecha] = { Fecha: dz.Fecha, Pedidos: 0, Kilos: 0, Euros: 0, Bultos: 0 };
            }
            dailyAllMap[dz.Fecha].Pedidos += dz.Pedidos;
            dailyAllMap[dz.Fecha].Kilos += dz.Kilos;
            dailyAllMap[dz.Fecha].Euros += dz.Euros;
            dailyAllMap[dz.Fecha].Bultos += dz.Bultos;
            months.add(dz.Mes);
          });

          const dailyAll = Object.values(dailyAllMap).sort((a, b) => a.Fecha.localeCompare(b.Fecha));
          const dynamicZones = rebuildZones(localData);
          
          setData({
            ...EMPTY_DATA,
            source_file: "Base de Datos Local",
            generated_at: "Cargado desde memoria",
            min_fecha: dailyAll[0]?.Fecha || "",
            max_fecha: dailyAll[dailyAll.length - 1]?.Fecha || "",
            total_pedidos: dailyAll.reduce((s, r) => s + r.Pedidos, 0),
            total_kilos: dailyAll.reduce((s, r) => s + r.Kilos, 0),
            total_euros: dailyAll.reduce((s, r) => s + r.Euros, 0),
            total_bultos: dailyAll.reduce((s, r) => s + r.Bultos, 0),
            months: Array.from(months).sort(),
            zones: dynamicZones,
            daily_all: dailyAll,
            daily_zone: localData
          });

          setFilters(prev => ({
            ...prev,
            dateFrom: dailyAll[0]?.Fecha || "",
            dateTo: dailyAll[dailyAll.length - 1]?.Fecha || ""
          }));
          setSelectedDate(dailyAll[dailyAll.length - 1]?.Fecha || null);
        }
      } catch (e) {
        console.error("Error loading local DB", e);
      } finally {
        setIsDbLoading(false);
      }
    };
    init();
  }, []);

  // --- AI Analysis ---
  const handleAIAnalysis = async () => {
    if (!process.env.GEMINI_API_KEY) {
      showAlert("Falta API Key", "No se ha configurado la API Key de Gemini.");
      return;
    }

    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      // Prepare a summary for the AI
      const summary = {
        total_kilos: data.total_kilos,
        total_pedidos: data.total_pedidos,
        top_zones: topZones.map(z => ({ name: z.ZonaNombre, kilos: z.Kilos, pedidos: z.Pedidos })),
        weekday_stats: weekdayAggregation.map(w => ({ day: w.DiaSemana, kilos: w.Kilos })),
        period: `${data.min_fecha} a ${data.max_fecha}`
      };

      const prompt = `Analiza los siguientes datos de logística de una empresa de distribución de frutas y verduras en Mallorca:
      - Periodo: ${summary.period}
      - Total Kilos: ${summary.total_kilos.toLocaleString()} kg
      - Total Pedidos: ${summary.total_pedidos.toLocaleString()}
      - Top 5 Zonas por Kilos: ${summary.top_zones.slice(0, 5).map(z => `${z.name} (${z.kilos.toLocaleString()} kg)`).join(', ')}
      - Rendimiento por día: ${summary.weekday_stats.map(w => `${w.day}: ${w.kilos.toLocaleString()} kg`).join(', ')}

      Por favor, proporciona:
      1. Un resumen ejecutivo rápido.
      2. Identificación de la zona más crítica o rentable.
      3. Recomendación logística para optimizar rutas o personal basándote en los días de mayor carga.
      4. Una curiosidad o tendencia que observes.
      
      Responde en español, con un tono profesional pero cercano, usando markdown para el formato.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      setAiAnalysis(response.text || "No se pudo generar el análisis.");
    } catch (error) {
      console.error("Error en análisis IA:", error);
      setAiAnalysis("Error al conectar con la IA. Por favor, inténtalo de nuevo.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // --- Data Processing ---
  
  const filteredDailyZone = useMemo(() => {
    let rows = data.daily_zone;
    if (filters.dateFrom) rows = rows.filter(r => r.Fecha >= filters.dateFrom);
    if (filters.dateTo) rows = rows.filter(r => r.Fecha <= filters.dateTo);
    if (filters.dow !== 'ALL') rows = rows.filter(r => r.DiaSemana === filters.dow);
    return rows;
  }, [data.daily_zone, filters.dateFrom, filters.dateTo, filters.dow]);

  const mapRows = useMemo(() => {
    if (filters.mapMode === 'day') {
      if (!selectedDate) return [];
      return filteredDailyZone.filter(r => r.Fecha === selectedDate);
    }
    return filteredDailyZone;
  }, [filteredDailyZone, filters.mapMode, selectedDate]);

  const zoneAggregation = useMemo(() => {
    const agg: Record<string, { Pedidos: number, Kilos: number, Euros: number, Bultos: number, ZonaNombre: string }> = {};
    mapRows.forEach(r => {
      const zid = String(r.Zona);
      if (!agg[zid]) agg[zid] = { Pedidos: 0, Kilos: 0, Euros: 0, Bultos: 0, ZonaNombre: r.ZonaNombre };
      agg[zid].Pedidos += r.Pedidos;
      agg[zid].Kilos += r.Kilos;
      agg[zid].Euros += r.Euros;
      agg[zid].Bultos += r.Bultos;
    });
    return agg;
  }, [mapRows]);

  const weekdayAggregation = useMemo(() => {
    const agg: Record<string, { Pedidos: number, Kilos: number, Euros: number, Bultos: number }> = {};
    filteredDailyZone.forEach(r => {
      const d = r.DiaSemana;
      if (!agg[d]) agg[d] = { Pedidos: 0, Kilos: 0, Euros: 0, Bultos: 0 };
      agg[d].Pedidos += r.Pedidos;
      agg[d].Kilos += r.Kilos;
      agg[d].Euros += r.Euros;
      agg[d].Bultos += r.Bultos;
    });
    return data.weekdays.map(d => {
      const stats = agg[d] || { Pedidos: 0, Kilos: 0, Euros: 0, Bultos: 0 };
      return {
        DiaSemana: d,
        Pedidos: stats.Pedidos,
        Kilos: stats.Kilos,
        Euros: stats.Euros,
        Bultos: stats.Bultos
      };
    });
  }, [filteredDailyZone, data.weekdays]);

  const topZones = useMemo(() => {
    return Object.entries(zoneAggregation)
      .map(([zid, a]: [string, any]) => ({
        id: parseInt(zid),
        Pedidos: a.Pedidos,
        Kilos: a.Kilos,
        Euros: a.Euros,
        Bultos: a.Bultos,
        ZonaNombre: a.ZonaNombre
      }))
      .sort((a, b) => b.Kilos - a.Kilos)
      .slice(0, 20);
  }, [zoneAggregation]);

  // --- Effects ---

  // Map initialization is handled by mapRef callback

  // Update Map Markers
  useEffect(() => {
    if (!isMapReady || !leafletMap.current || !layerGroup.current) return;

    layerGroup.current.clearLayers();
    
    const activeZones = data.zones.filter(z => {
      const a = zoneAggregation[String(z.id)];
      return a && (a.Kilos > 0 || a.Pedidos > 0);
    });

    const valsKilos = activeZones.map(z => zoneAggregation[String(z.id)].Kilos);
    const vmaxKilos = valsKilos.length > 0 ? Math.max(...valsKilos) : 0;
    
    const valsPedidos = activeZones.map(z => zoneAggregation[String(z.id)].Pedidos);
    const vmaxPedidos = valsPedidos.length > 0 ? Math.max(...valsPedidos) : 0;

    const useKilos = vmaxKilos > 0;
    const vmax = useKilos ? vmaxKilos : (vmaxPedidos > 0 ? vmaxPedidos : 1);

    const colorRamp = (t: number) => {
      t = Math.max(0, Math.min(1, t));
      // Use a more vibrant scale: Green (low) -> Yellow -> Orange -> Red (high)
      const h = 120 - (120 * t);
      return `hsl(${h}, 90%, 50%)`;
    };

    data.zones.forEach(z => {
      const a = zoneAggregation[String(z.id)];
      const kg = a ? a.Kilos : 0;
      const val = a ? (useKilos ? a.Kilos : a.Pedidos) : 0;
      
      // Calculate relative intensity
      const t = val / vmax;
      const col = val > 0 ? colorRamp(t) : "rgba(148,163,184,0.2)";
      
      // Radius logic: base 6px, max 40px
      const radius = val > 0 ? (8 + 32 * Math.pow(t, 0.5)) : 5;

      L.circleMarker([z.lat, z.lng], {
        radius: radius,
        weight: 2,
        opacity: 0.9,
        color: col,
        fillColor: col,
        fillOpacity: val > 0 ? 0.6 : 0.2
      })
      .bindPopup(`
        <div class="text-slate-900 font-sans">
          <div class="font-bold border-b pb-1 mb-1">${String(z.id).padStart(2, "0")} — ${z.name}</div>
          <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <span class="text-slate-500">Kilos:</span> <span class="font-mono font-bold">${kg.toLocaleString()} kg</span>
            <span class="text-slate-500">Pedidos:</span> <span class="font-mono">${a?.Pedidos || 0}</span>
            <span class="text-slate-500">Bultos:</span> <span class="font-mono">${Math.round(a?.Bultos || 0)}</span>
            <span class="text-slate-500">Euros:</span> <span class="font-mono">${(a?.Euros || 0).toLocaleString()} €</span>
          </div>
        </div>
      `)
      .addTo(layerGroup.current!);
    });
  }, [zoneAggregation, data.zones, isMapReady]);

  // Initialize/Update Daily Chart
  useEffect(() => {
    if (!chartRef.current) return;

    const weekdayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

    const recs = data.daily_all
      .filter(r => (!filters.dateFrom || r.Fecha >= filters.dateFrom) && (!filters.dateTo || r.Fecha <= filters.dateTo))
      .sort((a, b) => a.Fecha.localeCompare(b.Fecha));

    if (recs.length === 0) {
      Plotly.purge(chartRef.current);
      return;
    }

    const x = recs.map(r => r.Fecha);
    const yP = recs.map(r => r.Pedidos);
    const yK = recs.map(r => r.Kilos);
    const dayNames = recs.map(r => {
      const dateObj = new Date(r.Fecha);
      return weekdayNames[dateObj.getDay()];
    });

    // Calculate colors based on DOW filter
    const barColors = recs.map(r => {
      if (filters.dow === 'ALL') return 'rgba(249, 115, 22, 0.2)';
      const dateObj = new Date(r.Fecha);
      const dayName = weekdayNames[dateObj.getDay()];
      return dayName === filters.dow ? 'rgba(249, 115, 22, 0.8)' : 'rgba(249, 115, 22, 0.15)';
    });

    const barLineColors = recs.map(r => {
      if (filters.dow === 'ALL') return 'rgb(249, 115, 22)';
      const dateObj = new Date(r.Fecha);
      const dayName = weekdayNames[dateObj.getDay()];
      return dayName === filters.dow ? 'rgb(249, 115, 22)' : 'rgba(249, 115, 22, 0.4)';
    });

    const scatterColors = recs.map(r => {
      if (filters.dow === 'ALL') return '#0ea5e9';
      const dateObj = new Date(r.Fecha);
      const dayName = weekdayNames[dateObj.getDay()];
      return dayName === filters.dow ? '#0ea5e9' : 'rgba(14, 165, 233, 0.3)';
    });

    Plotly.newPlot(chartRef.current, [
      {
        type: 'bar',
        name: 'Kg',
        x: x,
        y: yK,
        yaxis: 'y2',
        customdata: dayNames,
        marker: { 
          color: barColors, 
          line: { color: barLineColors, width: 1 } 
        },
        hovertemplate: '<b>%{customdata}</b> %{x}<br>Kg: %{y:.1f}<extra></extra>'
      },
      {
        type: 'scatter',
        mode: 'lines+markers',
        name: 'Pedidos',
        x: x,
        y: yP,
        customdata: dayNames,
        line: { color: 'rgba(14, 165, 233, 0.4)', width: 1 },
        marker: { 
          size: recs.map(r => {
            if (filters.dow === 'ALL') return 4;
            const dateObj = new Date(r.Fecha);
            const dayName = weekdayNames[dateObj.getDay()];
            return dayName === filters.dow ? 8 : 2;
          }), 
          color: scatterColors 
        },
        hovertemplate: '<b>%{customdata}</b> %{x}<br>Pedidos: %{y}<extra></extra>'
      }
    ], {
      margin: { l: 40, r: 40, t: 10, b: 40 },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      font: { color: '#64748b', size: 9 },
      xaxis: { gridcolor: '#f1f5f9', zeroline: false, tickfont: { size: 8 } },
      yaxis: { title: 'Pedidos', gridcolor: '#f1f5f9', zeroline: false, side: 'left' },
      yaxis2: { title: 'Kg', overlaying: 'y', side: 'right', showgrid: false, zeroline: false },
      legend: { orientation: 'h', y: 1.1, x: 0.5, xanchor: 'center' },
      hovermode: 'x unified',
      barmode: 'overlay'
    }, { displayModeBar: false, responsive: true });

    (chartRef.current as any).on('plotly_click', (ev: any) => {
      const d = ev.points?.[0]?.x;
      if (d) setSelectedDate(d);
    });

    if (recs.length > 0) {
      const isValid = selectedDate && recs.some(r => r.Fecha === selectedDate);
      if (!isValid) {
        setSelectedDate(recs[recs.length - 1].Fecha);
      }
    } else if (selectedDate) {
      setSelectedDate(null);
    }
  }, [data.daily_all, filters.dateFrom, filters.dateTo, filters.dow]);

  // --- Handlers ---

  const handleClearData = async () => {
    showConfirm(
      "Borrar datos",
      "¿Estás seguro de que quieres borrar TODOS los datos guardados en este navegador?",
      async () => {
        await clearLocalDB();
        setData(EMPTY_DATA);
        setFilters({
          ...filters,
          dateFrom: "",
          dateTo: "",
          month: 'ALL',
          dow: 'ALL'
        });
        setSelectedDate(null);
        closeModal();
      }
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setProcessingProgress({ current: 0, total: files.length });

    const processFile = (file: File): Promise<DailyZoneRecord[]> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const data_buffer = evt.target?.result;
            const wb = XLSX.read(data_buffer, { type: 'array', cellDates: true });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const rawData = XLSX.utils.sheet_to_json(ws) as any[];

            if (rawData.length === 0) {
              resolve([]);
              return;
            }

            const dailyZoneMap: Record<string, DailyZoneRecord> = {};
            const months = new Set<string>();

            const parseNumber = (val: any): number => {
              if (typeof val === 'number') return val;
              if (typeof val === 'string') {
                // Handle Spanish format "1.234,56" -> "1234.56"
                if (val.includes(',') && val.includes('.') && val.indexOf(',') > val.indexOf('.')) {
                  const clean = val.replace(/\./g, '').replace(',', '.');
                  return parseFloat(clean) || 0;
                }
                // Handle English format "1,234.56" -> "1234.56"
                if (val.includes(',') && val.includes('.') && val.indexOf('.') > val.indexOf(',')) {
                  const clean = val.replace(/,/g, '');
                  return parseFloat(clean) || 0;
                }
                // Handle simple comma decimal "1234,56" -> "1234.56"
                if (val.includes(',') && !val.includes('.')) {
                  const clean = val.replace(',', '.');
                  return parseFloat(clean) || 0;
                }
                return parseFloat(val) || 0;
              }
              return 0;
            };

            const getVal = (row: any, keys: string[]) => {
              for (const key of keys) {
                if (row[key] !== undefined && row[key] !== null) return row[key];
                const foundKey = Object.keys(row).find(k => {
                  const normalizedK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
                  const normalizedTarget = key.toLowerCase().replace(/[^a-z0-9]/g, '');
                  return normalizedK === normalizedTarget || normalizedK.includes(normalizedTarget);
                });
                if (foundKey) return row[foundKey];
              }
              return undefined;
            };

            const uniqueOrders = new Set<string>();

            rawData.forEach((row: any) => {
              let rawDate = getVal(row, ['Fecha', 'FECHA', 'Date', 'Día', 'Day', 'Fec']);
              let dateStr = "";

              if (rawDate instanceof Date) {
                dateStr = rawDate.toISOString().split('T')[0];
              } else if (typeof rawDate === 'number') {
                // Excel serial date
                const date = new Date((rawDate - 25569) * 86400 * 1000);
                if (!isNaN(date.getTime())) dateStr = date.toISOString().split('T')[0];
              } else if (typeof rawDate === 'string' && rawDate.trim()) {
                const cleanDate = rawDate.trim();
                // Try YYYY-MM-DD
                if (/^\d{4}-\d{2}-\d{2}/.test(cleanDate)) {
                  dateStr = cleanDate.slice(0, 10);
                } else {
                  const parts = cleanDate.split(/[\/\-\.]/);
                  if (parts.length === 3) {
                    // Try DD/MM/YYYY or MM/DD/YYYY
                    let d, m, y;
                    if (parts[2].length === 4) {
                      y = parseInt(parts[2]);
                      // We try to guess if it's DD/MM or MM/DD
                      const p0 = parseInt(parts[0]);
                      const p1 = parseInt(parts[1]);
                      if (p0 > 12) { // Must be DD/MM/YYYY
                        d = p0; m = p1;
                      } else if (p1 > 12) { // Must be MM/DD/YYYY
                        m = p0; d = p1;
                      } else { // Ambiguous, assume DD/MM/YYYY (European)
                        d = p0; m = p1;
                      }
                      const dateObj = new Date(y, m - 1, d);
                      if (!isNaN(dateObj.getTime())) dateStr = dateObj.toISOString().split('T')[0];
                    } else if (parts[0].length === 4) { // YYYY/MM/DD
                      y = parseInt(parts[0]); m = parseInt(parts[1]); d = parseInt(parts[2]);
                      const dateObj = new Date(y, m - 1, d);
                      if (!isNaN(dateObj.getTime())) dateStr = dateObj.toISOString().split('T')[0];
                    }
                  }
                }
              }
              
              if (!dateStr || dateStr === "NaN-NaN-NaN") return;

              let dateObj = new Date(dateStr);
              if (dateObj.getDay() === 0) {
                dateObj.setDate(dateObj.getDate() - 1);
                dateStr = dateObj.toISOString().split('T')[0];
              }
              
              const mes = dateStr.slice(0, 7);
              months.add(mes);
              
              const zonaRaw = getVal(row, ['Zona', 'ZONA', 'IdZona', 'Ruta', 'RUTA', 'Nombre Zona', 'CodZona']);
              let zonaId = parseInt(zonaRaw);
              let zonaName = String(zonaRaw || '').toUpperCase().trim();
              
              if (isNaN(zonaId)) {
                if (!zonaName) return; // Skip if no zone info
                const found = INITIAL_ZONES.find(z => z.name.toUpperCase() === zonaName || zonaName.includes(z.name.toUpperCase()) || z.name.toUpperCase().includes(zonaName));
                if (found) {
                  zonaId = found.id;
                } else {
                  // Generate a deterministic ID for unknown string zones (e.g. > 1000)
                  zonaId = 1000 + Array.from(zonaName).reduce((acc, char) => acc + char.charCodeAt(0), 0);
                }
              } else {
                // If it's a number, use it directly. The rebuildZones function will handle it if it's not in INITIAL_ZONES.
                if (!zonaName) zonaName = `Zona ${zonaId}`;
              }

              const albaran = String(getVal(row, ['Albaran', 'ALBARAN', 'Albarán', 'Pedido', 'Nº Pedido', 'Referencia', 'Doc']) || '');
              const kilos = parseNumber(getVal(row, ['Cantidad', 'CANTIDAD', 'Kilos', 'Kg', 'Peso', 'PESO', 'Cant']));
              const euros = parseNumber(getVal(row, ['Importe Bruto', 'IMPORTE BRUTO', 'Importe', 'Euros', 'Venta', 'VENTA', 'Total']));
              const bultos = parseNumber(getVal(row, ['Bultos', 'BULTOS', 'Paquetes', 'Bul']));

              const dzKey = `${dateStr}_${zonaId}`;
              const orderKey = albaran ? `${dateStr}_${zonaId}_${albaran}` : null;

              if (!dailyZoneMap[dzKey]) {
                const weekdayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
                const zonaInfo = INITIAL_ZONES.find(z => z.id === zonaId);
                dailyZoneMap[dzKey] = {
                  Fecha: dateStr,
                  Zona: zonaId,
                  ZonaNombre: zonaInfo ? zonaInfo.name : (zonaName || `Zona ${String(zonaId).padStart(2, '0')}`),
                  Pedidos: 0,
                  Kilos: 0,
                  Euros: 0,
                  Bultos: 0,
                  DiaSemanaN: dateObj.getDay(),
                  DiaSemana: weekdayNames[dateObj.getDay()],
                  Mes: mes
                };
              }

              if (orderKey) {
                if (!uniqueOrders.has(orderKey)) {
                  dailyZoneMap[dzKey].Pedidos += 1;
                  uniqueOrders.add(orderKey);
                }
              } else {
                if (kilos > 0) dailyZoneMap[dzKey].Pedidos += 0.05;
              }

              dailyZoneMap[dzKey].Kilos += kilos;
              dailyZoneMap[dzKey].Euros += euros;
              dailyZoneMap[dzKey].Bultos += bultos;
            });

            Object.values(dailyZoneMap).forEach(dz => {
              dz.Pedidos = Math.max(1, Math.round(dz.Pedidos));
            });

            resolve(Object.values(dailyZoneMap));
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = () => reject(new Error("Error al leer el archivo"));
        reader.readAsArrayBuffer(file);
      });
    };

    try {
      let allNewRecords: DailyZoneRecord[] = [];
      for (let i = 0; i < files.length; i++) {
        setProcessingProgress({ current: i + 1, total: files.length });
        const records = await processFile(files[i]);
        allNewRecords = [...allNewRecords, ...records];
      }

      if (allNewRecords.length === 0) {
        showAlert("Sin datos", "No se encontraron datos válidos en los archivos seleccionados.");
        setIsProcessing(false);
        return;
      }

      // Save all new records to DB
      await saveToDB(allNewRecords);
      
      // Reload everything from DB to ensure consistency and merge
      const allLocalData = await loadFromDB();
      const mergedDailyAllMap: Record<string, DailyRecord> = {};
      const mergedMonths = new Set<string>();
      
      allLocalData.forEach(dz => {
        if (!mergedDailyAllMap[dz.Fecha]) {
          mergedDailyAllMap[dz.Fecha] = { Fecha: dz.Fecha, Pedidos: 0, Kilos: 0, Euros: 0, Bultos: 0 };
        }
        mergedDailyAllMap[dz.Fecha].Pedidos += dz.Pedidos;
        mergedDailyAllMap[dz.Fecha].Kilos += dz.Kilos;
        mergedDailyAllMap[dz.Fecha].Euros += dz.Euros;
        mergedDailyAllMap[dz.Fecha].Bultos += dz.Bultos;
        mergedMonths.add(dz.Mes);
      });

      const mergedDailyAll = Object.values(mergedDailyAllMap).sort((a, b) => a.Fecha.localeCompare(b.Fecha));
      const dynamicZones = rebuildZones(allLocalData);

      setData({
        ...data,
        source_file: files.length > 1 ? `${files.length} archivos importados` : files[0].name,
        generated_at: new Date().toLocaleString(),
        min_fecha: mergedDailyAll[0]?.Fecha || "",
        max_fecha: mergedDailyAll[mergedDailyAll.length - 1]?.Fecha || "",
        total_pedidos: mergedDailyAll.reduce((s, r) => s + r.Pedidos, 0),
        total_kilos: mergedDailyAll.reduce((s, r) => s + r.Kilos, 0),
        total_euros: mergedDailyAll.reduce((s, r) => s + r.Euros, 0),
        total_bultos: mergedDailyAll.reduce((s, r) => s + r.Bultos, 0),
        months: Array.from(mergedMonths).sort(),
        zones: dynamicZones,
        daily_all: mergedDailyAll,
        daily_zone: allLocalData
      });

      setFilters({
        ...filters,
        dateFrom: mergedDailyAll[0]?.Fecha || "",
        dateTo: mergedDailyAll[mergedDailyAll.length - 1]?.Fecha || ""
      });
      setSelectedDate(mergedDailyAll[mergedDailyAll.length - 1]?.Fecha || null);

    } catch (err) {
      console.error("Error processing files:", err);
      showAlert("Error", "Error al procesar los archivos Excel. Asegúrate de que el formato sea correcto.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (isDbLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
          <div className="text-slate-600 font-medium tracking-tight">Cargando base de datos local...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {isProcessing && (
        <div className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center font-sans">
          <div className="bg-white p-8 rounded-2xl shadow-2xl border border-slate-200 text-center max-w-sm mx-4">
            <div className="w-16 h-16 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin mx-auto mb-6" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">Procesando Datos</h3>
            <p className="text-slate-500 text-sm mb-4">Estamos analizando y guardando tus archivos en la base de datos local. Esto permite manejar millones de registros.</p>
            {processingProgress.total > 1 && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <span>Progreso</span>
                  <span>{processingProgress.current} / {processingProgress.total} archivos</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-full transition-all duration-300" 
                    style={{ width: `${(processingProgress.current / processingProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Header */}
      <header className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3 tracking-tight">
              Dashboard Rutas — Zonas (Kilos)
              {data.daily_zone.length > 0 && (
                <span className="bg-emerald-100 text-emerald-700 text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                  DB Local Activa
                </span>
              )}
            </h1>
            <div className="text-xs text-slate-500 mt-1.5 flex flex-wrap gap-x-5 gap-y-1 font-medium">
              <span className="flex items-center gap-1.5">Fuente: <b className="text-slate-700">{data.source_file}</b></span>
              <span className="flex items-center gap-1.5">Registros: <b className="text-slate-700">{data.daily_zone.length.toLocaleString()}</b></span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={handleAIAnalysis}
              disabled={isAnalyzing}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-medium text-sm shadow-sm border",
                isAnalyzing 
                  ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" 
                  : "bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-500"
              )}
            >
              {isAnalyzing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <BrainCircuit size={16} />}
              Análisis IA
            </button>
            <button 
              onClick={handleClearData}
              className="flex items-center gap-2 bg-white hover:bg-red-50 text-red-600 px-4 py-2 rounded-xl transition-all border border-red-100 font-medium text-sm shadow-sm"
            >
              <Trash2 size={16} />
              Borrar Datos
            </button>
            <label className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl cursor-pointer transition-all border border-slate-200 font-medium text-sm shadow-sm">
              <Upload size={16} />
              Importar Excel(s)
              <input type="file" className="hidden" accept=".xls,.xlsx" multiple onChange={handleFileUpload} />
            </label>
          </div>
        </div>

        {/* Summary Bar */}
        <div className="bg-white border border-slate-200 rounded-xl px-5 py-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm shadow-sm">
          <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Totales</span>
          <span className="text-slate-900 font-bold">{data.total_pedidos.toLocaleString()} <span className="text-slate-400 font-normal">pedidos</span></span>
          <span className="text-slate-200">|</span>
          <span className="text-slate-900 font-bold">{data.total_kilos.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-slate-400 font-normal">kg</span></span>
          <span className="text-slate-200">|</span>
          <span className="text-slate-900 font-bold">{data.total_bultos.toLocaleString()} <span className="text-slate-400 font-normal">bultos</span></span>
          <span className="text-slate-200">|</span>
          <span className="text-slate-900 font-bold">{data.total_euros.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-slate-400 font-normal">€</span></span>
          <span className="text-slate-200">|</span>
          <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Rango</span>
          <span className="font-mono text-slate-700 font-semibold">{data.min_fecha} → {data.max_fecha}</span>
        </div>
      </header>

      {/* Filters Bar (Sticky) */}
      <div className="sticky top-4 z-[100] bg-white/80 backdrop-blur-md border border-slate-200 rounded-xl p-3 flex flex-wrap items-center gap-6 shadow-lg">
          <div className="flex items-center gap-3">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mes</label>
            <select 
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-sky-500/50 transition-all"
              value={filters.month}
              onChange={(e) => {
                const val = e.target.value;
                if (val !== 'ALL') {
                  const rows = data.daily_all.filter(r => r.Fecha.startsWith(val));
                  if (rows.length) {
                    setFilters({ ...filters, month: val, dateFrom: rows[0].Fecha, dateTo: rows[rows.length-1].Fecha });
                    return;
                  }
                }
                setFilters({ ...filters, month: val, dateFrom: data.min_fecha, dateTo: data.max_fecha });
              }}
            >
              <option value="ALL">Todos los meses</option>
              {data.months.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rango</label>
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 outline-none focus:border-sky-500/50"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value, month: 'ALL' })}
              />
              <span className="text-slate-300">→</span>
              <input 
                type="date" 
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 outline-none focus:border-sky-500/50"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value, month: 'ALL' })}
              />
              <button 
                onClick={() => setFilters({ ...filters, dateFrom: data.min_fecha, dateTo: data.max_fecha, month: 'ALL' })}
                className="text-[10px] font-bold text-sky-500 hover:text-sky-700 px-1.5 py-0.5 rounded hover:bg-sky-50 transition-all border border-sky-100"
                title="Usar rango máximo disponible"
              >
                MAX
              </button>
              <select 
                className="bg-white/50 border border-slate-200 rounded-lg px-2 py-1 text-[10px] text-slate-500 outline-none focus:border-sky-500/50"
                value=""
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val || !data.max_fecha) return;
                  const end = new Date(data.max_fecha);
                  let start = new Date(data.max_fecha);
                  if (val === '7d') start.setDate(end.getDate() - 7);
                  if (val === '15d') start.setDate(end.getDate() - 15);
                  if (val === '30d') start.setDate(end.getDate() - 30);
                  
                  setFilters({ 
                    ...filters, 
                    dateFrom: start.toISOString().split('T')[0], 
                    dateTo: data.max_fecha,
                    month: 'ALL'
                  });
                }}
              >
                <option value="">Presets...</option>
                <option value="7d">Últimos 7 días</option>
                <option value="15d">Últimos 15 días</option>
                <option value="30d">Últimos 30 días</option>
              </select>
              <button 
                onClick={() => setFilters({ ...filters, dateFrom: '', dateTo: '', month: 'ALL' })}
                className="text-slate-300 hover:text-red-400 transition-all"
                title="Limpiar fechas"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Día</label>
            <select 
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-sky-500/50 transition-all"
              value={filters.dow}
              onChange={(e) => setFilters({ ...filters, dow: e.target.value })}
            >
              <option value="ALL">Todos los días</option>
              {data.weekdays.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mapa</label>
            <div className="flex bg-white/50 p-1 rounded-lg border border-slate-200">
              <button 
                className={cn("px-3 py-1 text-[10px] rounded-md transition-all font-medium", filters.mapMode === 'range' ? "bg-white text-slate-900 shadow-sm border border-slate-200" : "text-slate-400")}
                onClick={() => setFilters({ ...filters, mapMode: 'range' })}
              >
                Rango
              </button>
              <button 
                className={cn("px-3 py-1 text-[10px] rounded-md transition-all font-medium", filters.mapMode === 'day' ? "bg-white text-slate-900 shadow-sm border border-slate-200" : "text-slate-400")}
                onClick={() => setFilters({ ...filters, mapMode: 'day' })}
              >
                Día
              </button>
            </div>
          </div>
          <div className="flex-1" />
          <button 
            onClick={() => {
              setFilters({
                month: 'ALL',
                dateFrom: data.min_fecha,
                dateTo: data.max_fecha,
                dow: 'ALL',
                mapMode: 'range'
              });
              setSelectedDate(null);
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200"
          >
            <RotateCcw size={14} />
            Restablecer
          </button>
      </div>

      <div className="space-y-6">
        {/* AI Analysis Section */}
        <AnimatePresence>
          {aiAnalysis && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card 
                title="Análisis Inteligente (Gemini AI)" 
                headerAction={<Sparkles size={16} className="text-indigo-400" />}
                className="border-indigo-100 bg-indigo-50/30"
              >
                <div className="prose prose-slate prose-sm max-w-none">
                  <div className="markdown-body">
                    <Markdown>{aiAnalysis}</Markdown>
                  </div>
                </div>
                <button 
                  onClick={() => setAiAnalysis(null)}
                  className="mt-4 text-xs text-indigo-500 hover:text-indigo-700 font-medium"
                >
                  Cerrar análisis
                </button>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Map Section */}
        <Card title="Distribución Geográfica" headerAction={<MapIcon size={16} className="text-slate-300" />}>
          <div className="relative">
            <div ref={mapRef} className="h-[750px] w-full rounded-xl z-0 border border-slate-100" />
            
            {filters.mapMode === 'day' && (
              <div className="absolute top-4 right-4 z-[1000] flex flex-col items-end gap-2">
                {selectedDate ? (
                  <div className="bg-white/90 backdrop-blur-md border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-mono text-slate-700 shadow-lg flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                    Mostrando: <span className="font-bold">{selectedDate}</span>
                  </div>
                ) : (
                  <div className="bg-orange-50 border border-orange-200 px-4 py-2 rounded-lg text-xs text-orange-700 shadow-lg flex items-center gap-2 animate-bounce">
                    <TrendingUp size={14} />
                    Haz clic en una barra del gráfico para ver ese día
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Charts and Tables Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Chart and Top Zones */}
          <div className="lg:col-span-7 space-y-6">
            <Card title="Día a día: Pedidos (izq) y Kg (der). Click para seleccionar día." headerAction={<TrendingUp size={16} className="text-slate-300" />}>
              <div ref={chartRef} className="h-[350px] w-full" />
            </Card>

            <Card title="Top zonas (por Kg)" headerAction={<MapPin size={16} className="text-slate-300" />}>
              <div className="max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                <table className="w-full text-sm text-left border-separate border-spacing-y-2">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="text-slate-400 border-b border-slate-100">
                      <th className="pb-2 font-medium uppercase text-[10px] tracking-wider">Zona</th>
                      <th className="pb-2 font-medium uppercase text-[10px] tracking-wider text-right">Pedidos</th>
                      <th className="pb-2 font-medium uppercase text-[10px] tracking-wider text-right">Kg</th>
                      <th className="pb-2 font-medium uppercase text-[10px] tracking-wider text-right">Bultos</th>
                      <th className="pb-2 font-medium uppercase text-[10px] tracking-wider text-right">€</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topZones.map(row => (
                      <tr key={row.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="py-3 border-t border-slate-100">
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] font-mono text-slate-300">{String(row.id).padStart(2, '0')} —</span>
                            <span className="font-bold text-slate-700 text-[11px] uppercase tracking-tight leading-tight">{row.ZonaNombre}</span>
                          </div>
                        </td>
                        <td className="py-3 text-right font-mono text-slate-500 text-[11px] border-t border-slate-100">{row.Pedidos.toLocaleString()}</td>
                        <td className="py-3 text-right font-mono text-slate-900 font-bold text-[11px] border-t border-slate-100">
                          {row.Kilos.toLocaleString(undefined, { minimumFractionDigits: 1 })}<br/>
                          <span className="text-[9px] text-slate-400 font-normal">kg</span>
                        </td>
                        <td className="py-3 text-right font-mono text-slate-500 text-[11px] border-t border-slate-100">{Math.round(row.Bultos).toLocaleString()}</td>
                        <td className="py-3 text-right font-mono text-slate-900 text-[11px] border-t border-slate-100">{row.Euros.toLocaleString(undefined, { minimumFractionDigits: 2 })} €</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Right Column: Weekday and Monthly Tables */}
          <div className="lg:col-span-5 space-y-6">
            <Card title="Totales por día de semana (Kg)" headerAction={<Calendar size={16} className="text-slate-300" />}>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-100">
                      <th className="py-2 font-medium uppercase text-[10px] tracking-wider">Día</th>
                      <th className="py-2 font-medium uppercase text-[10px] tracking-wider text-right">Pedidos</th>
                      <th className="py-2 font-medium uppercase text-[10px] tracking-wider text-right">Kg</th>
                      <th className="py-2 font-medium uppercase text-[10px] tracking-wider text-right">Bultos</th>
                      <th className="py-2 font-medium uppercase text-[10px] tracking-wider text-right">€</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {weekdayAggregation.map(row => (
                      <tr key={row.DiaSemana} className="hover:bg-slate-50 transition-colors group">
                        <td className="py-3 font-bold text-slate-700">{row.DiaSemana}</td>
                        <td className="py-3 text-right font-mono text-slate-500">{row.Pedidos.toLocaleString()}</td>
                        <td className="py-3 text-right font-mono text-slate-900">{row.Kilos.toLocaleString(undefined, { minimumFractionDigits: 1 })} kg</td>
                        <td className="py-3 text-right font-mono text-slate-500">{Math.round(row.Bultos).toLocaleString()}</td>
                        <td className="py-3 text-right font-mono text-slate-900">{row.Euros.toLocaleString(undefined, { minimumFractionDigits: 2 })} €</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card title="Totales por mes (Kg)" headerAction={<Calendar size={16} className="text-slate-300" />}>
              <div className="max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                <table className="w-full text-sm text-left">
                   <thead className="sticky top-0 bg-white z-10">
                    <tr className="text-slate-400 border-b border-slate-100">
                      <th className="py-2 font-medium uppercase text-[10px] tracking-wider">Mes</th>
                      <th className="py-2 font-medium uppercase text-[10px] tracking-wider text-right">Pedidos</th>
                      <th className="py-2 font-medium uppercase text-[10px] tracking-wider text-right">Kg</th>
                      <th className="py-2 font-medium uppercase text-[10px] tracking-wider text-right">Bultos</th>
                      <th className="py-2 font-medium uppercase text-[10px] tracking-wider text-right">€</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.months.map(m => {
                      const monthData = data.daily_all.filter(r => r.Fecha.startsWith(m));
                      const pedidos = monthData.reduce((s, r) => s + r.Pedidos, 0);
                      const kilos = monthData.reduce((s, r) => s + r.Kilos, 0);
                      const bultos = monthData.reduce((s, r) => s + r.Bultos, 0);
                      const euros = monthData.reduce((s, r) => s + r.Euros, 0);
                      return (
                        <tr key={m} className="hover:bg-slate-50 transition-colors group">
                          <td className="py-3 font-bold text-slate-700">{m}</td>
                          <td className="py-3 text-right font-mono text-slate-500">{pedidos.toLocaleString()}</td>
                          <td className="py-3 text-right font-mono text-slate-900">{kilos.toLocaleString(undefined, { minimumFractionDigits: 1 })} kg</td>
                          <td className="py-3 text-right font-mono text-slate-500">{Math.round(bultos).toLocaleString()}</td>
                          <td className="py-3 text-right font-mono text-slate-900">{euros.toLocaleString(undefined, { minimumFractionDigits: 2 })} €</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Processing Overlay */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center gap-4"
          >
            <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-white font-medium animate-pulse">Procesando archivo Excel...</p>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Custom Modal */}
      <AnimatePresence>
        {modalConfig.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center font-sans"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white p-6 rounded-2xl shadow-2xl border border-slate-200 text-center max-w-sm mx-4"
            >
              <h3 className="text-xl font-bold text-slate-900 mb-2">{modalConfig.title}</h3>
              <p className="text-slate-500 text-sm mb-6">{modalConfig.message}</p>
              
              <div className="flex gap-3 justify-center">
                {modalConfig.type === 'confirm' && (
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  onClick={() => {
                    if (modalConfig.type === 'confirm' && modalConfig.onConfirm) {
                      modalConfig.onConfirm();
                    } else {
                      closeModal();
                    }
                  }}
                  className={cn(
                    "px-4 py-2 rounded-xl font-medium transition-colors text-white",
                    modalConfig.type === 'confirm' ? "bg-red-500 hover:bg-red-600" : "bg-indigo-600 hover:bg-indigo-700"
                  )}
                >
                  {modalConfig.type === 'confirm' ? 'Borrar Todo' : 'Aceptar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
