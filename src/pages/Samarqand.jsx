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

const samarqandDevices = [
    { id: 1, name: "Registan Central-Hub", pos: [39.6542, 66.9597], address: "Samarqand sh., Registon maydoni yaqini" },
    { id: 2, name: "Urgut Industrial-Zone", pos: [39.4042, 67.2431], address: "Urgut tumani, Erkin iqtisodiy zona" },
    { id: 3, name: "Kattaqo'rg'on Node", pos: [39.8972, 66.2642], address: "Kattaqo'rg'on sh., Suv ombori sektori" },
    { id: 4, name: "Bulung'ur Transit", pos: [39.7606, 67.2747], address: "Bulung'ur, M-39 Shimoliy kirish" },
    { id: 5, name: "Pastdarg'om Relay", pos: [39.6333, 66.6833], address: "Juma sh., Markaziy aloqa tuguni" },
    { id: 6, name: "Ishtixon Power-Unit", pos: [39.9653, 66.4864], address: "Ishtixon tumani, Energetika tarmog'i" },
    { id: 7, name: "Jomboy Logis-Node", pos: [39.7042, 67.0867], address: "Jomboy tumani, Yuk terminali" }
];

export default function SamarqandContact() {
    const [geoData, setGeoData] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [activeSignal, setActiveSignal] = useState(samarqandDevices[Math.floor(Math.random() * samarqandDevices.length)]);
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
                    f.properties.name_uz === "Samarqand" || f.properties.name === "Samarkand"
                );
                setGeoData(region);
            });
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => { clearInterval(timer); closeResources(); };
    }, []);

    // 2. Random Signal Skanerlash
    useEffect(() => {
        const signalInterval = setInterval(() => {
            if (!isVoiceActive) {
                const randomIndex = Math.floor(Math.random() * samarqandDevices.length);
                setActiveSignal(samarqandDevices[randomIndex]);
            }
        }, 8000);
        return () => clearInterval(signalInterval);
    }, [isVoiceActive]);

    // 3. Audio & WebSocket (Toshkent mantiqi bilan 100% bir xil)
    const initConnection = () => {
        const socket = new WebSocket(`ws://localhost:8000`);
        socket.binaryType = 'arraybuffer';
        socketRef.current = socket;
        socket.onopen = () => console.log("✅ Samarqand Node Connected!");
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
            mapRef.current.flyTo(activeSignal.pos, 18, { duration: 3 });
            setIsVoiceActive(true);
            initConnection(); 
        }
    };

    const handleReset = () => {
        closeResources();
        setIsVoiceActive(false);
        setIsTalking(false);
        if (mapRef.current) mapRef.current.flyTo([39.68, 66.85], 9.8, { duration: 2 });
    };

    return (
        <div className="flex h-screen font-sans overflow-hidden bg-black text-white">
            
            {/* 70% MAP SECTION */}
            <div className="w-[70%] h-full flex flex-col relative z-10 border-r border-purple-500/20 shadow-[15px_0_45px_rgba(0,0,0,0.9)]">
                <div className="p-4 bg-gray-900/90 backdrop-blur-lg flex justify-between items-center border-b border-purple-500/20">
                    <div>
                        <h1 className="text-xl font-black text-purple-400 tracking-tighter uppercase italic">Samarqand Sector SAM-08</h1>
                        <div className="text-[10px] text-gray-500 font-mono tracking-widest uppercase flex items-center gap-2">
                            <span className={`w-2 h-2 ${isVoiceActive ? 'bg-red-500 animate-ping' : 'bg-purple-500 animate-pulse'} rounded-full`}></span>
                            {isVoiceActive ? "UPLINK ESTABLISHED" : "MONITORING REGIONAL NODES..."}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-mono text-purple-400">{currentTime.toLocaleTimeString('uz-UZ')}</div>
                    </div>
                </div>

                <div className="flex-grow p-4">
                    <div className="w-full h-full relative rounded-[2.5rem] overflow-hidden border border-purple-500/30">
                        <MapContainer 
                            center={[39.68, 66.85]} 
                            zoom={9.8} 
                            zoomControl={false}
                            style={{ height: '100%', width: '100%', background: '#000' }}
                            ref={mapRef}
                        >
                            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
                            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png" opacity={0.5} />
                            
                            {geoData && (
                                <GeoJSON 
                                    data={geoData} 
                                    style={{ color: '#A855F7', weight: 4, fillOpacity: 0.1, dashArray: '8, 12' }} 
                                />
                            )}

                            {activeSignal && <Marker position={activeSignal.pos} icon={redIcon} />}
                        </MapContainer>
                        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.6)]"></div>
                    </div>
                </div>
            </div>

            {/* 30% CONTROL PANEL */}
            <div className="w-[30%] h-full bg-[#0d0a14] p-6 flex flex-col border-l border-purple-500/10">
                <h3 className="text-purple-500 text-xs font-black tracking-[0.4em] uppercase mb-8 border-b border-purple-500/20 pb-4 italic">
                    Signal Intelligence
                </h3>

                <div className="flex-grow flex flex-col justify-start space-y-6">
                    {activeSignal && (
                        <div className="w-full space-y-6">
                            <div className="bg-black/60 p-6 rounded-[2rem] border border-purple-500/20 space-y-4 relative overflow-hidden group">
                                <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-all"></div>
                                
                                <div>
                                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Active Station</p>
                                    <h4 className="text-xl font-bold text-purple-400">{activeSignal.name}</h4>
                                </div>
                                
                                <div className="border-t border-white/5 pt-4">
                                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Geo Location</p>
                                    <p className="text-xs text-white/70 font-mono mt-1 leading-relaxed">{activeSignal.address}</p>
                                </div>

                                {!isVoiceActive && (
                                    <button 
                                        onClick={handleContactClick}
                                        className="w-full bg-purple-700 hover:bg-purple-600 py-4 rounded-xl font-black text-xs tracking-widest transition-all active:scale-95 shadow-[0_10px_30px_rgba(168,85,247,0.3)] uppercase text-white mt-2"
                                    >
                                        Establish Contact
                                    </button>
                                )}
                            </div>

                            {isVoiceActive && (
                                <div className="flex flex-col items-center space-y-8 py-6 animate-in fade-in zoom-in duration-500">
                                    <div className="flex flex-col items-center gap-2">
                                        <span className={`text-[10px] font-mono tracking-[0.3em] ${isTalking ? 'text-green-400 animate-pulse' : 'text-purple-500/50'}`}>
                                            {isTalking ? "STREAMING BINARY" : "LINK STANDBY"}
                                        </span>
                                    </div>

                                    <button 
                                        onClick={handleMicToggle}
                                        className={`relative w-36 h-36 rounded-full flex items-center justify-center transition-all duration-700 border-2 ${
                                            isTalking 
                                            ? 'bg-green-500/10 border-green-500 shadow-[0_0_80px_rgba(34,197,94,0.4)] scale-105' 
                                            : 'bg-black border-purple-500/40 hover:border-purple-400'
                                        }`}
                                    >
                                        {isTalking && <div className="absolute inset-0 rounded-full border border-green-500 animate-ping opacity-20"></div>}
                                        
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="flex items-end gap-1.5 h-8">
                                                {[...Array(6)].map((_, i) => (
                                                    <div 
                                                        key={i} 
                                                        className={`w-1 bg-current rounded-full transition-all duration-300 ${
                                                            isTalking ? 'animate-vibrate text-green-400' : 'h-2 opacity-20 text-purple-400'
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
                                        className="group flex items-center gap-2 px-8 py-3 rounded-full border border-red-500/20 hover:border-red-500/50 transition-all"
                                    >
                                        <span className="text-[10px] text-red-500/70 group-hover:text-red-500 font-black uppercase tracking-widest">
                                           Close Channel
                                        </span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="mt-auto pt-4 border-t border-white/5 flex justify-between items-center">
                    <p className="text-[9px] text-gray-600 font-mono tracking-tighter uppercase">SAM-LINK v2.0</p>
                    <div className="flex gap-1">
                        <div className="w-1 h-1 bg-purple-500 rounded-full animate-pulse"></div>
                        <div className="w-1 h-1 bg-purple-500 rounded-full animate-pulse delay-75"></div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes vibrate {
                    0%, 100% { height: 10px; }
                    50% { height: 28px; }
                }
                .animate-vibrate { animation: vibrate 0.5s ease-in-out infinite; }
            `}</style>

        </div>
    );
}