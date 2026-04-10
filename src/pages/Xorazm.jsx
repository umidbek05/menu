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

// Xorazm sektorlari ma'lumotlari
const xorazmSectors = [];  // Bo'sh array - hech qanday default qurilma yo'q

// Google Maps havolasidan koordinatalarni ajratish funksiyasi
async function extractCoordinatesFromGoogleMapsUrl(url) {
  try {
    console.log("Google Maps havolasi tahlil qilinmoqda:", url);
    
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
    console.log("Yakuniy URL:", finalUrl);


    // Format 1: @41.311081,69.240562,15z
    const atRegex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
    const atMatch = finalUrl.match(atRegex);
    
    if (atMatch) {
      return {
        lat: parseFloat(atMatch[1]),
        lng: parseFloat(atMatch[2])
      };
    }
    
    // Format 2: !3d41.311081!4d69.240562
    const latMatch = finalUrl.match(/!3d(-?\d+\.\d+)/);
    const lngMatch = finalUrl.match(/!4d(-?\d+\.\d+)/);
    
    if (latMatch && lngMatch) {
      return {
        lat: parseFloat(latMatch[1]),
        lng: parseFloat(lngMatch[2])
      };
    }
    
    // Format 3: /place/.../@41.311081,69.240562
    const placeRegex = /\/place\/.*?@(-?\d+\.\d+),(-?\d+\.\d+)/;
    const placeMatch = finalUrl.match(placeRegex);
    
    if (placeMatch) {
      return {
        lat: parseFloat(placeMatch[1]),
        lng: parseFloat(placeMatch[2])
      };
    }
    
    // Format 4: q=41.311081,69.240562
    const queryRegex = /[?&]q=(-?\d+\.\d+)%2C(-?\d+\.\d+)/;
    const queryMatch = finalUrl.match(queryRegex);
    
    if (queryMatch) {
      return {
        lat: parseFloat(queryMatch[1]),
        lng: parseFloat(queryMatch[2])
      };
    }
    
    return null;
    
  } catch (error) {
    console.error("Koordinatalarni ajratishda xato:", error);
    return null;
  }
}

