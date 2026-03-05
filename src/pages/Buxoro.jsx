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

const buxoroTumanlari = [
    { name: "G'ijduvon", pos: [40.1000, 64.6667] },
    { name: "Kogon shahri", pos: [39.7167, 64.5500] },
    { name: "Qorako'l", pos: [39.5000, 63.8500] },
    { name: "Olot", pos: [39.4167, 63.8000] },
    { name: "Gazli shahri", pos: [40.1311, 63.4561] },
    { name: "Vobkent", pos: [40.0333, 64.5167] },
    { name: "Shofirkon", pos: [40.1167, 64.5000] },
    { name: "Qorovulbozor", pos: [39.5000, 64.8167] },
    { name: "Jondor", pos: [39.7333, 64.1833] }
];

export default function Buxoro() {
  const [geoData, setGeoData] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showDistricts, setShowDistricts] = useState(false);
  const mapRef = useRef(null);
  const buxoroMarkerRef = useRef(null);

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/crebor-online/uzbekistan-geojson/master/uzbekistan.json')
      .then(res => res.json())
      .then(data => {
        const region = data.features.find(f => 
            f.properties.name_uz === "Buxoro" || f.properties.name === "Bukhara"
        );
        setGeoData(region);
      });

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (buxoroMarkerRef.current) {
      setTimeout(() => {
        buxoroMarkerRef.current.openPopup();
      }, 1000);
    }
  }, [geoData]);

  const mapStyle = {
    fillColor: "#A1887F", 
    weight: 4,
    opacity: 0.9,
    color: 'white',
    dashArray: '4', 
    fillOpacity: 0.15
  };

  return (
    <div className="flex h-screen font-sans overflow-hidden bg-white">
      
      {/* MONITORING PANEL - 70% */}
      <div className="w-[70%] h-full flex flex-col bg-gray-900 text-white relative shadow-[30px_0_60px_rgba(0,0,0,0.6)] z-10 border-r border-gray-800">
        
        {/* Yuqori Panel */}
        <div className="p-6 bg-gray-800/90 backdrop-blur-xl border-b border-gray-700 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3">
               <h1 className="text-2xl font-black text-stone-300 uppercase tracking-tighter">Buxoro Monitoring</h1>
               <span className="px-2 py-0.5 bg-stone-500/20 text-stone-400 text-[10px] rounded border border-stone-500/30 font-bold tracking-widest">LIVE-DATA</span>
            </div>
            <button 
              onClick={() => setShowDistricts(!showDistricts)}
              className={`mt-4 px-8 py-2.5 rounded-xl text-[11px] font-black transition-all duration-500 border-2 ${
                showDistricts 
                ? 'bg-red-500/20 border-red-500 text-red-500 shadow-[0_0_30px_rgba(239,68,68,0.4)]' 
                : 'bg-stone-600/20 border-stone-500/50 text-stone-300 hover:bg-stone-500/30'
              }`}
            >
              {showDistricts ? "DETALIZATSIYANI YOPISH" : "HUDUDLARNI KATTALASHTIRISH"}
            </button>
          </div>
          <div className="text-right">
            <div className="text-3xl font-mono text-stone-200 leading-none tracking-tight">
              {currentTime.toLocaleTimeString('uz-UZ')}
            </div>
            <div className="text-[11px] text-stone-500 font-bold mt-2 uppercase font-mono">
               Sector: BUX-Main-08
            </div>
          </div>
        </div>

        {/* XARITA KONTEYNERI */}
        <div className="flex-grow p-5 bg-gray-900">
          <div className="w-full h-full relative rounded-[2.5rem] overflow-hidden border border-gray-700/50 shadow-2xl bg-gray-800">
            
            <MapContainer 
              // Kattaroq ko'rinishi uchun Zoom 9.2 va markazlashtirish
              center={[39.85, 64.3]} 
              zoom={9.2} 
              zoomControl={false}
              style={{ height: '100%', width: '100%' }}
              ref={mapRef}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

              {geoData && <GeoJSON data={geoData} style={mapStyle} />}

              {/* VILOYAT MARKAZI */}
              <Marker 
                position={[39.7747, 64.4286]} 
                icon={DefaultIcon}
                ref={buxoroMarkerRef}
              >
                <Popup autoClose={false} closeOnClick={false}>
                  <div className="text-center p-2">
                    <b className="text-stone-800 text-base">Buxoro shahri</b><br/>
                    <div className="h-[1px] bg-stone-200 my-1"></div>
                    <span className="text-[10px] text-stone-500 uppercase font-black tracking-widest">Markaziy Baza</span>
                  </div>
                </Popup>
              </Marker>

              {showDistricts && buxoroTumanlari.map((tuman, idx) => (
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
                <div className="flex items-center gap-3 bg-gray-900/95 px-5 py-2.5 rounded-2xl border border-stone-500/40 shadow-2xl">
                    <span className="relative flex h-3.5 w-3.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-stone-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-stone-300"></span>
                    </span>
                    <span className="text-xs font-black text-stone-100 uppercase tracking-widest">Active Connection</span>
                </div>
            </div>

          </div>
        </div>
      </div>

      {/* 30% MUTLAQ BO'SH QISM */}
      <div className="w-[30%] h-full bg-white"></div>

    </div>
  );
}