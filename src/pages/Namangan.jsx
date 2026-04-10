import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Trash2, Mic, MicOff, Archive, X, Search, Map } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Marker ikonkalarini sozlash
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Sariq marker uchun custom icon
const yellowIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Yashil marker uchun custom icon
const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// ============ SERVER KONFIGURATSIYASI (46.8.73.5) ============
const SERVER_IP = '46.8.73.5';
const WS_URL = `ws://${SERVER_IP}:3001`;
const API_URL = `http://${SERVER_IP}:3000`;

// ============ DEFAULT QURILMALAR (NAMANGAN) ============
const namanganSectors = [
  { 
    id: 1, 
    name: "Namangan City-Hub", 
    lat: 40.9983, 
    lng: 71.6726, 
    address: "Namangan sh., Markaziy ko'cha",
    sector: "Namangan-001",
    deviceId: "ESP-NM-01"
  },
  { 
    id: 2, 
    name: "To'raqo'rg'on Industrial", 
    lat: 40.9983, 
    lng: 71.5167, 
    address: "To'raqo'rg'on tumani, Sanoat zonasi",
    sector: "Turakurgan-002",
    deviceId: "ESP-TK-02"
  },
  { 
    id: 3, 
    name: "Chust Market-Node", 
    lat: 41.0031, 
    lng: 71.2375, 
    address: "Chust tumani, Bozor hududi",
    sector: "Chust-003",
    deviceId: "ESP-CH-03"
  },
  { 
    id: 4, 
    name: "Kosonsoy Power-Grid", 
    lat: 41.2494, 
    lng: 71.5486, 
    address: "Kosonsoy tumani, Elektr stansiyasi",
    sector: "Kosonsoy-004",
    deviceId: "ESP-KS-04"
  },
  { 
    id: 5, 
    name: "Pop Agro-Node", 
    lat: 40.8744, 
    lng: 71.1083, 
    address: "Pop tumani, Paxta zavodi",
    sector: "Pop-005",
    deviceId: "ESP-PP-05"
  },
  { 
    id: 6, 
    name: "Uychi Desert-Relay", 
    lat: 41.0833, 
    lng: 71.9167, 
    address: "Uychi tumani, Aloqa minorasi",
    sector: "Uychi-006",
    deviceId: "ESP-UC-06"
  },
  { 
    id: 7, 
    name: "Mingbuloq Water-Node", 
    lat: 40.8333, 
    lng: 71.5833, 
    address: "Mingbuloq tumani, Nasos stansiyasi",
    sector: "Mingbuloq-007",
    deviceId: "ESP-MB-07"
  }
];