export default function XorazmSignalMapper() {
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

  // Link orqali qidirish uchun state'lar
  const [searchLink, setSearchLink] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState('');

  const [savedLocations, setSavedLocations] = useState(() => {
    const saved = localStorage.getItem('xorazmLocations');
    if (saved) return JSON.parse(saved);
    
    // Agar localStorage bo'sh bo'lsa, Xorazm qurilmalarini default qilib qo'yish
    return xorazmSectors.map(device => ({
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
    const saved = localStorage.getItem('xorazmLinkedNode');
    return saved ? JSON.parse(saved) : null;
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

  // 🗺 XARITANI YUKLASH
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Xorazm markazi
    const center = [41.55, 60.63];
    
    // Xarita yaratish
    const map = L.map(mapRef.current).setView(center, 10);
    
    // 1-QATLAM: SUN'IY YO'LDOSH (ESRI World Imagery)
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri',
      maxZoom: 19,
    }).addTo(map);


    // 2-QATLAM: YO'LLAR VA NOMLAR - OQ RANGDA, ANIQ KO'RINADI
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap, &copy; CartoDB',
      maxZoom: 19,
      opacity: 1.0
    }).addTo(map);

    // Saqlangan markerlarni qo'shish
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

      marker.on('click', () => {
        handleMarkerClick(loc);
      });

      markersRef.current[loc.id] = marker;
    });

    // Xaritani bosganda nuqta qo'shish
    map.on('click', (e) => {
      handleMapPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Markerlarni yangilash
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const map = mapInstanceRef.current;

    // Eski markerlarni o'chirish
    Object.values(markersRef.current).forEach(marker => marker.remove());
    markersRef.current = {};

    // Yangi markerlarni qo'shish
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

      marker.on('click', () => {
        handleMarkerClick(loc);
      });

      markersRef.current[loc.id] = marker;
    });
  }, [savedLocations]);

  // Qidiruv natijasini markazlashtirish
  useEffect(() => {
    if (!mapInstanceRef.current || !searchResult) return;

    const map = mapInstanceRef.current;

    // Avvalgi qidiruv markerini o'chirish
    if (searchMarkerRef.current) {
      searchMarkerRef.current.remove();
    }

    // Yangi qidiruv markerini qo'shish
    searchMarkerRef.current = L.marker([searchResult.lat, searchResult.lng], { 
      icon: yellowIcon 
    }).addTo(map);

    searchMarkerRef.current.bindPopup(`
      <div style="color: #333; padding: 5px;">
        <strong style="color: #fbbf24;">Qidiruv natijasi</strong>
        <p style="font-size: 11px; margin: 5px 0;">${searchResult.displayName}</p>
      </div>
    `).openPopup();

    map.setView([searchResult.lat, searchResult.lng], 14);
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

  // Ringtone ovozini ijro etish
  const playRingtoneSound = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    const ctx = audioContextRef.current;
    
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    
    if (!audioBufferRef.current) {
      audioBufferRef.current = createRingtoneSound();
    }
    
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
      } catch (e) {}
    }
    
    audioSourceRef.current = ctx.createBufferSource();
    audioSourceRef.current.buffer = audioBufferRef.current;
    audioSourceRef.current.loop = false;
    audioSourceRef.current.connect(ctx.destination);
    
    audioSourceRef.current.onended = () => {
      audioSourceRef.current = null;
    };
    
    audioSourceRef.current.start();
    console.log("📱 Rington: YANGI QURILMA SO'ROVI KELDI - XORAZM");
  }, [createRingtoneSound]);

  // Barcha ovozlarni to'xtatish
  const stopAllSounds = useCallback(() => {
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
        audioSourceRef.current = null;
      } catch (e) {}
    }
  }, []);

  // LocalStorage-ga saqlash
  useEffect(() => {
    localStorage.setItem('xorazmLocations', JSON.stringify(savedLocations));
  }, [savedLocations]);

  // Vaqtni yangilash
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ✅ TUZATILGAN: WebSocket ulanish - Namangan va Navoiy bilan bir xil
  // WebSocket ulanish - Railway URL bilan
