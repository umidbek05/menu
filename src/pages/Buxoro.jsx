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

const bukharaNodes = [
    { id: 1, name: "Bukhara Citadel-Hub", pos: [39.7747, 64.4286], address: "Buxoro sh., Ark qo'rg'oni hududi" },
    { id: 2, name: "Gazli Energy-Post", pos: [40.1311, 63.4561], address: "Gazli shahri, Markaziy gaz terminali" },
    { id: 3, name: "Kogon Railway-Sector", pos: [39.7167, 64.5500], address: "Kogon sh., Logistika markazi" },
    { id: 4, name: "Qorako'l Border-Node", pos: [39.5000, 63.8500], address: "Qorako'l, Janubiy nazorat nuqtasi" },
    { id: 5, name: "G'ijduvon Industrial-Unit", pos: [40.1000, 64.6667], address: "G'ijduvon, Hunarmandlar zonasi" },
    { id: 6, name: "Qorovulbozor Refinery", pos: [39.5000, 64.8167], address: "Qorovulbozor, Neftni qayta ishlash zavodi" },
    { id: 7, name: "Shofirkon Relay-Post", pos: [40.1167, 64.5000], address: "Shofirkon shimoliy aloqa minorasi" }
];

export default function BukharaContact() {
    const [geoData, setGeoData] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [activeSignal, setActiveSignal] = useState(bukharaNodes[Math.floor(Math.random() * bukharaNodes.length)]);
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

    // 1. GeoJSON Yuklash
    useEffect(() => {
        fetch('https://raw.githubusercontent.com/crebor-online/uzbekistan-geojson/master/uzbekistan.json')
            .then(res => res.json())
            .then(data => {
                const region = data.features.find(f => 
                    f.properties.name_uz === "Buxoro" || f.properties.name === "Bukhara"
                );
                setGeoData(region);
            });
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => { clearInterval(timer); closeResources(); };
    }, []);

    // 2. Signal Skanerlash (Desert frequency)
    useEffect(() => {
        const signalInterval = setInterval(() => {
            if (!isVoiceActive) {
                const randomIndex = Math.floor(Math.random() * bukharaNodes.length);
                setActiveSignal(bukharaNodes[randomIndex]);
            }
        }, 9000);
        return () => clearInterval(signalInterval);
    }, [isVoiceActive]);

    // 3. Audio Engine
    const initConnection = () => {
        const socket = new WebSocket(`ws://localhost:8000`);
        socket.binaryType = 'arraybuffer';
        socketRef.current = socket;
        socket.onopen = () => console.log("✅ Bukhara Ancient-Link Secured");
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
            mapRef.current.flyTo(activeSignal.pos, 16, { duration: 3 });
            setIsVoiceActive(true);
            initConnection(); 
        }
    };

    const handleReset = () => {
        closeResources();
        setIsVoiceActive(false);
        setIsTalking(false);
        if (mapRef.current) mapRef.current.flyTo([39.85, 64.3], 9, { duration: 2 });
    };

    return (
        <div className="flex h-screen font-sans overflow-hidden bg-black text-white">
            
            {/* 70% MAP MONITOR */}
            <div className="w-[70%] h-full flex flex-col relative z-10 border-r border-stone-700/30 shadow-[15px_0_45px_rgba(0,0,0,0.9)]">
                <div className="p-4 bg-gray-900/95 backdrop-blur-xl flex justify-between items-center border-b border-stone-700/30">
                    <div>
                        <h1 className="text-xl font-black text-stone-300 uppercase tracking-tighter italic">Bukhara Desert Terminal</h1>
                        <div className="text-[10px] text-stone-500 font-mono tracking-[0.2em] uppercase flex items-center gap-2">
                            <span className={`w-2 h-2 ${isVoiceActive ? 'bg-amber-500 animate-ping' : 'bg-stone-500 animate-pulse'} rounded-full`}></span>
                            {isVoiceActive ? "ENCRYPTED ANCIENT-UPLINK ACTIVE" : "SCANNING SILK-ROAD NODES..."}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-mono text-stone-300">{currentTime.toLocaleTimeString('uz-UZ')}</div>
                    </div>
                </div>

                <div className="flex-grow p-4 bg-[#0a0a09]">
                    <div className="w-full h-full relative rounded-[3rem] overflow-hidden border border-stone-800 shadow-[inset_0_0_100px_rgba(168,162,158,0.05)]">
                        <MapContainer 
                            center={[39.85, 64.3]} 
                            zoom={9} 
                            zoomControl={false}
                            style={{ height: '100%', width: '100%', background: '#000' }}
                            ref={mapRef}
                        >
                            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
                            <TileLayer url="https://mt1.google.com/vt/lyrs=h&x={x}&y={y}&z={z}" opacity={0.6} />
                            
                            {geoData && (
                                <GeoJSON 
                                    data={geoData} 
                                    style={{ color: '#a8a29e', weight: 3, fillOpacity: 0.05, dashArray: '10, 15' }} 
                                />
                            )}

                            {activeSignal && <Marker position={activeSignal.pos} icon={redIcon} />}
                        </MapContainer>
                        {/* Sandstorm/Dust effect overlay */}
                        <div className="absolute inset-0 pointer-events-none bg-amber-900/5 mix-blend-overlay z-[1001]"></div>
                    </div>
                </div>
            </div>

            {/* 30% CONTROL INTERFACE */}
            <div className="w-[30%] h-full bg-[#0f0e0d] p-6 flex flex-col border-l border-stone-800/50">
                <h3 className="text-stone-600 text-xs font-black tracking-[0.4em] uppercase mb-8 border-b border-stone-800/30 pb-4 italic text-center">
                    Bukhara OS v9.0
                </h3>

                <div className="flex-grow flex flex-col justify-start space-y-6">
                    {activeSignal && (
                        <div className="w-full space-y-6">
                            <div className="bg-black/80 p-6 rounded-[2rem] border border-stone-800/50 space-y-4 relative overflow-hidden group">
                                <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl group-hover:bg-amber-500/10 transition-all"></div>
                                
                                <div>
                                    <p className="text-[10px] text-stone-500 uppercase font-bold tracking-widest">Active Node</p>
                                    <h4 className="text-xl font-bold text-stone-200 tracking-tight">{activeSignal.name}</h4>
                                </div>
                                
                                <div className="border-t border-stone-800/40 pt-4">
                                    <p className="text-[10px] text-stone-600 uppercase font-bold tracking-widest">Geo-Location</p>
                                    <p className="text-xs text-stone-400 font-mono mt-1 leading-relaxed italic">{activeSignal.address}</p>
                                </div>

                                {!isVoiceActive && (
                                    <button 
                                        onClick={handleContactClick}
                                        className="w-full bg-stone-800 hover:bg-stone-700 py-4 rounded-xl font-black text-xs tracking-widest transition-all active:scale-95 shadow-xl uppercase text-stone-200 mt-2 border border-stone-700"
                                    >
                                        Establish Ancient-Link
                                    </button>
                                )}
                            </div>

                            {isVoiceActive && (
                                <div className="flex flex-col items-center space-y-10 py-6 animate-in zoom-in-95 duration-700">
                                    <div className="text-center">
                                        <span className={`text-[10px] font-mono tracking-[0.3em] ${isTalking ? 'text-amber-400 animate-pulse' : 'text-stone-700'}`}>
                                            {isTalking ? "DATA STREAMING OVER DESERT" : "SECURE UPLINK STANDBY"}
                                        </span>
                                    </div>

                                    <button 
                                        onClick={handleMicToggle}
                                        className={`relative w-40 h-40 rounded-full flex items-center justify-center transition-all duration-1000 border-2 ${
                                            isTalking 
                                            ? 'bg-amber-500/5 border-amber-500 shadow-[0_0_70px_rgba(245,158,11,0.2)] scale-105' 
                                            : 'bg-black border-stone-800 hover:border-stone-600'
                                        }`}
                                    >
                                        {isTalking && <div className="absolute inset-0 rounded-full border border-amber-500 animate-ping opacity-10"></div>}
                                        
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="flex items-end gap-1.5 h-10">
                                                {[...Array(10)].map((_, i) => (
                                                    <div 
                                                        key={i} 
                                                        className={`w-0.5 bg-current rounded-full transition-all duration-300 ${
                                                            isTalking ? 'animate-vibrate text-amber-500' : 'h-1.5 opacity-10 text-stone-600'
                                                        }`}
                                                        style={{ animationDelay: `${i * 0.07}s` }}
                                                    ></div>
                                                ))}
                                            </div>
                                            <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${isTalking ? 'text-amber-500' : 'text-stone-700'}`}>
                                                {isTalking ? "Link Active" : "Muted"}
                                            </span>
                                        </div>
                                    </button>

                                    <button 
                                        onClick={handleReset}
                                        className="text-[10px] text-stone-600 hover:text-red-500 font-black uppercase tracking-widest transition-all"
                                    >
                                       Terminate Link
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="mt-auto pt-4 border-t border-stone-800/40 flex justify-between items-center opacity-40">
                    <p className="text-[9px] text-stone-600 font-mono">BUX-SAT v9.0 // SILK-NET</p>
                    <div className="w-1.5 h-1.5 bg-amber-600 rounded-full animate-pulse"></div>
                </div>
            </div>

            <style>{`
                @keyframes vibrate {
                    0%, 100% { height: 8px; }
                    50% { height: 35px; }
                }
                .animate-vibrate { animation: vibrate 0.6s ease-in-out infinite; }
            `}</style>

        </div>
    );
}