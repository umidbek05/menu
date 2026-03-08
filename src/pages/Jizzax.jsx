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

const jizzaxSectors = [
    { id: 1, name: "Jizzax Central-Node", pos: [40.1158, 67.8422], address: "Jizzax sh., Sh.Rashidov shoh ko'chasi" },
    { id: 2, name: "Zomin Alpine-Post", pos: [39.9606, 68.3958], address: "Zomin tumani, Milliy bog' hududi" },
    { id: 3, name: "Forish Desert-Unit", pos: [40.5667, 67.1167], address: "Forish tumani, Aydarkul sektori" },
    { id: 4, name: "G'allaorol Transit-Hub", pos: [40.0267, 67.5856], address: "G'allaorol, M-39 xalqaro trassasi" },
    { id: 5, name: "Paxtakor Agro-Sector", pos: [40.3167, 67.9500], address: "Paxtakor tumani, Markaziy stansiya" },
    { id: 6, name: "Do'stlik Relay-Post", pos: [40.5250, 68.0333], address: "Do'stlik tumani, Shimoliy aloqa nuqtasi" },
    { id: 7, name: "Baxmal Mountain-Link", pos: [39.8167, 67.9000], address: "Baxmal, Janubiy tizmalar" }
];

export default function JizzaxContact() {
    const [geoData, setGeoData] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [activeSignal, setActiveSignal] = useState(jizzaxSectors[Math.floor(Math.random() * jizzaxSectors.length)]);
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
                    f.properties.name_uz === "Jizzax" || f.properties.name === "Jizzakh"
                );
                setGeoData(region);
            });
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => { clearInterval(timer); closeResources(); };
    }, []);

    // 2. Signal Skanerlash (8 soniya)
    useEffect(() => {
        const signalInterval = setInterval(() => {
            if (!isVoiceActive) {
                const randomIndex = Math.floor(Math.random() * jizzaxSectors.length);
                setActiveSignal(jizzaxSectors[randomIndex]);
            }
        }, 8000);
        return () => clearInterval(signalInterval);
    }, [isVoiceActive]);

    // 3. Audio & WebSocket Logic
    const initConnection = () => {
        const socket = new WebSocket(`ws://localhost:8000`);
        socket.binaryType = 'arraybuffer';
        socketRef.current = socket;
        socket.onopen = () => console.log("✅ Jizzax Uplink Secured");
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
            mapRef.current.flyTo(activeSignal.pos, 17, { duration: 2.5 });
            setIsVoiceActive(true);
            initConnection(); 
        }
    };

    const handleReset = () => {
        closeResources();
        setIsVoiceActive(false);
        setIsTalking(false);
        if (mapRef.current) mapRef.current.flyTo([40.40, 67.80], 8.8, { duration: 2 });
    };

    return (
        <div className="flex h-screen font-sans overflow-hidden bg-black text-white">
            
            {/* 70% MAP MONITOR */}
            <div className="w-[70%] h-full flex flex-col relative z-10 border-r border-slate-700/30 shadow-[10px_0_40px_rgba(0,0,0,0.8)]">
                <div className="p-4 bg-gray-900/95 backdrop-blur-xl flex justify-between items-center border-b border-slate-700/30">
                    <div>
                        <h1 className="text-xl font-black text-slate-400 uppercase tracking-tighter italic">Jizzax Transit Sector</h1>
                        <div className="text-[10px] text-gray-500 font-mono tracking-[0.2em] uppercase flex items-center gap-2">
                            <span className={`w-2 h-2 ${isVoiceActive ? 'bg-red-500 animate-ping' : 'bg-slate-500 animate-pulse'} rounded-full`}></span>
                            {isVoiceActive ? "ACTIVE LINK: ENCRYPTED" : "SCANNING CENTRAL-UZ NODES..."}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-mono text-slate-400">{currentTime.toLocaleTimeString('uz-UZ')}</div>
                    </div>
                </div>

                <div className="flex-grow p-6 bg-[#0a0a0a]">
                    <div className="w-full h-full relative rounded-[2.5rem] overflow-hidden border border-slate-700/50">
                        <MapContainer 
                            center={[40.40, 67.80]} 
                            zoom={8.8} 
                            zoomControl={false}
                            style={{ height: '100%', width: '100%', background: '#000' }}
                            ref={mapRef}
                        >
                            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
                            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png" opacity={0.5} />
                            
                            {geoData && (
                                <GeoJSON 
                                    data={geoData} 
                                    style={{ color: '#94a3b8', weight: 3, fillOpacity: 0.1, dashArray: '5, 10' }} 
                                />
                            )}

                            {activeSignal && <Marker position={activeSignal.pos} icon={redIcon} />}
                        </MapContainer>
                        {/* Overlay scan effect */}
                        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-slate-500/5 to-transparent h-20 w-full animate-scan z-[1001]"></div>
                    </div>
                </div>
            </div>

            {/* 30% CONTROL INTERFACE */}
            <div className="w-[30%] h-full bg-[#0d0f12] p-6 flex flex-col border-l border-slate-700/20">
                <h3 className="text-slate-500 text-xs font-black tracking-[0.4em] uppercase mb-8 border-b border-slate-700/20 pb-4 italic">
                    Node Intelligence
                </h3>

                <div className="flex-grow flex flex-col justify-start space-y-6">
                    {activeSignal && (
                        <div className="w-full space-y-6">
                            <div className="bg-black/60 p-6 rounded-[2rem] border border-slate-700/20 space-y-4 relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-2 h-full bg-slate-500/20 group-hover:bg-slate-400 transition-all"></div>
                                
                                <div>
                                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Active Station</p>
                                    <h4 className="text-xl font-bold text-slate-300 tracking-tight">{activeSignal.name}</h4>
                                </div>
                                
                                <div className="border-t border-white/5 pt-4">
                                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Zone Location</p>
                                    <p className="text-xs text-slate-400 font-mono mt-1 leading-relaxed">{activeSignal.address}</p>
                                </div>

                                {!isVoiceActive && (
                                    <button 
                                        onClick={handleContactClick}
                                        className="w-full bg-slate-700 hover:bg-slate-600 py-4 rounded-xl font-black text-xs tracking-widest transition-all active:scale-95 shadow-[0_10px_30px_rgba(0,0,0,0.5)] uppercase text-white mt-2"
                                    >
                                        Establish Link
                                    </button>
                                )}
                            </div>

                            {isVoiceActive && (
                                <div className="flex flex-col items-center space-y-10 py-6">
                                    <div className="text-center">
                                        <div className="flex gap-1 justify-center mb-2">
                                            {[...Array(3)].map((_, i) => (
                                                <div key={i} className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.2}s` }}></div>
                                            ))}
                                        </div>
                                        <span className={`text-[10px] font-mono tracking-[0.3em] ${isTalking ? 'text-blue-400' : 'text-slate-500'}`}>
                                            {isTalking ? "UPLINK TRANSMITTING" : "LINK STABLE"}
                                        </span>
                                    </div>

                                    <button 
                                        onClick={handleMicToggle}
                                        className={`relative w-40 h-40 rounded-full flex items-center justify-center transition-all duration-700 border-2 ${
                                            isTalking 
                                            ? 'bg-blue-500/10 border-blue-400 shadow-[0_0_60px_rgba(96,165,250,0.3)] scale-105' 
                                            : 'bg-black border-slate-700 hover:border-slate-500'
                                        }`}
                                    >
                                        {isTalking && <div className="absolute inset-0 rounded-full border border-blue-400 animate-ping opacity-20"></div>}
                                        
                                        <div className="flex flex-col items-center gap-3 text-slate-400">
                                            <div className="flex items-end gap-1.5 h-10">
                                                {[...Array(8)].map((_, i) => (
                                                    <div 
                                                        key={i} 
                                                        className={`w-1 bg-current rounded-full transition-all duration-300 ${
                                                            isTalking ? 'animate-vibrate text-blue-400' : 'h-2 opacity-20 text-slate-500'
                                                        }`}
                                                        style={{ animationDelay: `${i * 0.05}s` }}
                                                    ></div>
                                                ))}
                                            </div>
                                            <span className="text-[9px] font-black uppercase tracking-[0.2em]">
                                                {isTalking ? "Voice On" : "Voice Off"}
                                            </span>
                                        </div>
                                    </button>

                                    <button 
                                        onClick={handleReset}
                                        className="text-[10px] text-red-500/70 hover:text-red-500 font-black uppercase tracking-widest transition-colors"
                                    >
                                       [ Terminate Link ]
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="mt-auto pt-4 border-t border-white/5 flex justify-between items-center opacity-30">
                    <p className="text-[9px] text-gray-500 font-mono">JIZ-OS v4.1 // TRANSIT-LOG</p>
                    <div className="w-2 h-2 bg-slate-500 rounded-full"></div>
                </div>
            </div>

            <style>{`
                @keyframes scan {
                    from { top: -20%; }
                    to { top: 120%; }
                }
                .animate-scan { animation: scan 4s linear infinite; }
                @keyframes vibrate {
                    0%, 100% { height: 10px; }
                    50% { height: 35px; }
                }
                .animate-vibrate { animation: vibrate 0.5s ease-in-out infinite; }
            `}</style>

        </div>
    );
}