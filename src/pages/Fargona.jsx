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

const ferganaNerves = [
    { id: 1, name: "Fergana Central-Hub", pos: [40.3864, 71.7864], address: "Farg'ona sh., Al-Farg'oniy ko'chasi" },
    { id: 2, name: "Kokand Trade-Node", pos: [40.5286, 70.9425], address: "Qo'qon sh., Buyuk Ipak Yo'li" },
    { id: 3, name: "Margilan Silk-Sector", pos: [40.4714, 71.7250], address: "Marg'ilon sh., Mustaqillik maydoni" },
    { id: 4, name: "Quvasoy Industrial-Unit", pos: [40.3056, 71.9778], address: "Quvasoy sh., Sanoat zonasi" },
    { id: 5, name: "Rishton Ceramic-Node", pos: [40.3556, 71.2833], address: "Rishton tumani, Markaziy korpus" },
    { id: 6, name: "Oltiariq Logistics-Post", pos: [40.3833, 71.4833], address: "Oltiariq tumani, Eksport terminali" },
    { id: 7, name: "Quva Agro-Relay", pos: [40.5167, 72.0167], address: "Quva tumani, Shimoliy sektor" }
];

export default function FerganaContact() {
    const [geoData, setGeoData] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [activeSignal, setActiveSignal] = useState(ferganaNerves[Math.floor(Math.random() * ferganaNerves.length)]);
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
                    f.properties.name_uz === "Farg'ona" || f.properties.name === "Fergana"
                );
                setGeoData(region);
            });
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => { clearInterval(timer); closeResources(); };
    }, []);

    // 2. Avtomatik Signal Skanerlash
    useEffect(() => {
        const signalInterval = setInterval(() => {
            if (!isVoiceActive) {
                const randomIndex = Math.floor(Math.random() * ferganaNerves.length);
                setActiveSignal(ferganaNerves[randomIndex]);
            }
        }, 7000);
        return () => clearInterval(signalInterval);
    }, [isVoiceActive]);

    // 3. Audio & WebSocket Logic
    const initConnection = () => {
        const socket = new WebSocket(`ws://localhost:8000`);
        socket.binaryType = 'arraybuffer';
        socketRef.current = socket;
        socket.onopen = () => console.log("✅ Fergana Uplink Active");
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
            mapRef.current.flyTo(activeSignal.pos, 16.5, { duration: 2.5 });
            setIsVoiceActive(true);
            initConnection(); 
        }
    };

    const handleReset = () => {
        closeResources();
        setIsVoiceActive(false);
        setIsTalking(false);
        if (mapRef.current) mapRef.current.flyTo([40.42, 71.35], 10.2, { duration: 2 });
    };

    return (
        <div className="flex h-screen font-sans overflow-hidden bg-black text-white">
            
            {/* 70% MAP MONITOR */}
            <div className="w-[70%] h-full flex flex-col relative z-10 border-r border-orange-500/20 shadow-[10px_0_40px_rgba(0,0,0,0.8)]">
                <div className="p-4 bg-gray-900/95 backdrop-blur-xl flex justify-between items-center border-b border-orange-500/20">
                    <div>
                        <h1 className="text-xl font-black text-orange-400 uppercase tracking-tighter italic">Fergana Transit Monitor</h1>
                        <div className="text-[10px] text-gray-500 font-mono tracking-[0.2em] uppercase flex items-center gap-2">
                            <span className={`w-2 h-2 ${isVoiceActive ? 'bg-red-500 animate-ping' : 'bg-orange-500 animate-pulse'} rounded-full`}></span>
                            {isVoiceActive ? "SECURE UPLINK ESTABLISHED" : "SCANNING VODIY-CORE NODES..."}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-mono text-orange-400">{currentTime.toLocaleTimeString('uz-UZ')}</div>
                    </div>
                </div>

                <div className="flex-grow p-4 bg-[#050505]">
                    <div className="w-full h-full relative rounded-[3rem] overflow-hidden border border-orange-500/30 shadow-[inset_0_0_80px_rgba(251,146,60,0.1)]">
                        <MapContainer 
                            center={[40.42, 71.35]} 
                            zoom={10.2} 
                            zoomControl={false}
                            style={{ height: '100%', width: '100%', background: '#000' }}
                            ref={mapRef}
                        >
                            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
                            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png" opacity={0.5} />
                            
                            {geoData && (
                                <GeoJSON 
                                    data={geoData} 
                                    style={{ color: '#fb923c', weight: 4, fillOpacity: 0.08, dashArray: '10, 15' }} 
                                />
                            )}

                            {activeSignal && <Marker position={activeSignal.pos} icon={redIcon} />}
                        </MapContainer>
                        {/* Static noise overlay */}
                        <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[url('https://media.giphy.com/media/oEI9uWUqWMrBK/giphy.gif')] z-[1001]"></div>
                    </div>
                </div>
            </div>

            {/* 30% CONTROL INTERFACE */}
            <div className="w-[30%] h-full bg-[#0d0c0b] p-6 flex flex-col border-l border-orange-500/10">
                <h3 className="text-orange-500/60 text-xs font-black tracking-[0.4em] uppercase mb-8 border-b border-orange-500/20 pb-4 italic">
                    Sector Intelligence
                </h3>

                <div className="flex-grow flex flex-col justify-start space-y-6">
                    {activeSignal && (
                        <div className="w-full space-y-6">
                            <div className="bg-black/60 p-6 rounded-[2rem] border border-orange-500/20 space-y-4 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full blur-3xl group-hover:bg-orange-500/10 transition-all"></div>
                                
                                <div>
                                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Target Node</p>
                                    <h4 className="text-xl font-bold text-orange-400 tracking-tight">{activeSignal.name}</h4>
                                </div>
                                
                                <div className="border-t border-white/5 pt-4">
                                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Deployment Zone</p>
                                    <p className="text-xs text-orange-200/60 font-mono mt-1 leading-relaxed">{activeSignal.address}</p>
                                </div>

                                {!isVoiceActive && (
                                    <button 
                                        onClick={handleContactClick}
                                        className="w-full bg-orange-600 hover:bg-orange-500 py-4 rounded-xl font-black text-xs tracking-widest transition-all active:scale-95 shadow-[0_10px_40px_rgba(251,146,60,0.2)] uppercase text-black mt-2"
                                    >
                                        Establish Connection
                                    </button>
                                )}
                            </div>

                            {isVoiceActive && (
                                <div className="flex flex-col items-center space-y-10 py-6 animate-in slide-in-from-bottom-4 duration-500">
                                    <div className="text-center">
                                        <span className={`text-[10px] font-mono tracking-[0.3em] ${isTalking ? 'text-orange-400 animate-pulse' : 'text-orange-900'}`}>
                                            {isTalking ? "COMM-LINK BROADCASTING" : "ENCRYPTION STANDBY"}
                                        </span>
                                    </div>

                                    <button 
                                        onClick={handleMicToggle}
                                        className={`relative w-40 h-40 rounded-full flex items-center justify-center transition-all duration-700 border-2 ${
                                            isTalking 
                                            ? 'bg-orange-500/10 border-orange-400 shadow-[0_0_80px_rgba(251,146,60,0.3)] scale-105' 
                                            : 'bg-black border-orange-900/40 hover:border-orange-500/60'
                                        }`}
                                    >
                                        {isTalking && <div className="absolute inset-0 rounded-full border border-orange-400 animate-ping opacity-20"></div>}
                                        
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="flex items-end gap-1.5 h-10">
                                                {[...Array(8)].map((_, i) => (
                                                    <div 
                                                        key={i} 
                                                        className={`w-1 bg-current rounded-full transition-all duration-300 ${
                                                            isTalking ? 'animate-vibrate text-orange-400' : 'h-2 opacity-20 text-orange-900'
                                                        }`}
                                                        style={{ animationDelay: `${i * 0.05}s` }}
                                                    ></div>
                                                ))}
                                            </div>
                                            <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${isTalking ? 'text-orange-400' : 'text-orange-900'}`}>
                                                {isTalking ? "Push to Mute" : "Push to Talk"}
                                            </span>
                                        </div>
                                    </button>

                                    <button 
                                        onClick={handleReset}
                                        className="text-[10px] text-red-500/50 hover:text-red-500 font-black uppercase tracking-widest transition-colors border-b border-red-500/20 pb-1"
                                    >
                                       Terminate Encryption
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="mt-auto pt-4 border-t border-white/5 flex justify-between items-center opacity-30">
                    <p className="text-[9px] text-gray-500 font-mono italic">FER-CORE v11.0 // VODIY-NET</p>
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                </div>
            </div>

            <style>{`
                @keyframes vibrate {
                    0%, 100% { height: 10px; }
                    50% { height: 35px; }
                }
                .animate-vibrate { animation: vibrate 0.5s ease-in-out infinite; }
            `}</style>

        </div>
    );
}