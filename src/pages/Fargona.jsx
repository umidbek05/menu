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

// Farg'ona viloyati muhim shahar va tumanlari
const fargonaTumanlari = [
    { name: "Qo'qon shahri", pos: [40.5286, 70.9425] },
    { name: "Marg'ilon shahri", pos: [40.4714, 71.7250] },
    { name: "Quvasoy shahri", pos: [40.3056, 71.9778] },
    { name: "Rishton", pos: [40.3556, 71.2833] },
    { name: "Oltiariq", pos: [40.3833, 71.4833] },
    { name: "Quva", pos: [40.5167, 72.0167] },
    { name: "Bog'dod", pos: [40.5000, 71.2167] },
    { name: "Uchko'prik", pos: [40.5333, 71.0500] }
];

export default function Fargona() {
  const [geoData, setGeoData] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showDistricts, setShowDistricts] = useState(false);
  const mapRef = useRef(null);
  const fargonaMarkerRef = useRef(null);

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
    return () => clearInterval(timer);
  }, []);

  // Avtomatik ravishda Farg'ona shahri popupini ochish
  useEffect(() => {
    if (fargonaMarkerRef.current) {
      setTimeout(() => {
        fargonaMarkerRef.current.openPopup();
      }, 1000);
    }
  }, [geoData]);

  const mapStyle = {
    fillColor: "#FF9800", // Amber Orange
    weight: 3,
    opacity: 0.8,
    color: 'white',
    dashArray: '3', 
    fillOpacity: 0.12
  };

  return (
    <div className="flex h-screen font-sans overflow-hidden bg-white">
      
      {/* MONITORING PANEL - 70% */}
      <div className="w-[70%] h-full flex flex-col bg-gray-900 text-white relative shadow-[20px_0_40px_rgba(0,0,0,0.4)] z-10 border-r border-gray-800">
        
        {/* Yuqori Panel */}
        <div className="p-5 bg-gray-800/80 backdrop-blur-md border-b border-gray-700 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3">
               <h1 className="text-xl font-black text-orange-400 uppercase tracking-widest">Farg'ona Monitoring</h1>
               <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-[10px] rounded border border-orange-500/30 font-bold">VODIY-CORE</span>
            </div>
            <button 
              onClick={() => setShowDistricts(!showDistricts)}
              className={`mt-3 px-6 py-2 rounded-xl text-[11px] font-black transition-all duration-500 border-2 ${
                showDistricts 
                ? 'bg-red-500/20 border-red-500 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]' 
                : 'bg-orange-500/10 border-orange-500/50 text-orange-400 hover:bg-orange-500/20'
              }`}
            >
              {showDistricts ? "TUMANLARNI YASHIRISH" : "SANOAT NUQTALARINI ANALIZ QILISH"}
            </button>
          </div>
          <div className="text-right">
            <div className="text-2xl font-mono text-orange-400 leading-none">
              {currentTime.toLocaleTimeString('uz-UZ')}
            </div>
            <div className="text-[10px] text-gray-500 font-bold mt-1 uppercase font-mono tracking-tighter">
               Valley Sector FER-11
            </div>
          </div>
        </div>

        {/* XARITA KONTEYNERI */}
        <div className="flex-grow p-4 bg-gray-900">
          <div className="w-full h-full relative rounded-3xl overflow-hidden border border-gray-700/50 shadow-inner bg-gray-800">
            
            <MapContainer 
              // Zoom 9 - Farg'ona viloyatining keng hududi uchun optimal
              center={[40.45, 71.4]} 
              zoom={9} 
              style={{ height: '100%', width: '100%' }}
              ref={mapRef}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

              {geoData && <GeoJSON data={geoData} style={mapStyle} />}

              {/* VILOYAT MARKAZI - FARG'ONA SHAHRI */}
              <Marker 
                position={[40.3864, 71.7864]} 
                icon={DefaultIcon}
                ref={fargonaMarkerRef}
              >
                <Popup autoClose={false} closeOnClick={false}>
                  <div className="text-center p-1">
                    <b className="text-orange-600 text-sm">Farg'ona shahri</b><br/>
                    <div className="h-[1px] bg-gray-200 my-1"></div>
                    <span className="text-[10px] text-gray-400 uppercase font-black">Markaziy Sektor</span>
                  </div>
                </Popup>
              </Marker>

              {/* TUMANLAR VA SHAHARLAR */}
              {showDistricts && fargonaTumanlari.map((tuman, idx) => (
                <Marker key={idx} position={tuman.pos} icon={redIcon}>
                  <Popup>
                    <div className="text-gray-900 font-bold text-xs">{tuman.name}</div>
                  </Popup>
                </Marker>
              ))}

              <ScaleControl position="bottomleft" />
            </MapContainer>

            {/* STATUS OVERLAY */}
            <div className="absolute top-4 left-4 z-[1001]">
                <div className="flex items-center gap-2 bg-gray-900/90 px-4 py-2 rounded-2xl border border-orange-500/30 shadow-2xl">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                    </span>
                    <span className="text-[10px] font-black text-orange-100 uppercase tracking-tighter">System: Online</span>
                </div>
            </div>

          </div>
        </div>
      </div>

      {/* 30% MUTLAQ BO'SH QISM (OQ VA TOZA) */}
      <div className="w-[30%] h-full bg-white"></div>

    </div>
  );
}