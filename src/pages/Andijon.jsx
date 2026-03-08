import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Ikonkalarni sozlash
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
const redIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: markerShadow,
    iconSize: [22, 36],
    iconAnchor: [11, 36],
    popupAnchor: [1, -34],
    shadowSize: [36, 36]
});

const andijanSectors = [
    { id: 1, name: "Andijan Central-Node", pos: [40.7833, 72.3333], address: "Andijon sh., Bobur shoh ko'chasi" },
    { id: 2, name: "Asaka Auto-Sector", pos: [40.6417, 72.2333], address: "Asaka sh., Sanoat hududi" },
    { id: 3, name: "Khanabad High-Ground", pos: [40.8000, 73.0000], address: "Xonobod sh., Sharqiy chegara stansiyasi" },
    { id: 4, name: "Shahrixon Transit-Link", pos: [40.7111, 72.0444], address: "Shahrixon, G'arbiy logistika markazi" },
    { id: 5, name: "Paxtaobod Northern-Unit", pos: [40.9333, 72.5000], address: "Paxtaobod, Shimoliy agro-korpus" },
    { id: 6, name: "Korasuv Border-Post", pos: [40.7167, 72.9667], address: "Qorasuv shahri, Bojxona terminali" },
    { id: 7, name: "Marhamat Southern-Relay", pos: [40.5000, 72.3333], address: "Marhamat tumani, Aloqa minorasi" }
];

