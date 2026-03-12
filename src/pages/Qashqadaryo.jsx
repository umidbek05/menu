import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Circle, useMapEvents, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Marker ikonkasini sozlash
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
const greenIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Qashqadaryo uchun default qurilmalar
const qashqaDevices = [
    { id: 1, name: "Qarshi Central-Node", lat: 38.8612, lng: 65.7847, address: "Qarshi sh., Mustaqillik shoh ko'chasi" },
    { id: 2, name: "Muborak Gas-Sector", lat: 39.2556, lng: 65.1528, address: "Muborak tumani, Sanoat zonasi A-5" },
    { id: 3, name: "Shahrisabz Tourist-Hub", lat: 39.0583, lng: 66.8333, address: "Shahrisabz sh., Oqsaroy majmuasi" },
    { id: 4, name: "Sho'rtan Chemical-Unit", lat: 38.6214, lng: 66.2481, address: "G'uzor tumani, Sho'rtan gaz-kimyo" },
    { id: 5, name: "Kitob Astro-Node", lat: 39.1167, lng: 66.8833, address: "Kitob tumani, Balandlik stansiyasi" },
    { id: 6, name: "Koson Relay-Station", lat: 39.0333, lng: 65.4500, address: "Koson tumani, Shimoliy magistral" },
    { id: 7, name: "Dehqonobod Salt-Mine", lat: 38.3500, lng: 66.4500, address: "Dehqonobod, Janubiy sanoat tuguni" }
];

// Xaritadan nuqta tanlash komponenti
function MapPicker({ onPick }) {
    useMapEvents({
        click(e) {
            onPick(e.latlng);
        },
    });
    return null;
}

