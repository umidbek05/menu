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

// Sirdaryo qurilmalari
const sirdaryoDevices = [
    { id: 1, name: "Guliston Central-Hub", lat: 40.4897, lng: 68.7848, address: "Guliston sh., Sayhun ko'chasi" },
    { id: 2, name: "Yangiyer Industrial-Node", lat: 40.2667, lng: 68.8333, address: "Yangiyer sh., Sanoat zonasi" },
    { id: 3, name: "Sirdaryo Transit-Unit", lat: 40.8500, lng: 68.6667, address: "Sirdaryo tumani, M-39 trassasi" },
    { id: 4, name: "Shirin Power-Grid", lat: 40.2167, lng: 69.1333, address: "Shirin sh., Sirdaryo IES hududi" },
    { id: 5, name: "Xovos Railway-Link", lat: 40.2000, lng: 68.6667, address: "Xovos tumani, Logistika markazi" },
    { id: 6, name: "Sardoba Water-Control", lat: 40.2333, lng: 68.1667, address: "Sardoba, Gidrotexnika majmuasi" },
    { id: 7, name: "Oqoltin Agromar-Node", lat: 40.4667, lng: 68.1833, address: "Oqoltin tumani, Markaziy nuqta" }
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

export default function SirdaryoContact() {
    const [geoData, setGeoData] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isVoiceActive, setIsVoiceActive] = useState(false);
    const [showArchive, setShowArchive] = useState(false);
    const [espDevices, setEspDevices] = useState([]); // ✅ QO'SHILDI
    
    // Yangi joy qo'shish uchun Modal holati
    const [showAddModal, setShowAddModal] = useState(false);
    const [tempCoords, setTempCoords] = useState(null);
    const [formData, setFormData] = useState({ name: '', sector: '', description: '' });
    const [editingId, setEditingId] = useState(null); // ✅ QO'SHILDI

    const [savedLocations, setSavedLocations] = useState(() => {
        const saved = localStorage.getItem('sirdaryoLocations');
        if (saved) return JSON.parse(saved);
        
        // Agar localStorage bo'sh bo'lsa, Sirdaryo qurilmalarini default qilib qo'yish
        return sirdaryoDevices.map(device => ({
            ...device,
            sector: device.name.split(' ')[0] || "Sirdaryo",
            description: device.address,
            id: `LOC-${device.id}`,
            recordings: []
        }));
    });

    const [linkedNode, setLinkedNode] = useState(() => {
        const saved = localStorage.getItem('sirdaryoLinkedNode');
        return saved ? JSON.parse(saved) : null;
    });

    const mapRef = useRef(null);
    const socketRef = useRef(null);
    const audioContextRef = useRef(null);
    const mediaStreamRef = useRef(null);
    const processorRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const audioBufferRef = useRef(null); // ✅ Ringtone audio bufferni saqlash uchun
    const audioSourceRef = useRef(null); // ✅ Audio source ni saqlash uchun

    // ✅ RINGTON OVOZI - Xorazm bilan bir xil
    const createRingtoneSound = () => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        const ctx = audioContextRef.current;
        const duration = 4; // 4 sekund
        const sampleRate = ctx.sampleRate;
        const frameCount = sampleRate * duration;
        
        // Audio buffer yaratish
        const audioBuffer = ctx.createBuffer(1, frameCount, sampleRate);
        const channelData = audioBuffer.getChannelData(0);
        
        // Telefon jiringlash ovozini yaratish (ikki tonli ringtone)
        for (let i = 0; i < frameCount; i++) {
            const t = i / sampleRate; // Vaqt (sekundlarda)
            
            // Ringtone pattern: 0.4 sekund tovush, 0.2 sekund pauza
            const pattern = Math.floor(t * 1.6) % 2; // 0 va 1 oralig'ida
            
            let value = 0;
            
            if (pattern === 0) {
                // Birinchi ton (musiqiy nota) - 440Hz (A nota)
                const freq1 = 440;
                const note1 = Math.sin(2 * Math.PI * freq1 * t);
                
                // Ikkinchi ton (musiqiy nota) - 554Hz (C# nota) - harmonik
                const freq2 = 554;
                const note2 = Math.sin(2 * Math.PI * freq2 * t * 2) * 0.5;
                
                // Uchinchi ton - 880Hz (oktava)
                const freq3 = 880;
                const note3 = Math.sin(2 * Math.PI * freq3 * t * 1.5) * 0.3;
                
                value = (note1 * 0.6) + (note2 * 0.3) + (note3 * 0.2);
            } else {
                // Pauza - juda past ovoz
                value = Math.sin(2 * Math.PI * 100 * t) * 0.05; // Zo'rg'a eshitiladigan shovqin
            }
            
            // Ovoz balandligini asta-sekin oshirib, keyin pasaytirish (fade in/out)
            const fadeIn = Math.min(1, t / 0.1); // 0.1 sekund fade in
            const fadeOut = Math.min(1, (duration - t) / 0.1); // 0.1 sekund fade out
            const envelope = fadeIn * fadeOut;
            
            channelData[i] = value * envelope * 0.2; // 20% balandlikda - MAYIN RINGTON
        }
        
        return audioBuffer;
    };

    // ✅ RINGTON OVOZINI IJRO ETISH - Xorazm bilan bir xil
    const playRingtoneSound = () => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        const ctx = audioContextRef.current;
        
        // Audio context ni resume qilish (agar suspended bo'lsa)
        if (ctx.state === 'suspended') {
            ctx.resume();
        }
        
        // Buffer yaratish (agar mavjud bo'lmasa)
        if (!audioBufferRef.current) {
            audioBufferRef.current = createRingtoneSound();
        }
        
        // Avvalgi ovozni to'xtatish
        if (audioSourceRef.current) {
            try {
                audioSourceRef.current.stop();
            } catch (e) {
                // Stop qilishda xatolik bo'lsa ignore qilish
            }
        }
        
        // Yangi audio source yaratish
        audioSourceRef.current = ctx.createBufferSource();
        audioSourceRef.current.buffer = audioBufferRef.current;
        audioSourceRef.current.loop = false; // Bir marta ijro etish
        audioSourceRef.current.connect(ctx.destination);
        
        // Ovoz tugagach resourcelarni tozalash
        audioSourceRef.current.onended = () => {
            audioSourceRef.current = null;
        };
        
        // Ovozni ijro etish
        audioSourceRef.current.start();
        
        console.log("📱 Mayin rington: YANGI QURILMA SO'ROVI KELDI - SIRDARYO");
    };

    // ✅ STOP ALL SOUNDS - Xorazm bilan bir xil
    const stopAllSounds = () => {
        if (audioSourceRef.current) {
            try {
                audioSourceRef.current.stop();
                audioSourceRef.current = null;
            } catch (e) {
                // Stop qilishda xatolik bo'lsa ignore qilish
            }
        }
    };

    useEffect(() => {
        localStorage.setItem('sirdaryoLocations', JSON.stringify(savedLocations));
    }, [savedLocations]);

    // ✅ AVTOMATIK QIDIRUV DEBOUNCE - Xorazm bilan bir xil
    useEffect(() => {
        if (
            !showAddModal ||
            !formData.name ||
            formData.name.length < 5 ||
            formData.name === "Yuklanmoqda..."
        ) {
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            try {
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
                        formData.name + " Sirdaryo"
                    )}&limit=1`
                );
                const data = await response.json();

                if (data && data.length > 0) {
                    const newCoords = {
                        lat: parseFloat(data[0].lat),
                        lng: parseFloat(data[0].lon),
                    };

                    setTempCoords(newCoords);

                    if (mapRef.current) {
                        mapRef.current.flyTo([newCoords.lat, newCoords.lng], 16);
                    }
                }
            } catch (error) {
                console.error("Avtomatik qidiruvda xato:", error);
            }
        }, 1000);

        return () => clearTimeout(delayDebounceFn);
    }, [formData.name, showAddModal]);

    // ✅ MARKERNI BOSGANDA TAHRIRLASH - Xorazm bilan bir xil
    const handleMarkerClick = (location) => {
        setEditingId(location.id);
        setTempCoords({ lat: location.lat, lng: location.lng });
        setFormData({
            name: location.name,
            sector: location.sector,
            description: location.description
        });
        setShowAddModal(true);
        
        // Xaritani marker joyiga markazlashtirish
        if (mapRef.current) {
            mapRef.current.flyTo([location.lat, location.lng], 16, { duration: 1 });
        }
    };

    // ✅ YANGI NUQTA QO'SHISH - Xorazm bilan bir xil
    const handleMapPick = async (latlng) => {
        setEditingId(null);
        setTempCoords(latlng);
        setShowAddModal(true);
        setFormData((prev) => ({ ...prev, name: "Yuklanmoqda..." }));

        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latlng.lat}&lon=${latlng.lng}`
            );
            const data = await response.json();

            if (data && data.display_name) {
                setFormData((prev) => ({
                    ...prev,
                    name: data.display_name,
                    sector:
                        data.address.suburb ||
                        data.address.city_district ||
                        data.address.town ||
                        data.address.village ||
                        "",
                }));
            }
        } catch (error) {
            console.error("Manzilni aniqlashda xato:", error);
            setFormData((prev) => ({ ...prev, name: "" }));
        }
    };

    // ✅ MANUAL QO'SHISH
    const handleManualAdd = () => {
        setEditingId(null);
        const center = mapRef.current ? mapRef.current.getCenter() : { lat: 40.5, lng: 68.65 };
        setTempCoords(center);
        setShowAddModal(true);
        setFormData((prev) => ({ ...prev, name: "" }));
    };

    // ✅ REAL TIME QIDIRUV - Xorazm bilan bir xil
    const searchAddressRealTime = async (address) => {
        if (address.length < 4) return;

        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
                    address + " Sirdaryo"
                )}&limit=1`
            );
            const data = await response.json();

            if (data && data.length > 0) {
                const newCoords = {
                    lat: parseFloat(data[0].lat),
                    lng: parseFloat(data[0].lon),
                };

                setTempCoords(newCoords);

                if (mapRef.current) {
                    mapRef.current.panTo([newCoords.lat, newCoords.lng]);
                }
            }
        } catch (error) {
            console.error("Qidiruvda xatolik:", error);
        }
    };

    // ✅ SAQLASH FUNKSIYASI - Xorazm bilan bir xil
    const saveNewLocation = async (e) => {
        e.preventDefault();
        if (!formData.name || !tempCoords) {
            alert("❌ Iltimos, manzilni to'liq kiriting yoki xaritadan nuqta tanlang!");
            return;
        }

        if (formData.name === "Yuklanmoqda...") {
            alert("⏳ Manzil aniqlanmoqda, biroz kuting...");
            return;
        }

        if (editingId) {
            // Tahrirlash - mavjud manzilni yangilash
            setSavedLocations(prev => prev.map(loc => 
                loc.id === editingId 
                    ? { 
                        ...loc, 
                        name: formData.name,
                        sector: formData.sector,
                        description: formData.description,
                        lat: tempCoords.lat,
                        lng: tempCoords.lng
                      } 
                    : loc
            ));
            alert("✅ Manzil muvaffaqiyatli tahrirlandi!");
        } else {
            // Yangi qo'shish
            const newLoc = {
                id: `LOC-${Date.now()}`,
                name: formData.name,
                sector: formData.sector,
                description: formData.description,
                lat: tempCoords.lat,
                lng: tempCoords.lng,
                recordings: []
            };
            
            setSavedLocations(prev => [...prev, newLoc]);
            alert("✅ Yangi manzil muvaffaqiyatli qo'shildi!");
        }
        
        // Modalni yopish va tozalash
        setShowAddModal(false);
        setFormData({ name: '', sector: '', description: '' });
        setTempCoords(null);
        setEditingId(null);
    };

    // ✅ STOP AUDIO - Xorazm bilan bir xil
    const stopAudio = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        if (processorRef.current) { processorRef.current.disconnect(); processorRef.current = null; }
        if (mediaStreamRef.current) { mediaStreamRef.current.getTracks().forEach(track => track.stop()); mediaStreamRef.current = null; }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') { 
            audioContextRef.current.close(); 
            audioContextRef.current = null; 
        }
        setIsVoiceActive(false);
        stopAllSounds(); // ✅ Barcha ovozlarni to'xtatish
    };

    // ✅ START AUDIO - Xorazm bilan bir xil
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
            setIsVoiceActive(true);
        } catch (err) { console.error("Mikrofon xatosi."); }
    };

    // ✅ DELETE RECORDING - Xorazm bilan bir xil
    const deleteRecording = (locId, recId) => {
        if(window.confirm("Ushbu yozuvni o'chirmoqchimisiz?")) {
            setSavedLocations(prev => prev.map(loc => 
                loc.id === locId ? { ...loc, recordings: loc.recordings.filter(r => r.id !== recId) } : loc
            ));
        }
    };

    // ✅ DELETE LOCATION - Xorazm bilan bir xil
    const handleDeleteLocation = (locId) => {
        if (window.confirm("Ushbu manzil va unga tegishli barcha yozuvlar o'chib ketadi. Rozimisiz?")) {
            setSavedLocations(prev => prev.filter(l => l.id !== locId));
            if (linkedNode?.id === locId) handleCloseConnection();
        }
    };

    // ✅ CLOSE CONNECTION - Xorazm bilan bir xil
    const handleCloseConnection = () => {
        stopAudio();
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({ type: 'close', deviceId: linkedNode?.deviceId }));
        }
        if (mapRef.current) mapRef.current.flyTo([40.5, 68.65], 10, { duration: 1.5 });
        setLinkedNode(null);
        setIsVoiceActive(false);
        localStorage.removeItem('sirdaryoLinkedNode');
    };

    // ✅ AUTHORIZE - Xorazm bilan bir xil
    const handleAuthorize = (deviceId) => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({ type: 'authorize', deviceId: deviceId }));
        }
    };

    // ✅ ESTABLISH LINK - Xorazm bilan bir xil
    const handleEstablishLink = (location) => {
        const deviceIndex = savedLocations.findIndex(l => l.id === location.id);
        const device = espDevices[deviceIndex];
        
        if (!device) {
            alert("❌ Qurilma topilmadi");
            return;
        }

        if (device.status === 'pending') {
            handleAuthorize(device.id);
            alert("⏳ Ruxsat so'rovi yuborildi. Iltimos, kuting...");
            return;
        }

        if (device.status === 'active') {
            const newNode = { ...location, pos: { lat: location.lat, lng: location.lng }, deviceId: device.id };
            setLinkedNode(newNode);
            localStorage.setItem('sirdaryoLinkedNode', JSON.stringify(newNode));
            if (mapRef.current) mapRef.current.flyTo([location.lat, location.lng], 16, { duration: 1.5 });
        }
    };

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (showAddModal && formData.name && formData.name.length > 4 && formData.name !== "Yuklanmoqda...") {
                searchAddressRealTime(formData.name);
            }
        }, 1000);

        return () => clearTimeout(delayDebounceFn);
    }, [formData.name, showAddModal]);

    useEffect(() => {
        fetch('https://raw.githubusercontent.com/crebor-online/uzbekistan-geojson/master/uzbekistan.json')
            .then(res => res.json())
            .then(data => {
                const region = data.features.find(f => 
                    f.properties.name_uz === "Sirdaryo" || 
                    f.properties.name === "Sirdaryo" || 
                    f.properties.name === "Syrdarya"
                );
                setGeoData(region);
            });

        // ✅ WEB SOCKET - Xorazm bilan bir xil
        const ws = new WebSocket(`ws://${window.location.hostname}:80`);
        ws.onopen = () => {
            ws.send(JSON.stringify({ type: 'frontend' }));
        };
        
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                if (data.type === 'list') {
                    // Yangi qurilmalar ro'yxati kelganda
                    const oldDevices = [...espDevices];
                    setEspDevices(data.devices);
                    
                    // ✅ YANGI PENDING STATUSLI QURILMA KELGANDA MAYIN RINGTON CHALINADI
                    if (oldDevices.length < data.devices.length) {
                        const newDevices = data.devices.filter(
                            newDev => !oldDevices.some(oldDev => oldDev.id === newDev.id)
                        );
                        
                        if (newDevices.some(dev => dev.status === 'pending')) {
                            playRingtoneSound(); // 📱 MAYIN RINGTON
                        }
                    }
                    
                } else if (data.type === 'new_pending_device') {
                    // Yangi pending qurilma kelganida
                    playRingtoneSound(); // 📱 MAYIN RINGTON
                    
                    if (data.device) {
                        setEspDevices(prev => [...prev, data.device]);
                    }
                }
            } catch (e) {}
        };
        
        socketRef.current = ws;

        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => { 
            clearInterval(timer); 
            if (ws) ws.close(); 
            stopAudio();
            stopAllSounds(); // ✅ Komponent yopilganda barcha ovozlarni to'xtatish
        };
    }, []);

    // ✅ QURILMA NOMINI OLISH - Xorazm bilan bir xil
    const getDeviceName = (location) => {
        if (location.sector && location.sector.trim() !== "") {
            return location.sector;
        }
        else if (location.description && location.description.trim() !== "") {
            return location.description;
        }
        else {
            return "Qurilma";
        }
    };

    // ✅ MANZIL NOMINI OLISH - Xorazm bilan bir xil
    const getLocationName = (location) => {
        if (location.name && location.name.length > 30) {
            return location.name.substring(0, 30) + "...";
        }
        return location.name || "Noma'lum manzil";
    };

    return (
        <div className="flex h-screen bg-black text-white font-sans overflow-hidden relative">
            
            {/* 1. XARITA QISMI */}
            <div className="w-[70%] h-full flex flex-col relative border-r border-emerald-500/20">
                <div className="p-4 bg-gray-900/90 backdrop-blur-md flex justify-between items-center border-b border-emerald-500/20 z-[1000]">
                    <div>
                        <h1 className="text-xl font-black text-emerald-400 uppercase italic tracking-tighter">Sirdaryo Signal Mapper</h1>
                        <p className={`text-[9px] font-mono italic ${isVoiceActive ? 'text-red-500 animate-pulse' : 'text-gray-500'}`}>
                            {isVoiceActive ? `● TRANSMITTING TO: ${linkedNode?.name}` : "TIZIM ONLAYN | XARITADAN TANLANG"}
                        </p>
                    </div>
                    <div className="text-2xl font-mono text-emerald-400">{currentTime.toLocaleTimeString('uz-UZ')}</div>
                </div>

                <div className="flex-grow relative">
                    <MapContainer center={[40.5, 68.65]} zoom={10} style={{ height: '100%', background: '#050505' }} ref={mapRef} zoomControl={false}>
                        <TileLayer 
                            url="https://{s}.google.com/vt/lyrs=y,h&x={x}&y={y}&z={z}"
                            subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
                            attribution='&copy; Google Maps'
                        />
                        {geoData && <GeoJSON data={geoData} style={{ color: '#10B981', weight: 2, fillOpacity: 0.05 }} />}
                        
                        <MapPicker onPick={handleMapPick} />

                        {savedLocations.map(loc => {
                            const displayName = getDeviceName(loc);
                            
                            return (
                                <Marker 
                                    key={loc.id} 
                                    position={[loc.lat, loc.lng]} 
                                    icon={greenIcon}
                                    eventHandlers={{
                                        click: () => handleMarkerClick(loc)
                                    }}
                                >
                                    <Tooltip direction="top" offset={[0, -40]} opacity={1} permanent className="custom-tooltip">
                                        <div className="px-2 py-1 bg-black/60 backdrop-blur-sm border border-emerald-500/30 rounded-full cursor-pointer hover:bg-emerald-500/20 transition-all"
                                             onClick={(e) => {
                                                 e.preventDefault();
                                                 handleMarkerClick(loc);
                                             }}>
                                            <span className="text-[10px] font-black uppercase text-emerald-400 tracking-tighter">
                                                {displayName}
                                            </span>
                                        </div>
                                    </Tooltip>
                                </Marker>
                            );
                        })}

                        {isVoiceActive && linkedNode && (
                            <Circle center={[linkedNode.lat, linkedNode.lng]} radius={180} pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.3 }} />
                        )}

                        {showAddModal && tempCoords && (
                            <Marker
                                position={[tempCoords.lat, tempCoords.lng]}
                                icon={greenIcon}
                                opacity={0.5}
                            />
                        )}
                    </MapContainer>
                </div>
            </div>

            {/* 2. O'NG PANELDAGI QURILMALAR RO'YXATI */}
            <div className="w-[30%] bg-[#080d0b] p-6 flex flex-col gap-6">
                
                {/* ✅ ARXIV TUGMASI - Xorazm bilan bir xil */}
                <div className="flex justify-end items-center border-b border-emerald-500/20 pb-4">
                    <div className="flex flex-col w-full">
                        <div className="flex justify-between items-center">
                            <h3 className="text-emerald-500 text-[10px] font-black tracking-[0.3em] uppercase italic">
                                Saqlangan Manzillar
                            </h3>
                            <button 
                                onClick={() => setShowArchive(true)} 
                                className="bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-emerald-500/30 flex items-center gap-1"
                            >
                                <span>📜</span> ARXIV
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto space-y-4 custom-scrollbar pr-2">
                    {savedLocations.length === 0 ? (
                        <div className="text-center py-10 text-gray-600 italic text-xs">
                            Hozircha manzillar yo'q. Xaritadan nuqta tanlang.
                        </div>
                    ) : (
                        savedLocations.map((loc, index) => {
                            const device = espDevices[index];
                            const isLinked = linkedNode?.id === loc.id;
                            const locationName = getLocationName(loc);
                            
                            return (
                                <div key={loc.id} className={`p-5 rounded-3xl border transition-all duration-500 relative ${
                                    isLinked 
                                        ? 'bg-emerald-500/10 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.15)]' 
                                        : device?.status === 'pending'
                                        ? 'bg-yellow-500/10 border-yellow-500'
                                        : 'bg-black/40 border-emerald-500/20'
                                }`}>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleDeleteLocation(loc.id); }}
                                        className="absolute top-4 right-4 text-gray-600 hover:text-red-500 transition-colors"
                                        title="O'chirish"
                                    >✕</button>
                                    <div 
                                        className="mb-4 pr-6 cursor-pointer hover:bg-emerald-500/5 p-2 rounded-xl transition-all"
                                        onClick={() => handleMarkerClick(loc)}
                                    >
                                        <h4 className="font-bold text-emerald-400 text-sm uppercase truncate" title={loc.name}>
                                            {locationName}
                                        </h4>
                                        <p className="text-[10px] text-emerald-200/60 font-mono italic truncate">
                                            <span className="text-emerald-400">Qurilma:</span> {loc.sector || "Noma'lum"} 
                                            {loc.description && ` | ${loc.description}`}
                                            {device && ` | DEV: ${device.id} | Status: ${device.status}`}
                                        </p>
                                    </div>
                                    
                                    {!isLinked ? (
                                        device ? (
                                            device.status === 'pending' ? (
                                                <button 
                                                    onClick={() => handleAuthorize(device.id)}
                                                    className="w-full bg-yellow-600 hover:bg-yellow-500 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all animate-pulse"
                                                >
                                                    Ruxsat berish
                                                </button>
                                            ) : (
                                                <button 
                                                    onClick={() => handleEstablishLink(loc)}
                                                    className="w-full bg-emerald-900/30 hover:bg-emerald-600 border border-emerald-500/30 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                                >
                                                    Bog'lanish
                                                </button>
                                            )
                                        ) : (
                                            <button 
                                                disabled
                                                className="w-full bg-gray-800/30 border border-gray-600/30 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-not-allowed opacity-50"
                                            >
                                                Qurilma topilmadi
                                            </button>
                                        )
                                    ) : (
                                        <div className="flex flex-col gap-2">
                                            <button 
                                                onClick={() => {
                                                    const nextState = !isVoiceActive;
                                                    setIsVoiceActive(nextState);
                                                    if (nextState) {
                                                        startAudio();
                                                    } else {
                                                        stopAudio();
                                                    }
                                                }}
                                                className={`w-full py-3 rounded-xl text-[10px] font-black uppercase transition-all ${
                                                    isVoiceActive 
                                                        ? 'bg-red-600 animate-pulse' 
                                                        : 'bg-emerald-600 hover:bg-emerald-500'
                                                }`}
                                            >
                                                {isVoiceActive ? 'Yozuvni To\'xtatish' : 'Ovozli Aloqa'}
                                            </button>
                                            <button 
                                                onClick={handleCloseConnection}
                                                className="w-full py-2 bg-red-900/20 text-red-500 rounded-xl border border-red-500/20 text-[9px] font-black uppercase hover:bg-red-600 hover:text-white transition-all"
                                            >
                                                To'xtatish va Uzish
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* 3. YANGI MANZIL QO'SHISH/TAHRIRLASH MODALI */}
            {showAddModal && (
                <div className="absolute inset-0 z-[3000] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
                    <form onSubmit={saveNewLocation} className="bg-[#0c1410] border border-emerald-500/40 p-8 rounded-[32px] w-full max-w-md shadow-2xl scale-in">
                        <h2 className="text-emerald-400 text-xl font-black uppercase italic mb-6 tracking-widest">
                            {editingId ? 'Manzilni tahrirlash' : 'Yangi nuqta qo\'shish'}
                        </h2>
                        
                        <div className="space-y-4">
                            {/* Koordinatalar displeyi */}
                            {tempCoords && (
                                <div className="flex gap-2 mb-2 animate-pulse">
                                    <div className="flex-1 bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-2 text-center">
                                        <p className="text-[7px] text-emerald-500/50 uppercase font-bold tracking-widest">Lat</p>
                                        <p className="text-[10px] font-mono text-emerald-400 font-bold">{tempCoords.lat.toFixed(6)}</p>
                                    </div>
                                    <div className="flex-1 bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-2 text-center">
                                        <p className="text-[7px] text-emerald-500/50 uppercase font-bold tracking-widest">Lng</p>
                                        <p className="text-[10px] font-mono text-emerald-400 font-bold">{tempCoords.lng.toFixed(6)}</p>
                                    </div>
                                </div>
                            )}

                            {/* Manzil nomi */}
                            <div>
                                <label className="text-[9px] text-emerald-500/60 uppercase font-bold ml-2">Aniq Manzil (contact panelda ko'rinadi)</label>
                                <input
                                    required
                                    autoFocus
                                    className="w-full bg-black/40 border border-emerald-500/20 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 outline-none transition-all text-emerald-100"
                                    value={formData.name}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setFormData({ ...formData, name: val });
                                    }}
                                    placeholder="Manzilni kiriting..."
                                />
                            </div>

                            {/* Sektor / Qurilma nomi */}
                            <div>
                                <label className="text-[9px] text-emerald-500/60 uppercase font-bold ml-2">Qurilma Nomi (marker tepasida ko'rinadi)</label>
                                <input
                                    className="w-full bg-black/40 border border-emerald-500/20 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 outline-none transition-all"
                                    value={formData.sector}
                                    onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                                    placeholder="Masalan: Guliston-001"
                                />
                                <p className="text-[7px] text-emerald-500/40 mt-1 ml-2">Bu nom xaritadagi marker tepasida chiqadi</p>
                            </div>

                            {/* Tavsif */}
                            <div>
                                <label className="text-[9px] text-emerald-500/60 uppercase font-bold ml-2">Tavsif / Izoh</label>
                                <textarea
                                    className="w-full bg-black/40 border border-emerald-500/20 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 outline-none transition-all h-20 resize-none"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Qo'shimcha ma'lumotlar..."
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button type="button" onClick={() => {
                                setShowAddModal(false);
                                setFormData({ name: '', sector: '', description: '' });
                                setTempCoords(null);
                                setEditingId(null);
                            }} className="flex-1 py-3 rounded-xl border border-emerald-500/20 text-xs font-bold uppercase hover:bg-red-500/10 hover:text-red-500 transition-all">
                                Bekor qilish
                            </button>
                            <button type="submit" className="flex-1 py-3 rounded-xl bg-emerald-500 text-black text-xs font-black uppercase hover:bg-emerald-400 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                                {editingId ? 'Yangilash' : 'Saqlash'}
                            </button>
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
                                        <h3 className="text-emerald-500 font-bold text-xs uppercase mb-3 border-b border-emerald-500/5 pb-2">{loc.sector || loc.name}</h3>
                                        <p className="text-[8px] text-gray-400 font-mono mb-2">{loc.sector} | {loc.description}</p>
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
                .leaflet-tooltip.custom-tooltip { background: transparent; border: none; box-shadow: none; padding: 0; }
                .leaflet-tooltip-top:before { border-top-color: rgba(16, 185, 129, 0.4); }
                .truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }
            `}</style>
        </div>
    );
}