export default function AndijanContact() {
    const [geoData, setGeoData] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [activeSignal, setActiveSignal] = useState(andijanSectors[Math.floor(Math.random() * andijanSectors.length)]);
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
                    f.properties.name_uz === "Andijon" || f.properties.name === "Andijan"
                );
                setGeoData(region);
            });
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => { clearInterval(timer); closeResources(); };
    }, []);

    // 2. Signal Skanerlash (Andijan high-speed frequency)
    useEffect(() => {
        const signalInterval = setInterval(() => {
            if (!isVoiceActive) {
                const randomIndex = Math.floor(Math.random() * andijanSectors.length);
                setActiveSignal(andijanSectors[randomIndex]);
            }
        }, 6000); // Andijon uchun tezroq skanerlash
        return () => clearInterval(signalInterval);
    }, [isVoiceActive]);

    // 3. Audio Engine & WebSocket
    const initConnection = () => {
        const socket = new WebSocket(`ws://localhost:8000`);
        socket.binaryType = 'arraybuffer';
        socketRef.current = socket;
        socket.onopen = () => console.log("✅ Andijan Industry-Link Active");
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
        if (mapRef.current) mapRef.current.flyTo([40.75, 72.45], 10.2, { duration: 2 });
    };

    return (
        <div className="flex h-screen font-sans overflow-hidden bg-black text-white">
            
            {/* 70% MAP MONITOR */}
            <div className="w-[70%] h-full flex flex-col relative z-10 border-r border-blue-500/20 shadow-[0_0_50px_rgba(37,99,235,0.2)]">
                <div className="p-4 bg-gray-900/95 backdrop-blur-xl flex justify-between items-center border-b border-blue-500/20">
                    <div>
                        <h1 className="text-xl font-black text-blue-400 uppercase tracking-tighter italic">Andijan Core Monitor</h1>
                        <div className="text-[10px] text-gray-500 font-mono tracking-[0.2em] uppercase flex items-center gap-2">
                            <span className={`w-2 h-2 ${isVoiceActive ? 'bg-red-500 animate-ping' : 'bg-blue-500 animate-pulse'} rounded-full`}></span>
                            {isVoiceActive ? "SECURE LINE: ESTABLISHED" : "BROADCASTING INDUSTRIAL NODES..."}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-mono text-blue-400">{currentTime.toLocaleTimeString('uz-UZ')}</div>
                    </div>
                </div>

                <div className="flex-grow p-4 bg-[#08080a]">
                    <div className="w-full h-full relative rounded-[2.5rem] overflow-hidden border border-blue-900/30">
                        <MapContainer 
                            center={[40.75, 72.45]} 
                            zoom={10.2} 
                            zoomControl={false}
                            style={{ height: '100%', width: '100%', background: '#000' }}
                            ref={mapRef}
                        >
                            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
                            <TileLayer url="https://mt1.google.com/vt/lyrs=h&x={x}&y={y}&z={z}" opacity={0.6} />
                            
                            {geoData && (
                                <GeoJSON 
                                    data={geoData} 
                                    style={{ color: '#60a5fa', weight: 2, fillOpacity: 0.05, dashArray: '5, 10' }} 
                                />
                            )}

                            {activeSignal && <Marker position={activeSignal.pos} icon={redIcon} />}
                        </MapContainer>
                        {/* Overlay grid effect */}
                        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] z-[1001]"></div>
                    </div>
                </div>
            </div>

            {/* 30% CONTROL INTERFACE */}
            <div className="w-[30%] h-full bg-[#0b0c0e] p-6 flex flex-col border-l border-blue-900/20">
                <h3 className="text-blue-500/60 text-xs font-black tracking-[0.4em] uppercase mb-8 border-b border-blue-500/10 pb-4 italic text-center">
                    System Node: AND-01
                </h3>

                <div className="flex-grow flex flex-col justify-start space-y-6">
                    {activeSignal && (
                        <div className="w-full space-y-6">
                            <div className="bg-blue-950/10 p-6 rounded-[2rem] border border-blue-500/20 space-y-4 relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
                                
                                <div>
                                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Active Sector</p>
                                    <h4 className="text-xl font-bold text-blue-300 tracking-tight">{activeSignal.name}</h4>
                                </div>
                                
                                <div className="border-t border-blue-900/30 pt-4">
                                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Coordinates Info</p>
                                    <p className="text-xs text-blue-200/50 font-mono mt-1 leading-relaxed italic">{activeSignal.address}</p>
                                </div>

                                {!isVoiceActive && (
                                    <button 
                                        onClick={handleContactClick}
                                        className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-xl font-black text-xs tracking-widest transition-all active:scale-95 shadow-[0_5px_20px_rgba(37,99,235,0.4)] uppercase text-white mt-2"
                                    >
                                        Establish Uplink
                                    </button>
                                )}
                            </div>

                            {isVoiceActive && (
                                <div className="flex flex-col items-center space-y-10 py-6 animate-in slide-in-from-right-8 duration-500">
                                    <div className="text-center">
                                        <div className="flex justify-center gap-1 mb-3">
                                            {[...Array(5)].map((_, i) => (
                                                <div key={i} className={`w-1 h-3 bg-blue-500 rounded-full ${isTalking ? 'animate-pulse' : 'opacity-20'}`} style={{ animationDelay: `${i * 0.1}s` }}></div>
                                            ))}
                                        </div>
                                        <span className={`text-[10px] font-mono tracking-[0.3em] ${isTalking ? 'text-blue-400' : 'text-blue-900'}`}>
                                            {isTalking ? "DATA PACKETS FLOWING" : "ENCRYPTED STANDBY"}
                                        </span>
                                    </div>

                                    <button 
                                        onClick={handleMicToggle}
                                        className={`relative w-40 h-40 rounded-full flex items-center justify-center transition-all duration-500 border-2 ${
                                            isTalking 
                                            ? 'bg-blue-500/10 border-blue-400 shadow-[0_0_60px_rgba(59,130,246,0.25)]' 
                                            : 'bg-black border-blue-900/40 hover:border-blue-500/50'
                                        }`}
                                    >
                                        {isTalking && <div className="absolute inset-0 rounded-full border border-blue-400 animate-ping opacity-10"></div>}
                                        
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="flex items-end gap-1.5 h-10">
                                                {[...Array(8)].map((_, i) => (
                                                    <div 
                                                        key={i} 
                                                        className={`w-1 bg-current rounded-full transition-all duration-300 ${
                                                            isTalking ? 'animate-vibrate text-blue-400' : 'h-1.5 opacity-10 text-blue-900'
                                                        }`}
                                                        style={{ animationDelay: `${i * 0.05}s` }}
                                                    ></div>
                                                ))}
                                            </div>
                                            <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${isTalking ? 'text-blue-400' : 'text-blue-900'}`}>
                                                {isTalking ? "Mute Stream" : "Start Voice"}
                                            </span>
                                        </div>
                                    </button>

                                    <button 
                                        onClick={handleReset}
                                        className="text-[10px] text-red-500/60 hover:text-red-500 font-black uppercase tracking-widest transition-all"
                                    >
                                       [ Terminate Connection ]
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="mt-auto pt-4 border-t border-blue-900/20 flex justify-between items-center opacity-40">
                    <p className="text-[9px] text-blue-600 font-mono">AND-OS v2.0 // INDUSTRIAL-NET</p>
                    <div className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_5px_cyan]"></div>
                </div>
            </div>

            <style>{`
                @keyframes vibrate {
                    0%, 100% { height: 8px; }
                    50% { height: 32px; }
                }
                .animate-vibrate { animation: vibrate 0.4s ease-in-out infinite; }
            `}</style>

        </div>
    );
}