export default function QashqadaryoContact() {
    const [geoData, setGeoData] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isVoiceActive, setIsVoiceActive] = useState(false);
    const [showArchive, setShowArchive] = useState(false);
    
    // Yangi joy qo'shish uchun Modal holati
    const [showAddModal, setShowAddModal] = useState(false);
    const [tempCoords, setTempCoords] = useState(null);
    const [formData, setFormData] = useState({ name: '', sector: '', description: '' });

    const [savedLocations, setSavedLocations] = useState(() => {
        const saved = localStorage.getItem('qashqadaryoLocations');
        if (saved) return JSON.parse(saved);
        
        // Agar localStorage bo'sh bo'lsa, Qashqadaryo qurilmalarini default qilib qo'yish
        return qashqaDevices.map(device => ({
            ...device,
            sector: device.name.split(' ')[0] || "Qashqadaryo",
            description: device.address,
            id: `LOC-${device.id}`,
            recordings: []
        }));
    });

    const [linkedNode, setLinkedNode] = useState(() => {
        const saved = localStorage.getItem('qashqadaryoLinkedNode');
        return saved ? JSON.parse(saved) : null;
    });

    const mapRef = useRef(null);
    const socketRef = useRef(null);
    const audioContextRef = useRef(null);
    const mediaStreamRef = useRef(null);
    const processorRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    useEffect(() => {
        localStorage.setItem('qashqadaryoLocations', JSON.stringify(savedLocations));
    }, [savedLocations]);

    // Modalni ochish funksiyasi
    const handleMapPick = (latlng) => {
        setTempCoords(latlng);
        setShowAddModal(true);
    };

    const handleManualAdd = () => {
        const center = mapRef.current ? mapRef.current.getCenter() : { lat: 38.85, lng: 66.15 };
        setTempCoords(center);
        setShowAddModal(true);
    };

    // Yangi manzilni qidirib saqlash (geocoding bilan)
    const saveNewLocation = async (e) => {
        e.preventDefault();
        if (!formData.name) return;

        let finalCoords = tempCoords;

        try {
            // Nominatim API orqali kiritilgan manzil nomini koordinataga aylantirish
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.name + " Qashqadaryo")}&limit=1`
            );
            const data = await response.json();

            if (data && data.length > 0) {
                // Agar manzil topilsa, yangi koordinatalarni o'rnatamiz
                finalCoords = {
                    lat: parseFloat(data[0].lat),
                    lng: parseFloat(data[0].lon)
                };
            }
        } catch (error) {
            console.error("Geocoding xatosi:", error);
            // Xato bo'lsa tempCoords (tanlangan nuqta) qolaveradi
        }

        const newLoc = {
            ...finalCoords,
            ...formData,
            id: `LOC-${Date.now()}`,
            recordings: []
        };

        setSavedLocations(prev => [...prev, newLoc]);
        setShowAddModal(false);
        setFormData({ name: '', sector: '', description: '' });
        
        // Xaritani yangi manzilga uchib borishi
        if (mapRef.current) mapRef.current.flyTo([newLoc.lat, newLoc.lng], 16);
    };

    // Audio to'xtatish
    const stopAudio = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        if (processorRef.current) { processorRef.current.disconnect(); processorRef.current = null; }
        if (mediaStreamRef.current) { mediaStreamRef.current.getTracks().forEach(track => track.stop()); mediaStreamRef.current = null; }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') { audioContextRef.current.close(); audioContextRef.current = null; }
    };

    // Audio boshlash
    const startAudio = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
            const source = audioContextRef.current.createMediaStreamSource(stream);
            processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
            
            processorRef.current.onaudioprocess = (e) => {
                if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
                    const inputData = e.inputBuffer.getChannelData(0);
                    const pcmData = new Int16Array(inputData.length);
                    for (let i = 0; i < inputData.length; i++) {
                        pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
                    }
                    socketRef.current.send(pcmData.buffer);
                }
            };
            source.connect(processorRef.current);
            processorRef.current.connect(audioContextRef.current.destination);

            audioChunksRef.current = [];
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };
            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = () => {
                    const base64Audio = reader.result;
                    const timestamp = new Date().toLocaleString();
                    setSavedLocations(prev => prev.map(loc => 
                        loc.id === linkedNode?.id 
                        ? { ...loc, recordings: [{ id: Date.now(), data: base64Audio, time: timestamp }, ...(loc.recordings || [])] } 
                        : loc
                    ));
                };
            };
            mediaRecorder.start();
        } catch (err) { console.error("Mikrofon xatosi."); }
    };

    // Yozuvni o'chirish
    const deleteRecording = (locId, recId) => {
        if(window.confirm("Ushbu yozuvni o'chirmoqchimisiz?")) {
            setSavedLocations(prev => prev.map(loc => 
                loc.id === locId ? { ...loc, recordings: loc.recordings.filter(r => r.id !== recId) } : loc
            ));
        }
    };

    // Bog'lanishni yopish
    const handleCloseConnection = () => {
        stopAudio();
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({ type: 'close', deviceId: linkedNode?.description }));
        }
        if (mapRef.current) mapRef.current.flyTo([38.85, 66.15], 10, { duration: 1.5 });
        setLinkedNode(null);
        setIsVoiceActive(false);
        localStorage.removeItem('qashqadaryoLinkedNode');
    };

    // Manzilni o'chirish
    const handleDeleteLocation = (locId) => {
        if (window.confirm("Ushbu manzil va unga tegishli barcha yozuvlar o'chib ketadi. Rozimisiz?")) {
            setSavedLocations(prev => prev.filter(l => l.id !== locId));
            if (linkedNode?.id === locId) handleCloseConnection();
        }
    };

    // Bog'lanish o'rnatish
    const handleEstablishLink = (location) => {
        const deviceId = "DEV-QASHQADARYO-" + location.id.split('-')[1];
        const newNode = { ...location, pos: { lat: location.lat, lng: location.lng }, deviceId: deviceId };
        setLinkedNode(newNode);
        localStorage.setItem('qashqadaryoLinkedNode', JSON.stringify(newNode));
        if (mapRef.current) mapRef.current.flyTo([location.lat, location.lng], 16, { duration: 1.5 });
    };

    // Ovozni yoqish/o'chirish
    const toggleVoice = () => {
        if (!linkedNode) return;
        const nextState = !isVoiceActive;
        setIsVoiceActive(nextState);
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({ 
                type: nextState ? 'authorize' : 'close', 
                deviceId: linkedNode.deviceId,
                status: nextState ? 'start' : 'stop'
            }));
        }
        if (nextState) startAudio(); else stopAudio();
    };

    // WebSocket va GeoJSON yuklash
    useEffect(() => {
        fetch('https://raw.githubusercontent.com/crebor-online/uzbekistan-geojson/master/uzbekistan.json')
            .then(res => res.json())
            .then(data => {
                const region = data.features.find(f => 
                    f.properties.name_uz === "Qashqadaryo" || 
                    f.properties.name === "Qashqadaryo" || 
                    f.properties.name === "Kashkadarya"
                );
                setGeoData(region);
            });
        
        const ws = new WebSocket(`ws://${window.location.hostname}:80`);
        socketRef.current = ws;
        ws.onopen = () => ws.send(JSON.stringify({ type: 'frontend' }));
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'list') setDevices(data.devices);
            } catch (e) {}
        };
        
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => { clearInterval(timer); if (ws) ws.close(); stopAudio(); };
    }, []);

    return (
        <div className="flex h-screen bg-black text-white font-sans overflow-hidden relative">
            
            {/* 1. XARITA QISMI */}
            <div className="w-[70%] h-full flex flex-col relative border-r border-emerald-500/20">
                <div className="p-4 bg-gray-900/90 backdrop-blur-md flex justify-between items-center border-b border-emerald-500/20 z-[1000]">
                    <div>
                        <h1 className="text-xl font-black text-emerald-400 uppercase italic tracking-tighter">Qashqadaryo Signal Mapper</h1>
                        <p className={`text-[9px] font-mono italic ${isVoiceActive ? 'text-red-500 animate-pulse' : 'text-gray-500'}`}>
                            {isVoiceActive ? `● TRANSMITTING TO: ${linkedNode?.name}` : "TIZIM ONLAYN | XARITADAN TANLANG"}
                        </p>
                    </div>
                    <div className="text-2xl font-mono text-emerald-400">{currentTime.toLocaleTimeString('uz-UZ')}</div>
                </div>

                <div className="flex-grow relative">
                    <MapContainer center={[38.85, 66.15]} zoom={10} style={{ height: '100%', background: '#050505' }} ref={mapRef} zoomControl={false}>
                        <TileLayer 
                            url="https://{s}.google.com/vt/lyrs=y,h&x={x}&y={y}&z={z}"
                            subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
                            attribution='&copy; Google Maps'
                        />
                        {geoData && <GeoJSON data={geoData} style={{ color: '#10B981', weight: 2, fillOpacity: 0.05 }} />}
                        
                        <MapPicker onPick={handleMapPick} />

                        {savedLocations.map(loc => (
                            <Marker key={loc.id} position={[loc.lat, loc.lng]} icon={greenIcon}>
                                <Tooltip direction="top" offset={[0, -40]} opacity={1} permanent className="custom-tooltip">
                                    <div className="px-2 py-1 bg-black/60 backdrop-blur-sm border border-emerald-500/30 rounded-full">
                                        <span className="text-[10px] font-black uppercase text-emerald-400 tracking-tighter">{loc.name}</span>
                                    </div>
                                </Tooltip>
                            </Marker>
                        ))}

                        {isVoiceActive && linkedNode && (
                            <Circle center={linkedNode.pos || [linkedNode.lat, linkedNode.lng]} radius={180} pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.3 }} />
                        )}
                    </MapContainer>
                </div>
            </div>


            {/* 2. O'NG PANELDAGI QURILMALAR RO'YXATI */}
            <div className="w-[30%] bg-[#080d0b] p-6 flex flex-col gap-6">
                <div className="flex justify-between items-center border-b border-emerald-500/20 pb-4">
                    <div className="flex flex-col">
                        <h3 className="text-emerald-500 text-[10px] font-black tracking-[0.3em] uppercase italic">Qashqadaryo Manzillar</h3>
                        <button onClick={() => setShowArchive(true)} className="text-[8px] text-emerald-300/50 hover:text-emerald-300 uppercase font-bold mt-1 transition-colors text-left">📜 Arxivni ko'rish</button>
                    </div>
                    <button onClick={handleManualAdd} className="bg-emerald-500 hover:bg-emerald-400 text-black w-8 h-8 rounded-full flex items-center justify-center font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.4)]">+</button>
                </div>

                <div className="flex-grow overflow-y-auto space-y-4 custom-scrollbar pr-2">
                    {savedLocations.length === 0 ? (
                        <div className="text-center py-10 text-gray-600 italic text-xs">Hozircha manzillar yo'q.</div>
                    ) : (
                        savedLocations.map(loc => (
                            <div key={loc.id} className={`p-5 rounded-3xl border transition-all duration-500 relative ${linkedNode?.id === loc.id ? 'bg-emerald-500/10 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.15)]' : 'bg-black/40 border-emerald-500/20'}`}>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleDeleteLocation(loc.id); }}
                                    className="absolute top-4 right-4 text-gray-600 hover:text-red-500 transition-colors"
                                >✕</button>
                                <div className="mb-4 pr-6 cursor-pointer" onClick={() => mapRef.current.flyTo([loc.lat, loc.lng], 16)}>
                                    <h4 className="font-bold text-emerald-400 text-sm uppercase truncate">{loc.name}</h4>
                                    <p className="text-[10px] text-emerald-200/60 font-mono italic truncate">{loc.sector} | {loc.description}</p>
                                </div>
                                {linkedNode?.id !== loc.id ? (
                                    <button onClick={() => handleEstablishLink(loc)} className="w-full bg-emerald-900/30 hover:bg-emerald-600 border border-emerald-500/30 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Bog'lanish</button>
                                ) : (
                                    <div className="flex gap-2">
                                        <button onClick={() => {
                                            const nextState = !isVoiceActive;
                                            setIsVoiceActive(nextState);
                                            if (nextState) startAudio(); else stopAudio();
                                        }} className={`flex-grow py-3 rounded-xl text-[10px] font-black uppercase transition-all ${isVoiceActive ? 'bg-red-600 animate-pulse' : 'bg-emerald-600 hover:bg-emerald-500'}`}>
                                            {isVoiceActive ? 'Yozuvni To\'xtatish' : 'Ovozli Aloqa'}
                                        </button>
                                        <button onClick={handleCloseConnection} className="px-4 bg-red-900/20 text-red-500 rounded-xl border border-red-500/20 text-[9px] font-black uppercase">Uzish</button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>


            {/* 3. YANGI MANZIL QO'SHISH MODALI */}
            {showAddModal && (
                <div className="absolute inset-0 z-[3000] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
                    <form onSubmit={saveNewLocation} className="bg-[#0c1410] border border-emerald-500/40 p-8 rounded-[32px] w-full max-w-md shadow-2xl scale-in">
                        <h2 className="text-emerald-400 text-xl font-black uppercase italic mb-6 tracking-widest">Yangi nuqta qo'shish</h2>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-[9px] text-emerald-500/60 uppercase font-bold ml-2">Manzil nomi (Qidiriladi)</label>
                                <input required autoFocus className="w-full bg-black/40 border border-emerald-500/20 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 outline-none transition-all" 
                                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Masalan: Qarshi Markaz" />
                            </div>
                            <div>
                                <label className="text-[9px] text-emerald-500/60 uppercase font-bold ml-2">Sektor / Qurilma</label>
                                <input className="w-full bg-black/40 border border-emerald-500/20 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 outline-none transition-all" 
                                    value={formData.sector} onChange={e => setFormData({...formData, sector: e.target.value})} placeholder="Sektor-A1" />
                            </div>
                            <div>
                                <label className="text-[9px] text-emerald-500/60 uppercase font-bold ml-2">Tavsif</label>
                                <textarea className="w-full bg-black/40 border border-emerald-500/20 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 outline-none transition-all h-20" 
                                    value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Qisqacha ma'lumot..." />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 rounded-xl border border-emerald-500/20 text-xs font-bold uppercase hover:bg-red-500/10 hover:text-red-500 transition-all">Bekor qilish</button>
                            <button type="submit" className="flex-1 py-3 rounded-xl bg-emerald-500 text-black text-xs font-black uppercase hover:bg-emerald-400 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]">Saqlash</button>
                        </div>
                    </form>
                </div>
            )}


            {/* 4. ARXIV MODAL OYNASI */}
            {showArchive && (
                <div className="absolute inset-0 z-[2000] bg-black/80 backdrop-blur-xl flex items-center justify-center p-10">
                    <div className="bg-[#0c1410] border border-emerald-500/30 w-full max-w-4xl h-[80vh] rounded-[40px] flex flex-col overflow-hidden shadow-[0_0_50px_rgba(0,0,0,1)]">
                        <div className="p-6 border-b border-emerald-500/10 flex justify-between items-center bg-emerald-500/5">
                            <div>
                                <h2 className="text-emerald-400 text-xl font-black uppercase italic tracking-widest">Suhbatlar Arxivi</h2>
                                <p className="text-[10px] text-gray-500 font-mono">Barcha saqlangan audio ma'lumotlar bazasi</p>
                            </div>
                            <button onClick={() => setShowArchive(false)} className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white w-10 h-10 rounded-full flex items-center justify-center transition-all border border-red-500/20">✕</button>
                        </div>
                        <div className="flex-grow overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-4 custom-scrollbar">
                            {savedLocations.some(l => l.recordings?.length > 0) ? (
                                savedLocations.map(loc => loc.recordings?.length > 0 && (
                                    <div key={loc.id} className="bg-black/40 border border-emerald-500/10 p-5 rounded-[30px]">
                                        <h3 className="text-emerald-500 font-bold text-xs uppercase mb-3 border-b border-emerald-500/5 pb-2">{loc.name}</h3>
                                        <div className="space-y-3">
                                            {loc.recordings.map(rec => (
                                                <div key={rec.id} className="bg-emerald-500/5 p-3 rounded-2xl border border-emerald-500/5 group">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-[8px] text-gray-400 font-mono">{rec.time}</span>
                                                        <button onClick={() => deleteRecording(loc.id, rec.id)} className="text-[8px] text-red-500 uppercase font-bold opacity-0 group-hover:opacity-100 transition-opacity">O'chirish</button>
                                                    </div>
                                                    <audio src={rec.data} controls className="w-full h-8 opacity-70 hover:opacity-100 transition-all" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full flex flex-col items-center justify-center text-gray-600 italic py-20">
                                    <p>Arxiv bo'sh. Hali hech qanday suhbat yozib olinmagan.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}


            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #10b981; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: #1a2a24; }
                .animate-pulse { animation: pulse 1s infinite; }
                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
                audio::-webkit-media-controls-panel { background-color: #10b981; border-radius: 10px; }
                .scale-in { animation: scaleIn 0.2s ease-out; }
                @keyframes scaleIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                
                .leaflet-tooltip.custom-tooltip {
                    background: transparent;
                    border: none;
                    box-shadow: none;
                    padding: 0;
                }
                .leaflet-tooltip-top:before {
                    border-top-color: rgba(16, 185, 129, 0.4);
                }
            `}</style>
        </div>
    );
}