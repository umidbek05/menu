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

// Qashqadaryo tumanlari
const qashqadaryoTumanlari = [
    { name: "Shahrisabz", pos: [39.0583, 66.8333] },
    { name: "Kitob", pos: [39.1167, 66.8833] },
    { name: "Koson", pos: [39.0333, 65.4500] },
    { name: "Muborak", pos: [39.2556, 65.1528] },
    { name: "G'uzor", pos: [38.6214, 66.2481] },
    { name: "Chiroqchi", pos: [39.0333, 66.5667] },
    { name: "Dehqonobod", pos: [38.3500, 66.4500] },
    { name: "Yakkabog'", pos: [38.9833, 66.6833] },
    { name: "Kamashi", pos: [38.7972, 66.4583] }
];

export default function Qashqadaryo() {
  const [geoData, setGeoData] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showDistricts, setShowDistricts] = useState(false);
  const mapRef = useRef(null);
  const qarshiMarkerRef = useRef(null); // Qarshi uchun ref

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/crebor-online/uzbekistan-geojson/master/uzbekistan.json')
      .then(res => res.json())
      .then(data => {
        const qashqadaryoRegion = data.features.find(f => 
            f.properties.name_uz === "Qashqadaryo" || f.properties.name === "Kashkadarya"
        );
        setGeoData(qashqadaryoRegion);
      });

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Qarshi shahri Popupini avtomatik ochish
  useEffect(() => {
    if (qarshiMarkerRef.current) {
      setTimeout(() => {
        qarshiMarkerRef.current.openPopup();
      }, 1000);
    }
  }, [geoData]);

  const mapStyle = {
    fillColor: "#E91E63",
    weight: 4,
    opacity: 1,
    color: 'white',
    dashArray: '5, 10', 
    fillOpacity: 0.15
  };

  return (
    <div className="flex h-screen font-sans overflow-hidden">
      
      {/* MONITORING PANEL - 70% */}
      <div className="w-[70%] h-full flex flex-col bg-gray-900 text-white relative shadow-2xl z-10 border-r border-gray-800">
        
        {/* Yuqori Panel */}
        <div className="p-5 bg-gray-800/50 backdrop-blur-md border-b border-gray-700 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3">
               <h1 className="text-xl font-black text-pink-400 uppercase tracking-widest">Qashqadaryo Monitoring</h1>
               <span className="px-2 py-0.5 bg-pink-500/20 text-pink-400 text-[10px] rounded border border-pink-500/30 font-bold">PRO-SYSTEM</span>
            </div>
            <button 
              onClick={() => setShowDistricts(!showDistricts)}
              className={`mt-3 px-6 py-2 rounded-xl text-[11px] font-black transition-all duration-500 border-2 ${
                showDistricts 
                ? 'bg-red-500/20 border-red-500 text-red-500 shadow-[0_0_25px_rgba(239,68,68,0.4)]' 
                : 'bg-pink-500/10 border-pink-500/50 text-pink-400 hover:bg-pink-500/20'
              }`}
            >
              {showDistricts ? "TUMANLARNI YASHIRISH" : "BARCHA TUMANLARNI AKTIVLASHTIRISH"}
            </button>
          </div>
          <div className="text-right">
            <div className="text-2xl font-mono text-pink-400 leading-none">
              {currentTime.toLocaleTimeString('uz-UZ')}
            </div>
            <div className="text-[10px] text-gray-500 font-bold mt-1 tracking-tighter uppercase font-mono">
               South Terminal QAS-10
            </div>
          </div>
        </div>

        {/* XARITA KONTEYNERI */}
        <div className="flex-grow p-4 bg-gray-900">
          <div className="w-full h-full relative rounded-3xl overflow-hidden border border-gray-700 shadow-lg bg-gray-800">
            
            <MapContainer 
              center={[38.8, 66.2]} 
              zoom={8.5} 
              style={{ height: '100%', width: '100%' }}
              ref={mapRef}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

              {geoData && <GeoJSON data={geoData} style={mapStyle} />}

              {/* VILOYAT MARKAZI - QARSHI SHAHRI */}
              <Marker 
                position={[38.8612, 65.7847]} 
                icon={DefaultIcon}
                ref={qarshiMarkerRef}
              >
                <Popup autoClose={false} closeOnClick={false}>
                  <div className="text-center">
                    <b className="text-pink-600 text-sm">Qarshi shahri</b><br/>
                    <div className="h-[1px] bg-gray-200 my-1"></div>
                    <span className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">Viloyat Markazi</span>
                  </div>
                </Popup>
              </Marker>

              {/* TUMANLAR */}
              {showDistricts && qashqadaryoTumanlari.map((tuman, idx) => (
                <Marker key={idx} position={tuman.pos} icon={redIcon}>
                  <Popup>
                    <div className="text-gray-900 font-bold">{tuman.name}</div>
                  </Popup>
                </Marker>
              ))}

              <ScaleControl position="bottomleft" />
            </MapContainer>

            {/* STATUS OVERLAY */}
            <div className="absolute top-4 left-4 z-[1001]">
                <div className="flex items-center gap-2 bg-gray-900/95 px-4 py-2 rounded-2xl border border-pink-500/40 shadow-2xl font-mono">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-pink-500"></span>
                    </span>
                    <span className="text-[10px] font-black text-pink-100 uppercase tracking-tighter">OS Live: Stable</span>
                </div>
            </div>

          </div>
        </div>
      </div>

      {/* 30% MUTLAQ BO'SH QISM */}
      <div className="w-[30%] h-full bg-transparent"></div>

    </div>
  );
}