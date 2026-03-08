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

const xorazmDevices = [
    { id: 1, name: "Urganch Hub-01", pos: [41.5500, 60.6333], address: "Urganch sh., Al-Xorazmiy ko'chasi" },
    { id: 2, name: "Xiva Digital-Fortress", pos: [41.3775, 60.3608], address: "Xiva sh., Ichan Qal'a majmuasi" },
    { id: 3, name: "Gurlan Node-03", pos: [41.8444, 60.5833], address: "Gurlan tumani, Sanoat zonasi" },
    { id: 4, name: "Shovot Transit-Unit", pos: [41.6944, 60.3000], address: "Shovot tumani, Temir yo'l stansiyasi" },
    { id: 5, name: "Hazorasp Energy-Grid", pos: [41.3167, 61.0833], address: "Hazorasp, Janubiy magistral" },
    { id: 6, name: "Xonqa Relay-Station", pos: [41.4833, 60.7667], address: "Xonqa tumani, Markaziy nuqta" },
    { id: 7, name: "Bog'ot Data-Center", pos: [41.3500, 60.8167], address: "Bog'ot tumani, Aloqa markazi" }
];

export default function XorazmContact() {
    const [geoData, setGeoData] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [activeSignal, setActiveSignal] = useState(xorazmDevices[Math.floor(Math.random() * xorazmDevices.length)]);
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

    // 1. GeoJSON va Soat (Toshkent kabi)
    useEffect(() => {
        fetch('https://raw.githubusercontent.com/crebor-online/uzbekistan-geojson/master/uzbekistan.json')
            .then(res => res.json())
            .then(data => {
                const region = data.features.find(f => f.properties.name_uz === "Xorazm" || f.properties.name === "Khorezm");
                setGeoData(region);
            });
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => { clearInterval(timer); closeResources(); };
    }, []);

    // 2. Random skanerlash (Toshkent kabi)
    useEffect(() => {
        const signalInterval = setInterval(() => {
            if (!isVoiceActive) {
                const randomIndex = Math.floor(Math.random() * xorazmDevices.length);
                setActiveSignal(xorazmDevices[randomIndex]);
            }
        }, 8000);
        return () => clearInterval(signalInterval);
    }, [isVoiceActive]);

    // 3. Audio va WebSocket JS mantiqi (Toshkent kodi bilan bir xil)
    const initConnection = () => {
        const socket = new WebSocket(`ws://localhost:8000`);
        socket.binaryType = 'arraybuffer';
        socketRef.current = socket;
        socket.onopen = () => console.log("✅ Xorazm Node Connected!");
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
        if (mapRef.current) mapRef.current.flyTo([41.5, 60.6], 9, { duration: 2 });
    };

    return (
        <div className="flex h-screen font-sans overflow-hidden bg-black text-white">
            
            {/* 70% XARITA PANELI */}
            <div className="w-[70%] h-full flex flex-col relative z-10 border-r border-cyan-500/20 shadow-[10px_0_40px_rgba(0,0,0,0.8)]">
                <div className="p-4 bg-gray-900/80 backdrop-blur-md flex justify-between items-center border-b border-cyan-500/20">
                    <div>
                        <h1 className="text-xl font-black text-cyan-400 tracking-tighter uppercase italic">Xorazm Sector</h1>
                        <div className="text-[10px] text-gray-400 font-mono tracking-widest uppercase flex items-center gap-2">
                            <span className={`w-2 h-2 ${isVoiceActive ? 'bg-red-500 animate-ping' : 'bg-green-500 animate-pulse'} rounded-full`}></span>
                            {isVoiceActive ? "Channel Established" : "Scanning All Nodes..."}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-mono text-cyan-400">{currentTime.toLocaleTimeString('uz-UZ')}</div>
                    </div>
                </div>

                <div className="flex-grow p-4">
                    <div className="w-full h-full relative rounded-[2rem] overflow-hidden border border-cyan-500/30">
                        <MapContainer 
                            center={[41.5, 60.6]} 
                            zoom={9} 
                            maxZoom={22}
                            zoomControl={false}
                            style={{ height: '100%', width: '100%', background: '#000' }}
                            ref={mapRef}
                        >
                            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
                            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png" opacity={1} />
                            
                            {geoData && (
                                <GeoJSON 
                                    data={geoData} 
                                    style={{ color: '#00fbff', weight: 3, fillOpacity: 0.1, dashArray: '5, 10' }} 
                                />
                            )}

                            {activeSignal && <Marker position={activeSignal.pos} icon={redIcon} />}
                        </MapContainer>
                    </div>
                </div>
            </div>

            {/* 30% BOSHQARUV PANELI */}
            <div className="w-[30%] h-full bg-[#0a0f14] p-6 flex flex-col border-l border-cyan-500/10">
                <h3 className="text-cyan-500 text-xs font-black tracking-[0.3em] uppercase mb-8 border-b border-cyan-500/20 pb-4 italic">
                    Active Signal Source
                </h3>

                <div className="flex-grow flex flex-col justify-start space-y-6">
                    {activeSignal && (
                        <div className="w-full space-y-6">
                            <div className="bg-gray-900/50 p-6 rounded-3xl border border-red-500/20 space-y-4 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-3">
                                     <div className={`h-2 w-2 ${isVoiceActive ? 'bg-green-500' : 'bg-red-500'} rounded-full animate-ping`}></div>
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Device Node</p>
                                    <h4 className="text-lg font-bold text-red-400">{activeSignal.name}</h4>
                                </div>
                                
                                <div className="border-t border-white/5 pt-3">
                                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Address</p>
                                    <p className="text-xs text-white/80 font-mono mt-1 leading-relaxed min-h-[40px]">{activeSignal.address}</p>
                                </div>

                                {!isVoiceActive && (
                                    <button 
                                        onClick={handleContactClick}
                                        className="w-full bg-red-600 hover:bg-red-500 py-4 rounded-2xl font-black text-xs tracking-widest transition-all active:scale-95 shadow-[0_0_30px_rgba(220,38,38,0.3)] uppercase"
                                    >
                                        Open Channel
                                    </button>
                                )}
                            </div>

                            {isVoiceActive && (
                                <div className="flex flex-col items-center space-y-6 py-4 animate-in slide-in-from-bottom duration-500">
                                    <div className="text-center">
                                        <span className={`text-[10px] font-mono tracking-widest ${isTalking ? 'text-green-400 animate-pulse' : 'text-gray-500'}`}>
                                            {isTalking ? "UPLINK ESTABLISHED" : "RECEIVING DATA"}
                                        </span>
                                    </div>

                                    <button 
                                        onClick={handleMicToggle}
                                        className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 border-2 ${
                                            isTalking 
                                            ? 'bg-green-500/20 border-green-400 shadow-[0_0_60px_rgba(34,197,94,0.5)] scale-110' 
                                            : 'bg-black border-cyan-500/30 hover:border-cyan-400'
                                        }`}
                                    >
                                        {isTalking && <div className="absolute inset-0 rounded-full border border-green-400 animate-ping opacity-20"></div>}
                                        
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="flex items-end gap-1 h-6">
                                                {[...Array(5)].map((_, i) => (
                                                    <div 
                                                        key={i} 
                                                        className={`w-1 bg-current rounded-full transition-all duration-300 ${
                                                            isTalking ? 'animate-grow text-green-400' : 'h-1.5 opacity-30 text-cyan-400'
                                                        }`}
                                                        style={{ animationDelay: `${i * 0.1}s` }}
                                                    ></div>
                                                ))}
                                            </div>
                                            <span className={`text-[9px] font-black uppercase tracking-tighter ${isTalking ? 'text-green-400' : 'text-gray-500'}`}>
                                                {isTalking ? "Broadcasting..." : "Mic Off"}
                                            </span>
                                        </div>
                                    </button>

                                    <button 
                                        onClick={handleReset}
                                        className="group flex items-center gap-2 bg-gray-800/30 hover:bg-red-900/20 border border-white/5 px-6 py-3 rounded-xl transition-all active:scale-95"
                                    >
                                        <span className="text-[10px] text-gray-400 group-hover:text-red-400 font-black uppercase tracking-[0.2em]">
                                           Close Link & Scan
                                        </span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="mt-auto pt-4 border-t border-white/5">
                    <p className="text-[9px] text-gray-600 font-mono italic tracking-tighter">Node ID: {activeSignal?.id * 2048} // Global Encryption</p>
                </div>
            </div>

            <style>{`
                @keyframes grow {
                    0%, 100% { transform: scaleY(1); }
                    50% { transform: scaleY(2.5); }
                }
                .animate-grow { animation: grow 0.6s ease-in-out infinite; }
            `}</style>

        </div>
    );
}