// Google Maps havolasidan koordinatalarni ajratish funksiyasi
async function extractCoordinatesFromGoogleMapsUrl(url) {
  try {
    console.log("🔍 Google Maps havolasi tahlil qilinmoqda:", url);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(url, { 
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    clearTimeout(timeoutId);
    const finalUrl = response.url || url;
    console.log("📍 Yakuniy URL:", finalUrl);

    const atRegex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
    const atMatch = finalUrl.match(atRegex);
    if (atMatch) {
      return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
    }
    
    const latMatch = finalUrl.match(/!3d(-?\d+\.\d+)/);
    const lngMatch = finalUrl.match(/!4d(-?\d+\.\d+)/);
    if (latMatch && lngMatch) {
      return { lat: parseFloat(latMatch[1]), lng: parseFloat(lngMatch[2]) };
    }
    
    const placeRegex = /\/place\/.*?@(-?\d+\.\d+),(-?\d+\.\d+)/;
    const placeMatch = finalUrl.match(placeRegex);
    if (placeMatch) {
      return { lat: parseFloat(placeMatch[1]), lng: parseFloat(placeMatch[2]) };
    }
    
    const queryRegex = /[?&]q=(-?\d+\.\d+)%2C(-?\d+\.\d+)/;
    const queryMatch = finalUrl.match(queryRegex);
    if (queryMatch) {
      return { lat: parseFloat(queryMatch[1]), lng: parseFloat(queryMatch[2]) };
    }
    
    return null;
  } catch (error) {
    console.error("❌ Koordinatalarni ajratishda xato:", error);
    return null;
  }
}

export default function NamanganContact() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [espDevices, setEspDevices] = useState([]);
  
  // Yangi joy qo'shish uchun Modal holati
  const [showAddModal, setShowAddModal] = useState(false);
  const [tempCoords, setTempCoords] = useState(null);
  const [formData, setFormData] = useState({ name: '', sector: '', deviceId: '' });
  const [editingId, setEditingId] = useState(null);
  const [deviceIdError, setDeviceIdError] = useState('');

  // ============ O'CHIRISH UCHUN MODAL HOLATI ============
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState(null);

  // ============ SAQLASH UCHUN MODAL HOLATI (FAQAT BIR MARTA) ============
  const [showSaveConfirmModal, setShowSaveConfirmModal] = useState(false);
  const [pendingFormData, setPendingFormData] = useState(null);
  const [pendingTempCoords, setPendingTempCoords] = useState(null);
  const [pendingEditingId, setPendingEditingId] = useState(null);

  // Link orqali qidirish uchun state'lar
  const [searchLink, setSearchLink] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState('');

  // SAVED LOCATIONS - localStorage dan yuklash yoki default
  const [savedLocations, setSavedLocations] = useState(() => {
    const saved = localStorage.getItem('namanganLocations');
    if (saved) {
      console.log("📦 LocalStorage dan yuklandi:", JSON.parse(saved).length, "ta manzil");
      return JSON.parse(saved);
    }
    console.log("📦 Default manzillar yuklandi:", namanganSectors.length, "ta manzil");
    return namanganSectors.map(device => ({
      id: `LOC-${device.id}`,
      name: device.name,
      lat: device.lat,
      lng: device.lng,
      sector: device.sector,
      deviceId: device.deviceId,
      address: device.address,
      recordings: []
    }));
  });

  const [linkedNode, setLinkedNode] = useState(() => {
    const saved = localStorage.getItem('namanganLinkedNode');
    if (saved) {
      console.log("🔗 Bog'langan node yuklandi:", JSON.parse(saved));
      return JSON.parse(saved);
    }
    return null;
  });

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const searchMarkerRef = useRef(null);
  
  const socketRef = useRef(null);
  const audioContextRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const processorRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioBufferRef = useRef(null);
  const audioSourceRef = useRef(null);
  const isMicActiveRef = useRef(false);

  // ============ API FUNKSIYALARI (46.8.73.5:3000) ============
  
  const fetchDevicesFromAPI = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/devices`);
      const data = await response.json();
      console.log("📡 API dan qurilmalar:", data);
      
      if (data.devices) {
        setEspDevices(data.devices);
      }
      return data;
    } catch (error) {
      console.error("API xato:", error);
      return { devices: [] };
    }
  }, []);

  const authorizeDeviceViaAPI = useCallback(async (deviceId) => {
    try {
      const response = await fetch(`${API_URL}/api/authorize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId })
      });
      const data = await response.json();
      console.log("✅ Authorize javobi:", data);
      
      if (data.success) {
        setEspDevices(prev =>
          prev.map(d => d.id === deviceId ? { ...d, status: 'active' } : d)
        );
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({ type: 'authorize', deviceId }));
        }
      }
      return data;
    } catch (error) {
      console.error("Authorize xato:", error);
      return null;
    }
  }, []);

  // ============ O'CHIRISH FUNKSIYALARI ============
  
  const openDeleteModal = (id) => {
    const location = savedLocations.find(loc => loc.id === id);
    setDeviceToDelete(location);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (deviceToDelete) {
      setSavedLocations(prev => prev.filter(loc => loc.id !== deviceToDelete.id));
      if (linkedNode?.id === deviceToDelete.id) {
        handleStopAndDisconnect();
      }
      setShowDeleteModal(false);
      setDeviceToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setDeviceToDelete(null);
  };

  // ============ SAQLASH MODAL FUNKSIYALARI (FAQAT BIR MARTA) ============
  const showSaveConfirmModalFunc = (formDataToSave, coords, editingIdValue) => {
    setPendingFormData(formDataToSave);
    setPendingTempCoords(coords);
    setPendingEditingId(editingIdValue);
    setShowSaveConfirmModal(true);
  };

  const confirmSave = () => {
    // Saqlash amalini bajarish (alert yoki qo'shimcha oynalarsiz)
    if (!pendingTempCoords || !pendingFormData.name) {
      setShowSaveConfirmModal(false);
      setPendingFormData(null);
      setPendingTempCoords(null);
      setPendingEditingId(null);
      return;
    }

    if (pendingFormData.name === "Yuklanmoqda...") {
      setShowSaveConfirmModal(false);
      setPendingFormData(null);
      setPendingTempCoords(null);
      setPendingEditingId(null);
      return;
    }

    if (pendingFormData.deviceId && pendingFormData.deviceId.trim() !== '') {
      if (!isDeviceIdUnique(pendingFormData.deviceId, pendingEditingId)) {
        setShowSaveConfirmModal(false);
        setPendingFormData(null);
        setPendingTempCoords(null);
        setPendingEditingId(null);
        return;
      }
    }

    if (pendingEditingId) {
      setSavedLocations(prev =>
        prev.map(loc =>
          loc.id === pendingEditingId
            ? { ...loc, ...pendingFormData, lat: pendingTempCoords.lat, lng: pendingTempCoords.lng }
            : loc
        )
      );
    } else {
      const newLocation = {
        id: Date.now().toString(),
        lat: pendingTempCoords.lat,
        lng: pendingTempCoords.lng,
        ...pendingFormData,
        recordings: []
      };
      setSavedLocations(prev => [...prev, newLocation]);
    }

    // Modal va holatlarni tozalash
    setShowAddModal(false);
    setShowSaveConfirmModal(false);
    setFormData({ name: '', sector: '', deviceId: '' });
    setTempCoords(null);
    setEditingId(null);
    setDeviceIdError('');
    setPendingFormData(null);
    setPendingTempCoords(null);
    setPendingEditingId(null);
    handleClearSearch();
  };

  const cancelSave = () => {
    setShowSaveConfirmModal(false);
    setPendingFormData(null);
    setPendingTempCoords(null);
    setPendingEditingId(null);
  };

  // ✅ LOCALSTORAGE GA SAQLASH
  useEffect(() => {
    localStorage.setItem('namanganLocations', JSON.stringify(savedLocations));
    console.log("💾 LocalStorage ga saqlandi:", savedLocations.length, "ta manzil");
  }, [savedLocations]);

  // ✅ BOG'LANGAN NODE NI SAQLASH
  useEffect(() => {
    if (linkedNode) {
      localStorage.setItem('namanganLinkedNode', JSON.stringify(linkedNode));
      console.log("💾 Bog'langan node saqlandi:", linkedNode.sector);
    } else {
      localStorage.removeItem('namanganLinkedNode');
      console.log("💾 Bog'langan node o'chirildi");
    }
  }, [linkedNode]);

  // ✅ SOATNI YANGILASH
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // ============ WEBSOCKET (46.8.73.5:3001) ============
  
  useEffect(() => {
    let reconnectTimer;
    
    const connectWebSocket = () => {
      try {
        console.log(`🔌 WebSocket ulanish: ${WS_URL}`);
        socketRef.current = new WebSocket(WS_URL);
        socketRef.current.binaryType = "arraybuffer";
        
        socketRef.current.onopen = () => {
          console.log("✅ WebSocket ulandi - NAMANGAN (46.8.73.5:3001)");
          socketRef.current.send(JSON.stringify({ type: 'frontend' }));
          
          if (linkedNode?.deviceId) {
            socketRef.current.send(JSON.stringify({ 
              type: 'register', 
              deviceId: linkedNode.deviceId 
            }));
          }
        };

        socketRef.current.onmessage = (event) => {
          try {
            // Audio ma'lumot (binary)
            if (event.data instanceof ArrayBuffer) {
              console.log("🎵 Audio ma'lumot keldi, hajmi:", event.data.byteLength);
              if (linkedNode && audioContextRef.current && !isMicActiveRef.current) {
                const audioData = new Int16Array(event.data);
                const audioBuffer = audioContextRef.current.createBuffer(1, audioData.length, 16000);
                const channelData = audioBuffer.getChannelData(0);
                for (let i = 0; i < audioData.length; i++) {
                  channelData[i] = audioData[i] / 32767.0;
                }
                const source = audioContextRef.current.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioContextRef.current.destination);
                source.start(0);
              }
              return;
            }
            
            // JSON xabar
            const data = JSON.parse(event.data);
            console.log("📩 WebSocket xabar keldi:", data);
            
            if (data.type === 'list') {
              setEspDevices(prevDevices => {
                const newDevicesList = data.devices || [];
                const hasNewPending = newDevicesList.some(
                  newDev => !prevDevices.some(oldDev => oldDev.id === newDev.id) && newDev.status === 'pending'
                );
                if (hasNewPending) {
                  console.log("🔔 Yangi pending qurilma topildi");
                  playRingtoneSound();
                }
                return newDevicesList;
              });
            } 
            else if (data.type === 'new_pending_device') {
              console.log("🆕 Yangi pending qurilma:", data.device);
              playRingtoneSound();
              if (data.device) {
                setEspDevices(prev => {
                  if (!prev.some(d => d.id === data.device.id)) {
                    return [...prev, data.device];
                  }
                  return prev;
                });
              }
            }
            else if (data.type === 'authorized') {
              console.log("✅ Qurilma authorized bo'ldi:", data.deviceId);
              setEspDevices(prev => 
                prev.map(d => d.id === data.deviceId ? { ...d, status: 'active' } : d)
              );
              if (linkedNode?.deviceId === data.deviceId) {
                setLinkedNode(prev => ({ ...prev, status: 'active' }));
              }
            }
            else if (data.type === 'close') {
              console.log("🔌 Qurilma uzildi:", data.deviceId);
              setEspDevices(prev => 
                prev.map(d => d.id === data.deviceId ? { ...d, status: 'disconnected' } : d)
              );
              if (linkedNode?.deviceId === data.deviceId) {
                handleStopAndDisconnect();
              }
            }
          } catch (e) {
            console.error("WebSocket xatoni qayta ishlashda xato:", e);
          }
        };

        socketRef.current.onerror = (error) => {
          console.error("❌ WebSocket xatosi:", error);
        };

        socketRef.current.onclose = () => {
          console.log("🔌 WebSocket uzildi. 5 sekunddan keyin qayta ulanish...");
          reconnectTimer = setTimeout(connectWebSocket, 5000);
        };

      } catch (e) {
        console.log("WebSocket ulanishda xato:", e);
        reconnectTimer = setTimeout(connectWebSocket, 5000);
      }
    };

    connectWebSocket();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [linkedNode?.deviceId]);

  // API dan qurilmalarni so'rab turish (har 5 sekundda)
  useEffect(() => {
    fetchDevicesFromAPI();
    const interval = setInterval(fetchDevicesFromAPI, 5000);
    return () => clearInterval(interval);
  }, [fetchDevicesFromAPI]);

  // 🗺️ XARITANI YUKLASH
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const center = [41.0, 71.5];
    console.log("🗺️ Xarita yuklanmoqda, markaz:", center);
    
    const map = L.map(mapRef.current).setView(center, 11);
    
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri',
      maxZoom: 19,
    }).addTo(map);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap, &copy; CartoDB',
      maxZoom: 19,
      opacity: 1.0
    }).addTo(map);

    savedLocations.forEach(loc => {
      const marker = L.marker([loc.lat, loc.lng], { icon: greenIcon }).addTo(map);
      
      marker.bindPopup(`
        <div style="color: #333; padding: 5px; min-width: 150px;">
          <strong style="color: #10b981; font-size: 14px;">${loc.sector || 'Qurilma'}</strong>
          <p style="font-size: 12px; margin: 5px 0;">${loc.name}</p>
          ${loc.address ? `<p style="font-size: 10px; color: #666;">${loc.address}</p>` : ''}
          ${loc.deviceId ? `<p style="font-size: 10px; color: #666;">ID: ${loc.deviceId}</p>` : ''}
          <p style="font-size: 9px; color: #999; margin-top: 5px;">
            ${loc.lat.toFixed(6)}, ${loc.lng.toFixed(6)}
          </p>
        </div>
      `);

      marker.on('click', () => handleMarkerClick(loc));
      markersRef.current[loc.id] = marker;
    });

    map.on('click', (e) => handleMapPick({ lat: e.latlng.lat, lng: e.latlng.lng }));
    mapInstanceRef.current = map;
    console.log("✅ Xarita muvaffaqiyatli yuklandi");

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Markerlarni yangilash
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    Object.values(markersRef.current).forEach(marker => marker.remove());
    markersRef.current = {};

    savedLocations.forEach(loc => {
      const marker = L.marker([loc.lat, loc.lng], { icon: greenIcon }).addTo(map);
      
      marker.bindPopup(`
        <div style="color: #333; padding: 5px; min-width: 150px;">
          <strong style="color: #10b981; font-size: 14px;">${loc.sector || 'Qurilma'}</strong>
          <p style="font-size: 12px; margin: 5px 0;">${loc.name}</p>
          ${loc.address ? `<p style="font-size: 10px; color: #666;">${loc.address}</p>` : ''}
          ${loc.deviceId ? `<p style="font-size: 10px; color: #666;">ID: ${loc.deviceId}</p>` : ''}
          <p style="font-size: 9px; color: #999; margin-top: 5px;">
            ${loc.lat.toFixed(6)}, ${loc.lng.toFixed(6)}
          </p>
        </div>
      `);

      marker.on('click', () => handleMarkerClick(loc));
      markersRef.current[loc.id] = marker;
    });
  }, [savedLocations]);

  // Qidiruv natijasini markazlashtirish
  useEffect(() => {
    if (!mapInstanceRef.current || !searchResult) return;
    const map = mapInstanceRef.current;

    if (searchMarkerRef.current) searchMarkerRef.current.remove();
    searchMarkerRef.current = L.marker([searchResult.lat, searchResult.lng], { icon: yellowIcon }).addTo(map);
    searchMarkerRef.current.bindPopup(`
      <div style="color: #333; padding: 5px;">
        <strong style="color: #fbbf24;">Qidiruv natijasi</strong>
        <p style="font-size: 11px; margin: 5px 0;">${searchResult.displayName}</p>
      </div>
    `).openPopup();
    map.setView([searchResult.lat, searchResult.lng], 12);
  }, [searchResult]);

  // Ringtone ovozini yaratish
  const createRingtoneSound = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    const ctx = audioContextRef.current;
    const duration = 4;
    const sampleRate = ctx.sampleRate;
    const frameCount = sampleRate * duration;
    
    const audioBuffer = ctx.createBuffer(1, frameCount, sampleRate);
    const channelData = audioBuffer.getChannelData(0);
    
    for (let i = 0; i < frameCount; i++) {
      const t = i / sampleRate;
      const pattern = Math.floor(t * 1.6) % 2;
      let value = 0;
      
      if (pattern === 0) {
        const freq1 = 440;
        const note1 = Math.sin(2 * Math.PI * freq1 * t);
        const freq2 = 554;
        const note2 = Math.sin(2 * Math.PI * freq2 * t * 2) * 0.5;
        const freq3 = 880;
        const note3 = Math.sin(2 * Math.PI * freq3 * t * 1.5) * 0.3;
        value = (note1 * 0.6) + (note2 * 0.3) + (note3 * 0.2);
      } else {
        value = Math.sin(2 * Math.PI * 100 * t) * 0.05;
      }
      
      const fadeIn = Math.min(1, t / 0.1);
      const fadeOut = Math.min(1, (duration - t) / 0.1);
      const envelope = fadeIn * fadeOut;
      channelData[i] = value * envelope * 0.2;
    }
    
    return audioBuffer;
  }, []);

  const playRingtoneSound = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    
    if (!audioBufferRef.current) {
      audioBufferRef.current = createRingtoneSound();
    }
    
    if (audioSourceRef.current) {
      try { audioSourceRef.current.stop(); } catch (e) {}
    }
    
    audioSourceRef.current = ctx.createBufferSource();
    audioSourceRef.current.buffer = audioBufferRef.current;
    audioSourceRef.current.loop = true;
    audioSourceRef.current.connect(ctx.destination);
    audioSourceRef.current.start();
    console.log("📱 Rington: YANGI QURILMA SO'ROVI KELDI - NAMANGAN");
  }, [createRingtoneSound]);

  const stopAllSounds = useCallback(() => {
    if (audioSourceRef.current) {
      try { audioSourceRef.current.stop(); audioSourceRef.current = null; } catch (e) {}
    }
  }, []);

  // ✅ QURILMA ID UNIQUE EKANLIGINI TEKSHIRISH
  const isDeviceIdUnique = (deviceId, currentLocationId = null) => {
    if (!deviceId || deviceId.trim() === '') return true;
    return !savedLocations.some(loc => 
      loc.deviceId && loc.deviceId === deviceId && loc.id !== currentLocationId
    );
  };

  const handleDeviceIdChange = (e) => {
    const newValue = e.target.value;
    setFormData({ ...formData, deviceId: newValue });
    if (newValue && newValue.trim() !== '') {
      if (!isDeviceIdUnique(newValue, editingId)) {
        setDeviceIdError('❌ Bu qurilma ID si allaqachon boshqa qurilmaga biriktirilgan!');
      } else {
        setDeviceIdError('');
      }
    } else {
      setDeviceIdError('');
    }
  };

  // 🔍 QIDIRUV FUNKSIYASI
  const handleSearchByLink = async () => {
    let address = searchLink.trim();
    if (!address) {
      setSearchError("Iltimos, qidirish uchun manzil kiriting!");
      return;
    }
    
    setIsSearching(true);
    setSearchError('');
    
    try {
      let lat, lng, displayName;
      
      if (address.includes('goo.gl/maps') || address.includes('maps.app.goo.gl') || 
          address.includes('google.com/maps') || address.includes('maps.google.com')) {
        
        const coords = await extractCoordinatesFromGoogleMapsUrl(address);
        if (coords) {
          lat = coords.lat;
          lng = coords.lng;
          const reverseResponse = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
          const reverseData = await reverseResponse.json();
          displayName = reverseData.display_name || `${lat}, ${lng}`;
        } else {
          setSearchError("❌ Havoladan koordinatalar topilmadi.");
          setIsSearching(false);
          return;
        }
      }
      else if (address.match(/^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/)) {
        const parts = address.split(/[,\s]+/);
        lat = parseFloat(parts[0]);
        lng = parseFloat(parts[1]);
        const reverseResponse = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
        const reverseData = await reverseResponse.json();
        displayName = reverseData.display_name || `${lat}, ${lng}`;
      }
      else {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address + " Namangan")}&limit=5`);
        const data = await response.json();
        if (data && data.length > 0) {
          lat = parseFloat(data[0].lat);
          lng = parseFloat(data[0].lon);
          displayName = data[0].display_name;
        } else {
          setSearchError(`❌ "${address}" manzili topilmadi.`);
          setIsSearching(false);
          return;
        }
      }
      setSearchResult({ lat, lng, displayName });
    } catch (error) {
      console.error("❌ Qidiruvda xato:", error);
      setSearchError("Qidiruvda xatolik yuz berdi.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSaveSearchResult = () => {
    if (!searchResult) return;
    setEditingId(null);
    setTempCoords({ lat: searchResult.lat, lng: searchResult.lng });
    setFormData({ name: searchResult.displayName, sector: '', deviceId: '' });
    setShowAddModal(true);
    setSearchResult(null);
    setSearchLink('');
    if (searchMarkerRef.current) { searchMarkerRef.current.remove(); searchMarkerRef.current = null; }
  };

  const handleClearSearch = () => {
    setSearchResult(null);
    setSearchLink('');
    setSearchError('');
    if (searchMarkerRef.current) { searchMarkerRef.current.remove(); searchMarkerRef.current = null; }
  };

  const handleMarkerClick = (location) => {
    setEditingId(location.id);
    setTempCoords({ lat: location.lat, lng: location.lng });
    setFormData({ name: location.name, sector: location.sector || '', deviceId: location.deviceId || '' });
    setDeviceIdError('');
    setShowAddModal(true);
    if (mapInstanceRef.current) mapInstanceRef.current.setView([location.lat, location.lng], 12);
  };

  const handleMapPick = async (latlng) => {
    setEditingId(null);
    setTempCoords(latlng);
    setShowAddModal(true);
    setDeviceIdError('');
    setFormData((prev) => ({ ...prev, name: "Yuklanmoqda...", deviceId: '' }));

    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latlng.lat}&lon=${latlng.lng}&zoom=18&addressdetails=1`);
      const data = await response.json();
      if (data && data.display_name) {
        setFormData((prev) => ({
          ...prev,
          name: data.display_name,
          sector: data.address?.suburb || data.address?.city_district || data.address?.town || data.address?.village || data.address?.city || "",
        }));
      }
    } catch (error) {
      console.error("Manzilni aniqlashda xato:", error);
      setFormData((prev) => ({ ...prev, name: "" }));
    }
  };

  // O'ZGARTIRILGAN: saveNewLocation - faqat modal ochadi (alert yo'q)
  const saveNewLocation = (e) => {
    e.preventDefault();
    showSaveConfirmModalFunc(formData, tempCoords, editingId);
  };

  const getLocationName = (location) => {
    if (location.name?.length > 40) return location.name.substring(0, 40) + "...";
    return location.name || "Noma'lum manzil";
  };

  // Yangi o'chirish funksiyasi
  const handleDeleteLocation = (id) => {
    openDeleteModal(id);
  };

  // ============ QURILMA BILAN BOG'LANISH ============
  const handleEstablishLink = (location) => {
    const device = espDevices.find(d => d.id === location.deviceId);
    if (!device) {
      alert(`❌ Qurilma topilmadi. ID: ${location.deviceId || 'Noma\'lum'}`);
      return;
    }
    if (device.status === 'pending') {
      authorizeDeviceViaAPI(device.id);
      alert("⏳ Ruxsat so'rovi yuborildi. Iltimos, kuting...");
      return;
    }
    if (device.status === 'active') {
      const newNode = { ...location, deviceId: device.id };
      setLinkedNode(newNode);
      localStorage.setItem('namanganLinkedNode', JSON.stringify(newNode));
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([location.lat, location.lng], 12);
      }
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: 'register', deviceId: device.id }));
      }
    }
  };

  const handleStopAndDisconnect = () => {
    stopAudio();
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'close', deviceId: linkedNode?.deviceId }));
    }
    setIsVoiceActive(false);
    setLinkedNode(null);
    localStorage.removeItem('namanganLinkedNode');
    stopAllSounds();
  };

  // ============ OVOZLI ALOQA ============
  
  const startMicrophone = async () => {
    if (isMicActiveRef.current) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      
      // Audio chunks yig'ish uchun MediaRecorder
      audioChunksRef.current = [];
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorderRef.current.start();
      
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const sampleRate = 16000;
      const bufferSize = 4096;
      
      const processor = audioContextRef.current.createScriptProcessor(bufferSize, 1, 1);
      processorRef.current = processor;
      
      processor.onaudioprocess = (e) => {
        if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN || !isMicActiveRef.current || !linkedNode) {
          return;
        }
        
        const input = e.inputBuffer.getChannelData(0);
        const output = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
          output[i] = Math.max(-32768, Math.min(32767, input[i] * 32767));
        }
        socketRef.current.send(output.buffer);
      };
      
      source.connect(processor);
      processor.connect(audioContextRef.current.destination);
      isMicActiveRef.current = true;
      console.log("✅ Mikrofon faollashtirildi");
      
    } catch (error) {
      console.error("Mikrofon xatosi:", error);
      alert("Mikrofonga ruxsat berilmagan!");
    }
  };
  
  const stopMicrophone = () => {
    isMicActiveRef.current = false;
    
    // MediaRecorder ni to'xtatish va audio ni saqlash
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.onstop = () => {
        if (audioChunksRef.current.length > 0 && linkedNode) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64Audio = reader.result;
            const timestamp = new Date().toLocaleString();
            
            setSavedLocations(prev =>
              prev.map(loc =>
                loc.id === linkedNode.id
                  ? {
                      ...loc,
                      recordings: [
                        { id: Date.now().toString(), data: base64Audio, time: timestamp },
                        ...(loc.recordings || [])
                      ]
                    }
                  : loc
              )
            );
          };
          reader.readAsDataURL(audioBlob);
          audioChunksRef.current = [];
        }
      };
    }
    
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const startAudio = async () => {
    await startMicrophone();
    setIsVoiceActive(true);
  };

  const stopAudio = () => {
    stopMicrophone();
    setIsVoiceActive(false);
  };

  const deleteRecording = (locationId, recordingId) => {
    if (window.confirm("Ushbu yozuvni o'chirmoqchimisiz?")) {
      setSavedLocations(prev =>
        prev.map(loc =>
          loc.id === locationId
            ? {
                ...loc,
                recordings: loc.recordings?.filter(rec => rec.id !== recordingId) || []
              }
            : loc
        )
      );
    }
  };

  const handleAuthorize = (deviceId) => {
    authorizeDeviceViaAPI(deviceId);
  };

  return (
    <div className="flex h-screen bg-black text-white font-sans overflow-hidden relative">
      
      {/* 🗺️ XARITA QISMI */}
      <div className="w-[70%] h-full flex flex-col relative border-r border-emerald-500/20">
        <div className="p-4 bg-gray-900/90 backdrop-blur-md border-b border-emerald-500/20 z-[1000]">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-xl font-black text-emerald-400 uppercase italic tracking-tighter flex items-center gap-2 whitespace-nowrap">
              <Map className="w-5 h-5" /> Namangan Signal Mapper
            </h1>

            <div className="flex-1 max-w-2xl">
              <div className="relative">
                <input type="text" value={searchLink} onChange={(e) => { setSearchLink(e.target.value); setSearchError(''); }}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearchByLink()}
                  placeholder="Google Maps havolasi, koordinata yoki manzil..."
                  className="w-full bg-black/60 border border-emerald-500/20 rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500 outline-none transition-all pr-20" />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                  {searchLink && (<button onClick={() => setSearchLink('')} className="p-1.5 text-gray-500 hover:text-red-500"><X size={16} /></button>)}
                  <button onClick={handleSearchByLink} disabled={isSearching}
                    className={`p-1.5 rounded-lg transition-all ${isSearching ? 'bg-gray-600 cursor-wait' : 'bg-emerald-600 hover:bg-emerald-500'}`}>
                    <Search size={16} />
                  </button>
                </div>
              </div>
              {searchError && (<div className="mt-2 text-red-500 text-xs px-2">{searchError}</div>)}
            </div>

            <div className="text-2xl font-mono text-emerald-400 whitespace-nowrap">
              {currentTime.toLocaleTimeString('uz-UZ')}
            </div>
          </div>

          {searchResult && (
            <div className="mt-3 bg-yellow-500/10 border border-yellow-500/30 p-3 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <p className="text-[10px] text-yellow-500 font-bold uppercase mb-1">✓ TOPILDI:</p>
                  <p className="text-sm text-white mb-1">{searchResult.displayName}</p>
                  <p className="text-xs text-gray-400">{searchResult.lat.toFixed(6)}, {searchResult.lng.toFixed(6)}</p>
                </div>
                <button onClick={handleClearSearch} className="p-1 text-gray-500 hover:text-red-500"><X size={16} /></button>
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={handleSaveSearchResult} className="flex-1 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all">Saqlash</button>
              </div>
            </div>
          )}
        </div>

        <div className="flex-grow relative bg-[#0a0a0a]" ref={mapRef} style={{ height: '100%', width: '100%', minHeight: '500px' }} />
      </div>

      {/* O'NG PANEL */}
      <div className="w-[30%] bg-[#080d0b] p-6 flex flex-col gap-6 overflow-y-auto">
        <div className="flex justify-between items-center border-b border-emerald-500/20 pb-4">
          <h3 className="text-emerald-500 text-xs font-black tracking-[0.3em] uppercase italic">Saqlangan Manzillar ({savedLocations.length})</h3>
          <button onClick={() => setShowArchive(true)} className="bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-emerald-500/30 flex items-center gap-1">
            <Archive size={14} /> ARXIV
          </button>
        </div>

        <div className="flex-grow overflow-y-auto space-y-4 custom-scrollbar pr-2">
          {savedLocations.length === 0 ? (
            <div className="text-center py-10 text-gray-600 italic text-sm">Hozircha manzillar yo'q. Xaritadan nuqta tanlang yoki yuqoridagi qidiruv orqali qo'shing.</div>
          ) : (
            savedLocations.map((loc) => {
              const device = loc.deviceId ? espDevices.find(d => d.id === loc.deviceId) : null;
              const isLinked = linkedNode?.id === loc.id;
              const locationName = getLocationName(loc);
              
              return (
                <div key={loc.id} className={`p-5 rounded-3xl border transition-all duration-500 relative ${isLinked ? 'bg-emerald-500/10 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.15)]' : device?.status === 'pending' ? 'bg-yellow-500/10 border-yellow-500' : 'bg-black/40 border-emerald-500/20'}`}>
                  <button onClick={() => handleDeleteLocation(loc.id)} className="absolute top-4 right-4 text-gray-600 hover:text-red-500 transition-colors" title="O'chirish"><Trash2 size={16} /></button>
                  <div className="mb-4 pr-6 cursor-pointer hover:bg-emerald-500/5 p-2 rounded-xl transition-all" onClick={() => handleMarkerClick(loc)}>
                    <h4 className="font-bold text-emerald-400 text-sm uppercase truncate" title={loc.name}>{locationName}</h4>
                    <p className="text-[10px] text-emerald-200/60 font-mono italic truncate">
                      <span className="text-emerald-400">Qurilma:</span> {loc.sector || "Noma'lum"} 
                      {loc.deviceId && ` | ID: ${loc.deviceId}`}
                      {device && ` | Status: ${device.status === 'pending' ? 'Kutilmoqda' : device.status === 'active' ? 'Faol' : 'Uzilgan'}`}
                    </p>
                    <p className="text-[7px] text-gray-600 mt-1">{loc.lat.toFixed(6)}, {loc.lng.toFixed(6)}</p>
                  </div>
                  
                  {!isLinked ? (
                    device ? (
                      device.status === 'pending' ? (
                        <button onClick={() => handleAuthorize(device.id)} className="w-full bg-yellow-600 hover:bg-yellow-500 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all animate-pulse">Ruxsat berish</button>
                      ) : (
                        <button onClick={() => handleEstablishLink(loc)} className="w-full bg-emerald-900/30 hover:bg-emerald-600 border border-emerald-500/30 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Bog'lanish</button>
                      )
                    ) : (
                      <button disabled className="w-full bg-gray-800/30 border border-gray-600/30 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-not-allowed opacity-50">
                        {loc.deviceId ? `Qurilma topilmadi (${loc.deviceId})` : 'ID kiritilmagan'}
                      </button>
                    )
                  ) : (
                    <div className="flex flex-col gap-2">
                      <button onClick={() => { const nextState = !isVoiceActive; setIsVoiceActive(nextState); if (nextState) startAudio(); else stopAudio(); }}
                        className={`w-full py-3 rounded-xl text-[10px] font-black uppercase transition-all ${isVoiceActive ? 'bg-red-600 animate-pulse' : 'bg-emerald-600 hover:bg-emerald-500'}`}>
                        {isVoiceActive ? (<span className="flex items-center justify-center gap-2"><MicOff size={14} /> Yozuvni To'xtatish</span>) : (<span className="flex items-center justify-center gap-2"><Mic size={14} /> Ovozli Aloqa</span>)}
                      </button>
                      <button onClick={handleStopAndDisconnect} className="w-full py-2 bg-red-900/20 text-red-500 rounded-xl border border-red-500/20 text-[9px] font-black uppercase hover:bg-red-600 hover:text-white transition-all">To'xtatish va Uzish</button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ============ YANGI MANZIL QO'SHISH MODALI ============ */}
      {showAddModal && (
        <div className="absolute inset-0 z-[3000] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={saveNewLocation} className="bg-[#0c1410] border border-emerald-500/40 p-8 rounded-[32px] w-full max-w-md shadow-2xl scale-in">
            <h2 className="text-emerald-400 text-xl font-black uppercase italic mb-6 tracking-widest">{editingId ? 'Manzilni tahrirlash' : 'Yangi nuqta qo\'shish'}</h2>
            <div className="space-y-4">
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
              <div>
                <label className="text-[9px] text-emerald-500/60 uppercase font-bold ml-2">Aniq Manzil</label>
                <input required autoFocus className="w-full bg-black/40 border border-emerald-500/20 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 outline-none transition-all text-emerald-100"
                  value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Manzilni kiriting..." />
              </div>
              <div>
                <label className="text-[9px] text-emerald-500/60 uppercase font-bold ml-2">Qurilma Nomi</label>
                <input className="w-full bg-black/40 border border-emerald-500/20 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 outline-none transition-all"
                  value={formData.sector} onChange={(e) => setFormData({ ...formData, sector: e.target.value })} placeholder="Masalan: Namangan-001" />
                <p className="text-[7px] text-emerald-500/40 mt-1 ml-2">Bu nom xaritadagi marker tepasida chiqadi</p>
              </div>
              <div>
                <label className="text-[9px] text-emerald-500/60 uppercase font-bold ml-2">Qurilma ID</label>
                <input className={`w-full bg-black/40 border ${deviceIdError ? 'border-red-500' : 'border-emerald-500/20'} rounded-xl px-4 py-3 text-sm focus:border-emerald-500 outline-none transition-all`}
                  value={formData.deviceId} onChange={handleDeviceIdChange} placeholder="Masalan: ESP32-001 yoki NM-01" />
                {deviceIdError ? (<p className="text-[8px] text-red-500 mt-1 ml-2 font-bold">{deviceIdError}</p>) : (<p className="text-[7px] text-emerald-500/40 mt-1 ml-2">Qurilmadan keladigan ID ni kiriting (unique bo'lishi kerak)</p>)}
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button type="button" onClick={() => {
                setShowAddModal(false);
                setFormData({ name: '', sector: '', deviceId: '' });
                setTempCoords(null);
                setEditingId(null);
                setDeviceIdError('');
                handleClearSearch();
              }} 
                className="flex-1 py-3 rounded-xl border border-emerald-500/20 text-xs font-bold uppercase hover:bg-red-500/10 hover:text-red-500 transition-all">Bekor qilish</button>
              <button type="submit" disabled={!!deviceIdError}
                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase transition-all ${deviceIdError ? 'bg-gray-600 cursor-not-allowed opacity-50' : 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]'}`}>
                {editingId ? 'Yangilash' : 'Saqlash'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============ O'CHIRISH MODALI ============ */}
      {showDeleteModal && deviceToDelete && (
        <div className="absolute inset-0 z-[3000] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0c1410] border border-red-500/40 p-8 rounded-[32px] w-full max-w-md shadow-2xl scale-in">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-red-400 text-xl font-black uppercase italic mb-3 tracking-widest">Manzilni o'chirish</h2>
              <p className="text-gray-400 text-sm mb-2">
                <span className="text-emerald-400 font-bold">{deviceToDelete.sector || deviceToDelete.name}</span>
              </p>
              <p className="text-gray-500 text-xs mb-6">ID: {deviceToDelete.deviceId || 'Mavjud emas'}</p>
              <p className="text-red-400/70 text-xs mb-6">⚠️ Ushbu manzil va unga tegishli barcha yozuvlar o'chib ketadi!</p>
              <div className="flex gap-3">
                <button onClick={cancelDelete} className="flex-1 py-3 rounded-xl border border-emerald-500/20 text-xs font-bold uppercase hover:bg-emerald-500/10 hover:text-emerald-400 transition-all">Bekor qilish</button>
                <button onClick={confirmDelete} className="flex-1 py-3 rounded-xl bg-red-500 text-black hover:bg-red-400 text-xs font-black uppercase transition-all shadow-[0_0_20px_rgba(239,68,68,0.3)]">O'chirish</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ SAQLASH UCHUN TASDIQLASH MODALI (FAQAT BIR MARTA) ============ */}
      {showSaveConfirmModal && (
        <div className="absolute inset-0 z-[3000] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0c1410] border border-emerald-500/40 p-8 rounded-[32px] w-full max-w-md shadow-2xl scale-in">
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Map className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-emerald-400 text-xl font-black uppercase italic mb-3 tracking-widest">
                Manzilni saqlash
              </h2>
              <p className="text-gray-400 text-sm mb-6">
                Ushbu manzilni saqlashni tasdiqlaysizmi?
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={cancelSave}
                  className="flex-1 py-3 rounded-xl border border-emerald-500/20 text-xs font-bold uppercase hover:bg-red-500/10 hover:text-red-500 transition-all"
                >
                  Bekor qilish
                </button>
                <button 
                  onClick={confirmSave}
                  className="flex-1 py-3 rounded-xl bg-emerald-500 text-black hover:bg-emerald-400 text-xs font-black uppercase transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                >
                  Tasdiqlash
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ ARXIV MODALI ============ */}
      {showArchive && (
        <div className="absolute inset-0 z-[2000] bg-black/80 backdrop-blur-xl flex items-center justify-center p-10">
          <div className="bg-[#0c1410] border border-emerald-500/30 w-full max-w-4xl h-[80vh] rounded-[40px] flex flex-col overflow-hidden shadow-[0_0_50px_rgba(0,0,0,1)]">
            <div className="p-6 border-b border-emerald-500/10 flex justify-between items-center bg-emerald-500/5">
              <div>
                <h2 className="text-emerald-400 text-xl font-black uppercase italic tracking-widest">Suhbatlar Arxivi</h2>
                <p className="text-[10px] text-gray-500 font-mono">Barcha saqlangan audio ma'lumotlar bazasi</p>
              </div>
              <button onClick={() => setShowArchive(false)} className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white w-10 h-10 rounded-full flex items-center justify-center transition-all border border-red-500/20"><X size={20} /></button>
            </div>
            <div className="flex-grow overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-4 custom-scrollbar">
              {savedLocations.some(l => l.recordings?.length > 0) ? (
                savedLocations.map(loc => loc.recordings?.length > 0 && (
                  <div key={loc.id} className="bg-black/40 border border-emerald-500/10 p-5 rounded-[30px]">
                    <h3 className="text-emerald-500 font-bold text-xs uppercase mb-3 border-b border-emerald-500/5 pb-2">{loc.sector || loc.name}</h3>
                    <p className="text-[8px] text-gray-400 font-mono mb-2">{loc.sector} {loc.deviceId && `| ID: ${loc.deviceId}`}</p>
                    <div className="space-y-3">
                      {loc.recordings.map(rec => (
                        <div key={rec.id} className="bg-emerald-500/5 p-3 rounded-2xl border border-emerald-500/5 group">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[8px] text-gray-400 font-mono">{rec.time || new Date(rec.timestamp).toLocaleString()}</span>
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
        .scale-in { animation: scaleIn 0.2s ease-out; }
        @keyframes scaleIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .leaflet-container { background: #0a0a0a !important; }
        .leaflet-control-attribution { font-size: 7px; background: rgba(0,0,0,0.5) !important; color: #666 !important; }
        .leaflet-popup-content-wrapper { background: #1a1a1a !important; color: white !important; border-radius: 12px !important; }
        .leaflet-popup-tip { background: #1a1a1a !important; }
      `}</style>
    </div>
  );
}