useEffect(() => {
  try {
    // Railway URL
    const WS_URL = 'wss://serversos-production.up.railway.app';
    
    socketRef.current = new WebSocket(WS_URL);
    
    socketRef.current.onopen = () => {
      console.log("✅ WebSocket ulandi - XORAZM (Railway)");
      socketRef.current.send(JSON.stringify({ type: 'frontend' }));
    };

    socketRef.current.onmessage = (event) => {
      try {
        // Audio ma'lumot (binary)
        if (event.data instanceof Blob) {
          console.log("🎤 Audio ma'lumot keldi, o'lcham:", event.data.size);
          
          // Audio ni ijro etish uchun
          const audioUrl = URL.createObjectURL(event.data);
          const audio = new Audio(audioUrl);
          audio.play().catch(e => console.log("Audio ijro etishda xato:", e));
          
          return;
        }
        
        // JSON xabar
        const data = JSON.parse(event.data);
        console.log("📩 WebSocket xabar keldi:", data);
        
        if (data.type === 'list') {
          setEspDevices(prevDevices => {
            const newDevicesList = data.devices || [];
            
            // Yangi pending qurilmalar bo'lsa rington chalish
            const hasNewPending = newDevicesList.some(
              newDev => !prevDevices.some(oldDev => oldDev.id === newDev.id) && newDev.status === 'pending'
            );
            
            if (hasNewPending) {
              console.log("🔔 Yangi pending qurilma topildi");
              playRingtoneSound();
            }
            
            return newDevicesList;
          });
        } else if (data.type === 'new_pending_device') {
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
      } catch (e) {
        console.error("WebSocket xatoni qayta ishlashda xato:", e);
      }
    };

    socketRef.current.onerror = (error) => {
      console.error("❌ WebSocket xatosi:", error);
    };

 // ✅ QO'L REJIMI - SAHIFA AVTOMATIK YANGILANMAYDI
    socketRef.current.onclose = () => {
      console.log("🔌 WebSocket uzildi - qayta ulanish faqat qo'lda");
      // Hech narsa qilma, sahifa yangilanmaydi
    };

  } catch (e) {
    console.log("WebSocket ulanishda xato:", e);
  }

  return () => {
    if (socketRef.current) {
      socketRef.current.close();
    }
    stopAllSounds();
  };
}, [playRingtoneSound, stopAllSounds]);
// espDevices ni dependency ga qo'shilmadi!

  // ✅ QURILMA ID UNIQUE EKANLIGINI TEKSHIRISH
  const isDeviceIdUnique = (deviceId, currentLocationId = null) => {
    if (!deviceId || deviceId.trim() === '') return true;
    
    return !savedLocations.some(loc => 
      loc.deviceId && 
      loc.deviceId === deviceId && 
      loc.id !== currentLocationId
    );
  };

  // ✅ QURILMA ID O'ZGARGANDA TEKSHIRISH
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
      
      if (address.includes('goo.gl/maps') || 
          address.includes('maps.app.goo.gl') || 
          address.includes('google.com/maps') ||
          address.includes('maps.google.com')) {
        
        const coords = await extractCoordinatesFromGoogleMapsUrl(address);
        
        if (coords) {
          lat = coords.lat;
          lng = coords.lng;
          
          const reverseResponse = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
          );
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
        
        const reverseResponse = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
        );
        const reverseData = await reverseResponse.json();
        displayName = reverseData.display_name || `${lat}, ${lng}`;
      }
      else {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            address + " Xorazm"
          )}&limit=5`
        );
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

  // Qidiruv natijasini saqlash
  const handleSaveSearchResult = () => {
    if (!searchResult) return;
    
    setEditingId(null);
    setTempCoords({ lat: searchResult.lat, lng: searchResult.lng });
    setFormData({
      name: searchResult.displayName,
      sector: '',
      deviceId: ''
    });
    setShowAddModal(true);
    setSearchResult(null);
    setSearchLink('');
    
    // Qidiruv markerini o'chirish
    if (searchMarkerRef.current) {
      searchMarkerRef.current.remove();
      searchMarkerRef.current = null;
    }
  };

  // Qidiruv natijasini tozalash
  const handleClearSearch = () => {
    setSearchResult(null);
    setSearchLink('');
    setSearchError('');
    
    if (searchMarkerRef.current) {
      searchMarkerRef.current.remove();
      searchMarkerRef.current = null;
    }
  };

  // ✅ MARKERNI BOSGANDA TAHRIRLASH
  const handleMarkerClick = (location) => {
    setEditingId(location.id);
    setTempCoords({ lat: location.lat, lng: location.lng });
    setFormData({
      name: location.name,
      sector: location.sector || '',
      deviceId: location.deviceId || ''
    });
    setDeviceIdError('');
    setShowAddModal(true);
    
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([location.lat, location.lng], 14);
    }
  };

  // ✅ YANGI NUQTA QO'SHISH
  const handleMapPick = async (latlng) => {
    setEditingId(null);
    setTempCoords(latlng);
    setShowAddModal(true);
    setDeviceIdError('');
    setFormData((prev) => ({ ...prev, name: "Yuklanmoqda...", deviceId: '' }));


    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latlng.lat}&lon=${latlng.lng}&zoom=18&addressdetails=1`
      );
      const data = await response.json();

      if (data && data.display_name) {
        setFormData((prev) => ({
          ...prev,
          name: data.display_name,
          sector:
            data.address?.suburb ||
            data.address?.city_district ||
            data.address?.town ||
            data.address?.village ||
            data.address?.city ||
            "",
        }));
      }
    } catch (error) {
      console.error("Manzilni aniqlashda xato:", error);
      setFormData((prev) => ({ ...prev, name: "" }));
    }
  };

  // ✅ SAQLASH FUNKSIYASI
  const saveNewLocation = (e) => {
    e.preventDefault();
    
    if (!tempCoords || !formData.name) {
      alert("❌ Manzilni to'liq kiriting!");
      return;
    }

    if (formData.name === "Yuklanmoqda...") {
      alert("⏳ Manzil aniqlanmoqda, biroz kuting...");
      return;
    }

    if (formData.deviceId && formData.deviceId.trim() !== '') {
      if (!isDeviceIdUnique(formData.deviceId, editingId)) {
        alert("❌ Bu qurilma ID si allaqachon boshqa qurilmaga biriktirilgan!");
        return;
      }
    }

    if (editingId) {
      setSavedLocations(prev =>
        prev.map(loc =>
          loc.id === editingId
            ? { ...loc, ...formData, lat: tempCoords.lat, lng: tempCoords.lng }
            : loc
        )
      );
      alert("✅ Manzil muvaffaqiyatli tahrirlandi!");
    } else {
      const newLocation = {
        id: Date.now().toString(),
        lat: tempCoords.lat,
        lng: tempCoords.lng,
        ...formData,
        recordings: []
      };
      setSavedLocations(prev => [...prev, newLocation]);
      alert("✅ Yangi manzil muvaffaqiyatli qo'shildi!");
    }

    setShowAddModal(false);
    setFormData({ name: '', sector: '', deviceId: '' });
    setTempCoords(null);
    setEditingId(null);
    setDeviceIdError('');
    handleClearSearch();
  };

  // Manzilni o'chirish
  const handleDeleteLocation = (id) => {
    if (window.confirm("Ushbu manzil va unga tegishli barcha yozuvlar o'chib ketadi. Rozimisiz?")) {
      setSavedLocations(prev => prev.filter(loc => loc.id !== id));
      if (linkedNode?.id === id) {
        handleStopAndDisconnect();
      }
    }
  };

  // Qurilma nomi olish
  const getDeviceName = (location) => {
    if (location.sector?.trim()) return location.sector;
    if (location.deviceId?.trim()) return `ID: ${location.deviceId}`;
    return "Qurilma";
  };

  // Manzil nomini qisqartirish
  const getLocationName = (location) => {
    if (location.name?.length > 40) {
      return location.name.substring(0, 40) + "...";
    }
    return location.name || "Noma'lum manzil";
  };

  // ✅ TUZATILGAN: Bog'lanish o'rnatish - Navoiy bilan bir xil
  const handleEstablishLink = (location) => {
    const device = espDevices.find(d => d.id === location.deviceId);
    
    if (!device) {
      alert(`❌ Qurilma topilmadi. ID: ${location.deviceId || 'Noma\'lum'}`);
      return;
    }

    if (device.status === 'pending') {
      handleAuthorize(device.id);
      alert("⏳ Ruxsat so'rovi yuborildi. Iltimos, kuting...");
      return;
    }

    if (device.status === 'active') {
      const newNode = { 
        ...location, 
        deviceId: device.id 
      };
      setLinkedNode(newNode);
      localStorage.setItem('xorazmLinkedNode', JSON.stringify(newNode));
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([location.lat, location.lng], 14);
      }
    }
  };

  // ✅ TUZATILGAN: Bog'lanishni uzish - Navoiy bilan bir xil
  const handleStopAndDisconnect = () => {
    stopAudio();
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'close', deviceId: linkedNode?.deviceId }));
    }
    setIsVoiceActive(false);
    setLinkedNode(null);
    localStorage.removeItem('xorazmLinkedNode');
    stopAllSounds();
  };


  // Ovozli aloqa boshlash
  const startAudio = async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }

      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const source = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      
      source.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);

      audioChunksRef.current = [];
      mediaRecorderRef.current = new MediaRecorder(mediaStreamRef.current);

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.start();
      setIsVoiceActive(true);
    } catch (error) {
      console.error("Ovozni boshlashda xato:", error);
      alert("Mikrofonga ruxsat berilmagan!");
    }
  };

  // Ovozli aloqani to'xtatish
  const stopAudio = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        
        reader.onloadend = () => {
          const base64Audio = reader.result;
          const timestamp = new Date().toLocaleString();

          setSavedLocations(prev =>
            prev.map(loc =>
              loc.id === linkedNode?.id
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

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsVoiceActive(false);
  };

  // Yozuvni o'chirish
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

  // Qurilmani avtorizatsiya qilish
  const handleAuthorize = (deviceId) => {
    setEspDevices(prev =>
      prev.map(dev =>
        dev.id === deviceId ? { ...dev, status: 'active' } : dev
      )
    );
    
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'authorize', deviceId }));
    }
  };

  return (
    <div className="flex h-screen bg-black text-white font-sans overflow-hidden relative">
      
      {/* 🗺 XARITA QISMI */}
      <div className="w-[70%] h-full flex flex-col relative border-r border-emerald-500/20">
        {/* NAVBAR */}
        <div className="p-4 bg-gray-900/90 backdrop-blur-md border-b border-emerald-500/20 z-[1000]">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-xl font-black text-emerald-400 uppercase italic tracking-tighter flex items-center gap-2 whitespace-nowrap">
              <Map className="w-5 h-5" /> Xorazm Signal Mapper
            </h1>


            {/* QIDIRUV MAYDONI */}
            <div className="flex-1 max-w-2xl">
              <div className="relative">
                <input
                  type="text"
                  value={searchLink}
                  onChange={(e) => {
                    setSearchLink(e.target.value);
                    setSearchError('');
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearchByLink()}
                  placeholder="Google Maps havolasi, koordinata yoki manzil..."
                  className="w-full bg-black/60 border border-emerald-500/20 rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500 outline-none transition-all pr-20"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                  {searchLink && (
                    <button
                      onClick={() => setSearchLink('')}
                      className="p-1.5 text-gray-500 hover:text-red-500"
                    >
                      <X size={16} />
                    </button>
                  )}
                  <button
                    onClick={handleSearchByLink}
                    disabled={isSearching}
                    className={`p-1.5 rounded-lg transition-all ${
                      isSearching ? 'bg-gray-600 cursor-wait' : 'bg-emerald-600 hover:bg-emerald-500'
                    }`}
                  >
                    <Search size={16} />
                  </button>
                </div>
              </div>
              
              {searchError && (
                <div className="mt-2 text-red-500 text-xs px-2">
                  {searchError}
                </div>
              )}
            </div>

            {/* SOAT */}
            <div className="text-2xl font-mono text-emerald-400 whitespace-nowrap">
              {currentTime.toLocaleTimeString('uz-UZ')}
            </div>
          </div>

          {/* Qidiruv natijasi */}
          {searchResult && (
            <div className="mt-3 bg-yellow-500/10 border border-yellow-500/30 p-3 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <p className="text-[10px] text-yellow-500 font-bold uppercase mb-1">✓ TOPILDI:</p>
                  <p className="text-sm text-white mb-1">{searchResult.displayName}</p>
                  <p className="text-xs text-gray-400">
                    {searchResult.lat.toFixed(6)}, {searchResult.lng.toFixed(6)}
                  </p>
                </div>
                <button 
                  onClick={handleClearSearch}
                  className="p-1 text-gray-500 hover:text-red-500"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleSaveSearchResult}
                  className="flex-1 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all"
                >
                  Saqlash
                </button>
              </div>
            </div>
          )}
        </div>

        {/* XARITA KONTEYNERI */}
        <div 
          className="flex-grow relative bg-[#0a0a0a]" 
          ref={mapRef} 
          style={{ height: '100%', width: '100%', minHeight: '500px' }}
        />
      </div>


      {/* O'NG PANEL */}
      <div className="w-[30%] bg-[#080d0b] p-6 flex flex-col gap-6 overflow-y-auto">
        
        <div className="flex justify-between items-center border-b border-emerald-500/20 pb-4">
          <h3 className="text-emerald-500 text-xs font-black tracking-[0.3em] uppercase italic">
            Saqlangan Manzillar ({savedLocations.length})
          </h3>
          <button 
            onClick={() => setShowArchive(true)} 
            className="bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-emerald-500/30 flex items-center gap-1"
          >
            <Archive size={14} /> ARXIV
          </button>
        </div>

        <div className="flex-grow overflow-y-auto space-y-4 custom-scrollbar pr-2">
          {savedLocations.length === 0 ? (
            <div className="text-center py-10 text-gray-600 italic text-sm">
              Hozircha manzillar yo'q. Xaritadan nuqta tanlang yoki yuqoridagi qidiruv orqali qo'shing.
            </div>
          ) : (
            savedLocations.map((loc) => {
              const device = loc.deviceId ? espDevices.find(d => d.id === loc.deviceId) : null;
              const isLinked = linkedNode?.id === loc.id;
              const locationName = getLocationName(loc);
              
              return (
                <div 
                  key={loc.id} 
                  className={`p-5 rounded-3xl border transition-all duration-500 relative ${
                    isLinked 
                      ? 'bg-emerald-500/10 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.15)]' 
                      : device?.status === 'pending'
                      ? 'bg-yellow-500/10 border-yellow-500'
                      : 'bg-black/40 border-emerald-500/20'
                  }`}
                >
                  <button 
                    onClick={() => handleDeleteLocation(loc.id)}
                    className="absolute top-4 right-4 text-gray-600 hover:text-red-500 transition-colors"
                    title="O'chirish"
                  >
                    <Trash2 size={16} />
                  </button>


                  <div 
                    className="mb-4 pr-6 cursor-pointer hover:bg-emerald-500/5 p-2 rounded-xl transition-all"
                    onClick={() => handleMarkerClick(loc)}
                  >
                    <h4 className="font-bold text-emerald-400 text-sm uppercase truncate" title={loc.name}>
                      {locationName}
                    </h4>
                    <p className="text-[10px] text-emerald-200/60 font-mono italic truncate">
                      <span className="text-emerald-400">Qurilma:</span> {loc.sector || "Noma'lum"} 
                      {loc.deviceId && ` | ID: ${loc.deviceId}`}
                      {device && ` | Status: ${device ? device.status : 'Noma\'lum'}`}
                    </p>
                    <p className="text-[7px] text-gray-600 mt-1">
                      {loc.lat.toFixed(6)}, {loc.lng.toFixed(6)}
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
                        {loc.deviceId ? `Qurilma topilmadi (${loc.deviceId})` : 'ID kiritilmagan'}
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
                        {isVoiceActive ? (
                          <span className="flex items-center justify-center gap-2">
                            <MicOff size={14} /> Yozuvni To'xtatish
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-2">
                            <Mic size={14} /> Ovozli Aloqa
                          </span>
                        )}
                      </button>
                      <button 
                        onClick={handleStopAndDisconnect}
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

      {/* 3. YANGI MANZIL QO'SHISH MODALI - NAVOIY VERSIYASI (SODDALASHTIRILGAN) */}
      {showAddModal && (
        <div className="absolute inset-0 z-[3000] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={saveNewLocation} className="bg-[#0c1410] border border-emerald-500/40 p-8 rounded-[32px] w-full max-w-md shadow-2xl scale-in">
            <h2 className="text-emerald-400 text-xl font-black uppercase italic mb-6 tracking-widest">
              {editingId ? 'Manzilni tahrirlash' : 'Yangi nuqta qo\'shish'}
            </h2>
            
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

              <div>
                <label className="text-[9px] text-emerald-500/60 uppercase font-bold ml-2">Qurilma Nomi</label>
                <input
                  className="w-full bg-black/40 border border-emerald-500/20 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 outline-none transition-all"
                  value={formData.sector}
                  onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                  placeholder="Masalan: Xorazm-001"
                />
                <p className="text-[7px] text-emerald-500/40 mt-1 ml-2">Bu nom xaritadagi marker tepasida chiqadi</p>
              </div>

              <div>
                <label className="text-[9px] text-emerald-500/60 uppercase font-bold ml-2">Qurilma ID</label>
                <input
                  className={`w-full bg-black/40 border ${deviceIdError ? 'border-red-500' : 'border-emerald-500/20'} rounded-xl px-4 py-3 text-sm focus:border-emerald-500 outline-none transition-all`}
                  value={formData.deviceId}
                  onChange={handleDeviceIdChange}
                  placeholder="Masalan: ESP32-001 yoki Xiva-01"
                />
                {deviceIdError ? (
                  <p className="text-[8px] text-red-500 mt-1 ml-2 font-bold">{deviceIdError}</p>
                ) : (
                  <p className="text-[7px] text-emerald-500/40 mt-1 ml-2">Qurilmadan keladigan ID ni kiriting (unique bo'lishi kerak)</p>
                )}
              </div>
            </div>


            <div className="flex gap-3 mt-8">
              <button type="button" onClick={() => {
                setShowAddModal(false);
                setFormData({ name: '', sector: '', deviceId: '' });
                setTempCoords(null);
                setEditingId(null);
                setDeviceIdError('');
              }} className="flex-1 py-3 rounded-xl border border-emerald-500/20 text-xs font-bold uppercase hover:bg-red-500/10 hover:text-red-500 transition-all">
                Bekor qilish
              </button>
              <button 
                type="submit" 
                disabled={!!deviceIdError}
                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase transition-all ${
                  deviceIdError 
                    ? 'bg-gray-600 cursor-not-allowed opacity-50' 
                    : 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                }`}
              >
                {editingId ? 'Yangilash' : 'Saqlash'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ARXIV MODALI */}
      {showArchive && (
        <div className="absolute inset-0 z-[2000] bg-black/80 backdrop-blur-xl flex items-center justify-center p-10">
          <div className="bg-[#0c1410] border border-emerald-500/30 w-full max-w-4xl h-[80vh] rounded-[40px] flex flex-col overflow-hidden shadow-[0_0_50px_rgba(0,0,0,1)]">
            <div className="p-6 border-b border-emerald-500/10 flex justify-between items-center bg-emerald-500/5">
              <div>
                <h2 className="text-emerald-400 text-xl font-black uppercase italic tracking-widest">Suhbatlar Arxivi</h2>
                <p className="text-[10px] text-gray-500 font-mono">Barcha saqlangan audio ma'lumotlar bazasi</p>
              </div>
              <button onClick={() => setShowArchive(false)} className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white w-10 h-10 rounded-full flex items-center justify-center transition-all border border-red-500/20">
                <X size={20} />
              </button>
            </div>
            <div className="flex-grow overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-4 custom-scrollbar">
              {savedLocations.some(l => l.recordings?.length > 0) ? (
                savedLocations.map(loc => loc.recordings?.length > 0 && (
                  <div key={loc.id} className="bg-black/40 border border-emerald-500/10 p-5 rounded-[30px]">
                    <h3 className="text-emerald-500 font-bold text-xs uppercase mb-3 border-b border-emerald-500/5 pb-2">
                      {loc.sector || loc.name}
                    </h3>
                    <p className="text-[8px] text-gray-400 font-mono mb-2">
                      {loc.sector} {loc.deviceId && `| ID: ${loc.deviceId}`}
                    </p>
                    <div className="space-y-3">
                      {loc.recordings.map(rec => (
                        <div key={rec.id} className="bg-emerald-500/5 p-3 rounded-2xl border border-emerald-500/5 group">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[8px] text-gray-400 font-mono">{rec.time}</span>
                            <button 
                              onClick={() => deleteRecording(loc.id, rec.id)} 
                              className="text-[8px] text-red-500 uppercase font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              O'chirish
                            </button>
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
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .leaflet-container { background: #0a0a0a !important; }
        .leaflet-control-attribution { font-size: 7px; background: rgba(0,0,0,0.5) !important; color: #666 !important; }
        .leaflet-popup-content-wrapper { background: #1a1a1a !important; color: white !important; border-radius: 12px !important; }
        .leaflet-popup-tip { background: #1a1a1a !important; }
      `}</style>
    </div>
  );
}