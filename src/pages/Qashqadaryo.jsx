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

const qashqaDevices = [
    { id: 1, name: "Qarshi Central-Node", pos: [38.8612, 65.7847], address: "Qarshi sh., Mustaqillik shoh ko'chasi" },
    { id: 2, name: "Muborak Gas-Sector", pos: [39.2556, 65.1528], address: "Muborak tumani, Sanoat zonasi A-5" },
    { id: 3, name: "Shahrisabz Tourist-Hub", pos: [39.0583, 66.8333], address: "Shahrisabz sh., Oqsaroy majmuasi" },
    { id: 4, name: "Sho'rtan Chemical-Unit", pos: [38.6214, 66.2481], address: "G'uzor tumani, Sho'rtan gaz-kimyo" },
    { id: 5, name: "Kitob Astro-Node", pos: [39.1167, 66.8833], address: "Kitob tumani, Balandlik stansiyasi" },
    { id: 6, name: "Koson Relay-Station", pos: [39.0333, 65.4500], address: "Koson tumani, Shimoliy magistral" },
    { id: 7, name: "Dehqonobod Salt-Mine", pos: [38.3500, 66.4500], address: "Dehqonobod, Janubiy sanoat tuguni" }
];

export default function QashqadaryoContact() {
    const [geoData, setGeoData] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [activeSignal, setActiveSignal] = useState(qashqaDevices[Math.floor(Math.random() * qashqaDevices.length)]);
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
                const region = data.features.find(f => 
                    f.properties.name_uz === "Qashqadaryo" || f.properties.name === "Kashkadarya"
                );
                setGeoData(region);
            });
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => { clearInterval(timer); closeResources(); };
    }, []);

    // 2. Signal skanerlash
    useEffect(() => {
        const signalInterval = setInterval(() => {
            if (!isVoiceActive) {
                const randomIndex = Math.floor(Math.random() * qashqaDevices.length);
                setActiveSignal(qashqaDevices[randomIndex]);
            }
        }, 8000);
        return () => clearInterval(signalInterval);
    }, [isVoiceActive]);

    // 3. Audio & WebSocket Logic
    const initConnection = () => {
        const socket = new WebSocket(`ws://localhost:8000`);
        socket.binaryType = 'arraybuffer';
        socketRef.current = socket;
        socket.onopen = () => console.log("✅ Qashqadaryo Uplink Active!");
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
        if (mapRef.current) mapRef.current.flyTo([38.85, 66.15], 9.3, { duration: 2 });
    };

    return (
        <div className="flex h-screen font-sans overflow-hidden bg-black text-white">
            
            {/* 70% MAP MONITOR */}
            <div className="w-[70%] h-full flex flex-col relative z-10 border-r border-pink-500/20 shadow-[15px_0_50px_rgba(0,0,0,0.9)]">
                <div className="p-4 bg-gray-900/95 backdrop-blur-xl flex justify-between items-center border-b border-pink-500/20">
                    <div>
                        <h1 className="text-xl font-black text-pink-400 uppercase tracking-tighter italic">Qashqadaryo Sector QAS</h1>
                        <div className="text-[10px] text-gray-400 font-mono tracking-[0.2em] uppercase flex items-center gap-2">
                            <span className={`w-2 h-2 ${isVoiceActive ? 'bg-red-500 animate-ping' : 'bg-pink-500 animate-pulse'} rounded-full`}></span>
                            {isVoiceActive ? "ACTIVE UPLINK: ENCRYPTED" : "SCANNING SOUTH-TERRAIN..."}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-mono text-pink-400">{currentTime.toLocaleTimeString('uz-UZ')}</div>
                    </div>
                </div>

                <div className="flex-grow p-4">
                    <div className="w-full h-full relative rounded-[3rem] overflow-hidden border border-pink-500/30">
                        <MapContainer 
                            center={[38.85, 66.15]} 
                            zoom={9.3} 
                            zoomControl={false}
                            style={{ height: '100%', width: '100%', background: '#000' }}
                            ref={mapRef}
                        >
                            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
                            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png" opacity={0.5} />
                            
                            {geoData && (
                                <GeoJSON 
                                    data={geoData} 
                                    style={{ color: '#F472B6', weight: 4, fillOpacity: 0.1, dashArray: '10, 15' }} 
                                />
                            )}

                            {activeSignal && <Marker position={activeSignal.pos} icon={redIcon} />}
                        </MapContainer>
                        <div className="absolute inset-0 pointer-events-none border-[20px] border-black/20 z-[1002]"></div>
                    </div>
                </div>
            </div>

            {/* 30% CONTROL INTERFACE */}
            <div className="w-[30%] h-full bg-[#110a0e] p-6 flex flex-col border-l border-pink-500/10">
                <h3 className="text-pink-500 text-xs font-black tracking-[0.4em] uppercase mb-8 border-b border-pink-500/20 pb-4 italic">
                    Node Signal Analysis
                </h3>

                <div className="flex-grow flex flex-col justify-start space-y-6">
                    {activeSignal && (
                        <div className="w-full space-y-6">
                            <div className="bg-black/60 p-6 rounded-[2.5rem] border border-pink-500/20 space-y-4 relative overflow-hidden group">
                                <div className="absolute -right-4 -top-4 w-24 h-24 bg-pink-500/5 rounded-full blur-2xl group-hover:bg-pink-500/10 transition-all"></div>
                                
                                <div>
                                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Target Node</p>
                                    <h4 className="text-xl font-bold text-pink-400 tracking-tight">{activeSignal.name}</h4>
                                </div>
                                
                                <div className="border-t border-white/5 pt-4">
                                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Physical Sector</p>
                                    <p className="text-xs text-white/70 font-mono mt-1 leading-relaxed">{activeSignal.address}</p>
                                </div>

                                {!isVoiceActive && (
                                    <button 
                                        onClick={handleContactClick}
                                        className="w-full bg-pink-700 hover:bg-pink-600 py-4 rounded-xl font-black text-xs tracking-widest transition-all active:scale-95 shadow-[0_10px_40px_rgba(244,114,182,0.3)] uppercase text-white mt-2"
                                    >
                                        Establish Contact
                                    </button>
                                )}
                            </div>

                            {isVoiceActive && (
                                <div className="flex flex-col items-center space-y-8 py-6 animate-in slide-in-from-right duration-500">
                                    <div className="flex flex-col items-center gap-2">
                                        <span className={`text-[10px] font-mono tracking-[0.3em] ${isTalking ? 'text-red-400 animate-pulse' : 'text-pink-500/50'}`}>
                                            {isTalking ? "ENCRYPTED STREAM" : "LINK STANDBY"}
                                        </span>
                                    </div>

                                    <button 
                                        onClick={handleMicToggle}
                                        className={`relative w-36 h-36 rounded-full flex items-center justify-center transition-all duration-700 border-2 ${
                                            isTalking 
                                            ? 'bg-red-500/10 border-red-500 shadow-[0_0_80px_rgba(239,68,68,0.4)] scale-105' 
                                            : 'bg-black border-pink-500/40 hover:border-pink-400'
                                        }`}
                                    >
                                        {isTalking && <div className="absolute inset-0 rounded-full border border-red-500 animate-ping opacity-20"></div>}
                                        
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="flex items-end gap-1.5 h-8">
                                                {[...Array(6)].map((_, i) => (
                                                    <div 
                                                        key={i} 
                                                        className={`w-1 bg-current rounded-full transition-all duration-300 ${
                                                            isTalking ? 'animate-vibrate text-red-400' : 'h-2 opacity-20 text-pink-400'
                                                        }`}
                                                        style={{ animationDelay: `${i * 0.1}s` }}
                                                    ></div>
                                                ))}
                                            </div>
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${isTalking ? 'text-red-400' : 'text-gray-500'}`}>
                                                {isTalking ? "Talking" : "Standby"}
                                            </span>
                                        </div>
                                    </button>

                                    <button 
                                        onClick={handleReset}
                                        className="group flex items-center gap-2 px-8 py-3 rounded-full border border-red-500/20 hover:border-red-500/50 transition-all active:scale-95"
                                    >
                                        <span className="text-[10px] text-red-500 font-black uppercase tracking-widest">
                                           Terminate Link
                                        </span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="mt-auto pt-4 border-t border-white/5 flex justify-between items-center">
                    <p className="text-[9px] text-gray-600 font-mono tracking-tighter uppercase italic">QAS-CORE v8.1 // AES-512</p>
                    <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-pulse"></div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes vibrate {
                    0%, 100% { height: 10px; }
                    50% { height: 32px; }
                }
                .animate-vibrate { animation: vibrate 0.4s ease-in-out infinite; }
            `}</style>

        </div>
    );
}