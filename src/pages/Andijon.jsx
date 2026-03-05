import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, ScaleControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Leaflet ikonkalari xatosini to'g'rilash
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

const redIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Andijon viloyati sanoat va aholi punktlari
const andijonTumanlari = [
    { name: "Asaka (Avtosanoat)", pos: [40.6417, 72.2333] },
    { name: "Shahrixon", pos: [40.7111, 72.0444] },
    { name: "Xonobod shahri", pos: [40.8000, 73.0000] },
    { name: "Qorasuv", pos: [40.7167, 72.9667] },
    { name: "Xo'jaobod", pos: [40.6667, 72.5667] },
    { name: "Paxtaobod", pos: [40.9333, 72.5000] },
    { name: "Baliqchi", pos: [40.9333, 71.9167] },
    { name: "Marhamat", pos: [40.5000, 72.3333] }
];

export default function Andijon() {
  const [geoData, setGeoData] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showDistricts, setShowDistricts] = useState(false);
  const mapRef = useRef(null);
  const andijonMarkerRef = useRef(null);

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
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (andijonMarkerRef.current) {
      setTimeout(() => {
        andijonMarkerRef.current.openPopup();
      }, 1000);
    }
  }, [geoData]);

  const mapStyle = {
    fillColor: "#2196F3", 
    weight: 4,
    opacity: 0.9,
    color: 'white',
    dashArray: '4', 
    fillOpacity: 0.15
  };

  return (
    <div className="flex h-screen font-sans overflow-hidden">
      
      {/* MONITORING PANEL - 70% (Chap taraf) */}
      <div className="w-[70%] h-full flex flex-col bg-gray-900 text-white relative shadow-[40px_0_80px_rgba(0,0,0,0.7)] z-10 border-r border-gray-800">
        
        {/* Yuqori Panel */}
        <div className="p-6 bg-gray-800/90 backdrop-blur-xl border-b border-gray-700 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3">
               <h1 className="text-2xl font-black text-blue-400 uppercase tracking-tighter">Andijon Monitoring</h1>
               <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] rounded border border-blue-500/30 font-bold">AUTO-CLUSTER</span>
            </div>
            <button 
              onClick={() => setShowDistricts(!showDistricts)}
              className={`mt-4 px-8 py-2.5 rounded-xl text-[11px] font-black transition-all duration-500 border-2 ${
                showDistricts 
                ? 'bg-red-500/20 border-red-500 text-red-500 shadow-[0_0_30px_rgba(239,68,68,0.4)]' 
                : 'bg-blue-600/20 border-blue-500/50 text-blue-400 hover:bg-blue-500/30'
              }`}
            >
              {showDistricts ? "DETALIZATSIYANI YASHIRISH" : "HUDUDLARNI KATTALASHTIRISH"}
            </button>
          </div>
          <div className="text-right">
            <div className="text-3xl font-mono text-blue-400 leading-none tracking-tight">
              {currentTime.toLocaleTimeString('uz-UZ')}
            </div>
            <div className="text-[11px] text-gray-500 font-bold mt-2 uppercase font-mono tracking-tighter">
               Sector AND-01 Live
            </div>
          </div>
        </div>

        {/* XARITA KONTEYNERI */}
        <div className="flex-grow p-5 bg-gray-900">
          <div className="w-full h-full relative rounded-[2.5rem] overflow-hidden border border-gray-700/50 shadow-2xl bg-gray-800">
            
            <MapContainer 
              // Zoom 10.5 - Andijon kichikroq bo'lgani uchun uni katta qilib ko'rsatadi
              center={[40.75, 72.45]} 
              zoom={10.5} 
              zoomControl={false}
              style={{ height: '100%', width: '100%' }}
              ref={mapRef}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

              {geoData && <GeoJSON data={geoData} style={mapStyle} />}

              {/* VILOYAT MARKAZI */}
              <Marker 
                position={[40.7833, 72.3333]} 
                icon={DefaultIcon}
                ref={andijonMarkerRef}
              >
                <Popup autoClose={false} closeOnClick={false}>
                  <div className="text-center p-2">
                    <b className="text-blue-800 text-base">Andijon shahri</b><br/>
                    <div className="h-[1px] bg-blue-100 my-1"></div>
                    <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Sanoat Markazi</span>
                  </div>
                </Popup>
              </Marker>

              {showDistricts && andijonTumanlari.map((tuman, idx) => (
                <Marker key={idx} position={tuman.pos} icon={redIcon}>
                  <Popup>
                    <div className="text-gray-900 font-extrabold text-sm">{tuman.name}</div>
                  </Popup>
                </Marker>
              ))}

              <ScaleControl position="bottomleft" />
            </MapContainer>

            {/* STATUS OVERLAY */}
            <div className="absolute top-6 left-6 z-[1001]">
                <div className="flex items-center gap-3 bg-gray-900/95 px-5 py-2.5 rounded-2xl border border-blue-500/40 shadow-2xl">
                    <span className="relative flex h-3.5 w-3.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-blue-500"></span>
                    </span>
                    <span className="text-xs font-black text-blue-100 uppercase tracking-widest">Cluster: Online</span>
                </div>
            </div>

          </div>
        </div>
      </div>

      {/* 30% MUTLAQ BO'SH QISM - RANGLAR VA FONSIZ */}
      <div className="w-[30%] h-full"></div>

    </div>
  );
}