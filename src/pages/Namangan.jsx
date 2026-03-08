import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Ikonkalarni sozlash
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
const redIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const namanganDevices = [
    { id: 1, name: "Namangan Central-Hub", pos: [41.0001, 71.6726], address: "Namangan sh., Do'stlik ko'chasi" },
    { id: 2, name: "Pop Transit-Node", pos: [40.8733, 71.1114], address: "Pop tumani, Xalqaro magistral yo'li" },
    { id: 3, name: "Chust Industrial-Zone", pos: [40.9833, 71.3000], address: "Chust tumani, Sanoat markazi" },
    { id: 4, name: "Kosonsoy Border-Post", pos: [41.2500, 71.5500], address: "Kosonsoy shimoliy nazorat nuqtasi" },
    { id: 5, name: "Uychi Relay-Unit", pos: [41.0500, 71.7667], address: "Uychi tumani, Markaziy aloqa bog'lamasi" },
    { id: 6, name: "Uchqo'rg'on Hydro-Node", pos: [41.1167, 72.0833], address: "Uchqo'rg'on, Norin daryosi sektori" },
    { id: 7, name: "Mingbuloq Energy-Node", pos: [40.8333, 71.3333], address: "Mingbuloq tumani, Markaziy podstansiya" }
];

export default function NamanganContact() {
    const [geoData, setGeoData] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [activeSignal, setActiveSignal] = useState(namanganDevices[Math.floor(Math.random() * namanganDevices.length)]);
    const [isVoiceActive, setIsVoiceActive] = useState(false);
    const [isTalking, setIsTalking] = useState(false);
    
    const isTalkingRef = useRef(false);
    useEffect(() => { isTalkingRef.current = isTalking; }, [isTalking]);

    const mapRef = useRef(null);
    const socketRef = useRef(null);
    const audioCtxRef = useRef(null);
    const processorRef = useRef(null);
    const sourceRef = useRef(null);
    const streamRef = useRef(null);

    // 1. GeoJSON yuklash
    useEffect(() => {
        fetch('https://raw.githubusercontent.com/crebor-online/uzbekistan-geojson/master/uzbekistan.json')
            .then(res => res.json())
            .then(data => {
                const region = data.features.find(f => f.properties.name_uz === "Namangan");
                setGeoData(region);
            });
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => { clearInterval(timer); closeResources(); };
    }, []);

    // 2. Avtomatik Signal Skanerlash
    useEffect(() => {
        const signalInterval = setInterval(() => {
            if (!isVoiceActive) {
                const randomIndex = Math.floor(Math.random() * namanganDevices.length);
                setActiveSignal(namanganDevices[randomIndex]);
            }
        }, 7000);
        return () => clearInterval(signalInterval);
    }, [isVoiceActive]);

    // 3. Audio & WebSocket Logikasi
    const initConnection = () => {
        const socket = new WebSocket(`ws://localhost:8000`);
        socket.binaryType = 'arraybuffer';
        socketRef.current = socket;
        socket.onopen = () => console.log("✅ Namangan Sector Uplink Established!");
        socket.onmessage = (event) => playReceivedAudio(event.data);
        socket.onclose = () => handleReset();
    };

    const initAudio = async () => {
        if (audioCtxRef.current) return;
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        if (audioCtx.state === 'suspended') await audioCtx.resume();
        audioCtxRef.current = audioCtx;
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const source = audioCtx.createMediaStreamSource(stream);
        sourceRef.current = source;
        const processor = audioCtx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;
        source.connect(processor);
        processor.connect(audioCtx.destination);
        processor.onaudioprocess = (e) => {
            if (socketRef.current?.readyState === WebSocket.OPEN && isTalkingRef.current) {
                const inputData = e.inputBuffer.getChannelData(0);
                socketRef.current.send(float32ToInt16(inputData));
            }
        };
    };

    const playReceivedAudio = (data) => {
        if (!audioCtxRef.current) return;
        const int16Array = new Int16Array(data);
        const float32Array = new Float32Array(int16Array.length);
        for (let i = 0; i < int16Array.length; i++) float32Array[i] = int16Array[i] / 32768;
        const buffer = audioCtxRef.current.createBuffer(1, float32Array.length, 16000);
        buffer.getChannelData(0).set(float32Array);
        const source = audioCtxRef.current.createBufferSource();
        source.buffer = buffer;
        source.connect(audioCtxRef.current.destination);
        source.start();
    };

    const float32ToInt16 = (buffer) => {
        let l = buffer.length;
        let buf = new Int16Array(l);
        while (l--) {
            let s = Math.max(-1, Math.min(1, buffer[l]));
            buf[l] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        return buf.buffer;
    };

    const closeResources = () => {
        if (socketRef.current) socketRef.current.close();
        if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
        if (processorRef.current) processorRef.current.disconnect();
        if (sourceRef.current) sourceRef.current.disconnect();
        if (audioCtxRef.current) audioCtxRef.current.close();
        audioCtxRef.current = null;
    };

    const handleMicToggle = async () => {
        if (!isTalking) await initAudio();
        setIsTalking(!isTalking);
    };

    const handleContactClick = () => {
        if (activeSignal && mapRef.current) {
            mapRef.current.flyTo(activeSignal.pos, 17, { duration: 3 });
            setIsVoiceActive(true);
            initConnection(); 
        }
    };

    const handleReset = () => {
        closeResources();
        setIsVoiceActive(false);
        setIsTalking(false);
        if (mapRef.current) mapRef.current.flyTo([41.0, 71.45], 10.2, { duration: 2.5 });
    };

    return (
        <div className="flex h-screen font-sans overflow-hidden bg-black text-white">
            
            {/* 70% MONITORING AREA */}
            <div className="w-[70%] h-full flex flex-col relative z-10 border-r border-emerald-500/20 shadow-[20px_0_60px_rgba(0,0,0,0.8)]">
                <div className="p-4 bg-gray-900/90 backdrop-blur-xl flex justify-between items-center border-b border-emerald-500/20">
                    <div>
                        <h1 className="text-xl font-black text-emerald-400 uppercase tracking-tighter italic">Namangan Eco-Monitor NAM</h1>
                        <div className="text-[10px] text-gray-500 font-mono tracking-[0.2em] uppercase flex items-center gap-2">
                            <span className={`w-2 h-2 ${isVoiceActive ? 'bg-red-500 animate-ping' : 'bg-emerald-500 animate-pulse'} rounded-full`}></span>
                            {isVoiceActive ? "SECURE LINE ACTIVE" : "SCANNING REGIONAL NODES..."}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-mono text-emerald-400">{currentTime.toLocaleTimeString('uz-UZ')}</div>
                    </div>
                </div>

                <div className="flex-grow p-4">
                    <div className="w-full h-full relative rounded-[3rem] overflow-hidden border border-emerald-500/30">
                        <MapContainer 
                            center={[41.0, 71.45]} 
                            zoom={10.2} 
                            zoomControl={false}
                            style={{ height: '100%', width: '100%', background: '#000' }}
                            ref={mapRef}
                        >
                            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
                            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png" opacity={0.6} />
                            
                            {geoData && (
                                <GeoJSON 
                                    data={geoData} 
                                    style={{ color: '#10B981', weight: 4, fillOpacity: 0.1, dashArray: '8, 12' }} 
                                />
                            )}

                            {activeSignal && <Marker position={activeSignal.pos} icon={redIcon} />}
                        </MapContainer>
                        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.7)] z-[1001]"></div>
                    </div>
                </div>
            </div>

            {/* 30% CONTROL PANEL */}
            <div className="w-[30%] h-full bg-[#080d0b] p-6 flex flex-col border-l border-emerald-500/10">
                <h3 className="text-emerald-500 text-xs font-black tracking-[0.4em] uppercase mb-8 border-b border-emerald-500/20 pb-4 italic">
                    Signal Intelligence
                </h3>

                <div className="flex-grow flex flex-col justify-start space-y-6">
                    {activeSignal && (
                        <div className="w-full space-y-6">
                            <div className="bg-black/80 p-6 rounded-[2.5rem] border border-emerald-500/20 space-y-4 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-all"></div>
                                
                                <div>
                                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Active Node</p>
                                    <h4 className="text-xl font-bold text-emerald-400 tracking-tight">{activeSignal.name}</h4>
                                </div>
                                
                                <div className="border-t border-white/5 pt-4">
                                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Location</p>
                                    <p className="text-xs text-white/70 font-mono mt-1 leading-relaxed">{activeSignal.address}</p>
                                </div>

                                {!isVoiceActive && (
                                    <button 
                                        onClick={handleContactClick}
                                        className="w-full bg-emerald-700 hover:bg-emerald-600 py-4 rounded-xl font-black text-xs tracking-widest transition-all active:scale-95 shadow-[0_10px_40px_rgba(16,185,129,0.3)] uppercase text-white mt-2"
                                    >
                                        Establish Link
                                    </button>
                                )}
                            </div>

                            {isVoiceActive && (
                                <div className="flex flex-col items-center space-y-8 py-6 animate-in fade-in duration-500">
                                    <div className="text-center">
                                        <span className={`text-[10px] font-mono tracking-[0.3em] ${isTalking ? 'text-green-400 animate-pulse' : 'text-emerald-500/40'}`}>
                                            {isTalking ? "STREAMING ENCRYPTED DATA" : "CHANNEL STANDBY"}
                                        </span>
                                    </div>

                                    <button 
                                        onClick={handleMicToggle}
                                        className={`relative w-36 h-36 rounded-full flex items-center justify-center transition-all duration-700 border-2 ${
                                            isTalking 
                                            ? 'bg-green-500/10 border-green-500 shadow-[0_0_80px_rgba(34,197,94,0.4)] scale-105' 
                                            : 'bg-black border-emerald-500/40 hover:border-emerald-400'
                                        }`}
                                    >
                                        {isTalking && <div className="absolute inset-0 rounded-full border border-green-500 animate-ping opacity-20"></div>}
                                        
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="flex items-end gap-1.5 h-8">
                                                {[...Array(6)].map((_, i) => (
                                                    <div 
                                                        key={i} 
                                                        className={`w-1 bg-current rounded-full transition-all duration-300 ${
                                                            isTalking ? 'animate-vibrate text-green-400' : 'h-2 opacity-20 text-emerald-400'
                                                        }`}
                                                        style={{ animationDelay: `${i * 0.1}s` }}
                                                    ></div>
                                                ))}
                                            </div>
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${isTalking ? 'text-green-400' : 'text-gray-500'}`}>
                                                {isTalking ? "Active" : "Muted"}
                                            </span>
                                        </div>
                                    </button>

                                    <button 
                                        onClick={handleReset}
                                        className="group flex items-center gap-2 px-10 py-3 rounded-full border border-red-500/20 hover:border-red-500/50 transition-all active:scale-95"
                                    >
                                        <span className="text-[10px] text-red-500 font-black uppercase tracking-widest">
                                           Cut Connection
                                        </span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="mt-auto pt-4 border-t border-white/5 flex justify-between items-center opacity-40">
                    <p className="text-[9px] text-gray-400 font-mono tracking-tighter uppercase italic">NAM-CORE v5.0 // ECO-LINK</p>
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                </div>
            </div>

            <style>{`
                @keyframes vibrate {
                    0%, 100% { height: 8px; }
                    50% { height: 30px; }
                }
                .animate-vibrate { animation: vibrate 0.4s ease-in-out infinite; }
            `}</style>

        </div>
    );
}