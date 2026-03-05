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

const sirdaryoTumanlari = [
    { name: "Sirdaryo", pos: [40.8500, 68.6667] },
    { name: "Boyovut", pos: [40.4167, 69.0333] },
    { name: "Sayhunobod", pos: [40.6167, 68.9167] },
    { name: "Oqoltin", pos: [40.4667, 68.1833] },
    { name: "Sardoba", pos: [40.2333, 68.1667] },
    { name: "Xovos", pos: [40.2000, 68.6667] },
    { name: "Shirin", pos: [40.2167, 69.1333] },
    { name: "Yangiyer", pos: [40.2667, 68.8333] },
    { name: "Mirzaobod", pos: [40.4833, 68.5833] }
];

export default function Sirdaryo() {
  const [geoData, setGeoData] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showDistricts, setShowDistricts] = useState(false);
  const mapRef = useRef(null);

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/crebor-online/uzbekistan-geojson/master/uzbekistan.json')
      .then(res => res.json())
      .then(data => {
        const region = data.features.find(f => 
            f.properties.name_uz === "Sirdaryo" || f.properties.name === "Sirdaryo"
        );
        setGeoData(region);
      });

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => { mapRef.current.invalidateSize(); }, 400);
    }
  }, [geoData]);

  const mapStyle = {
    fillColor: "#3F51B5",
    weight: 4,
    opacity: 1,
    color: 'white',
    dashArray: '5, 10', 
    fillOpacity: 0.15
  };

  return (
    <div className="flex h-screen font-sans overflow-hidden">
      
      {/* MONITORING PANEL - EKRANNING 70% QISMI */}
      <div className="w-[70%] h-full flex flex-col bg-gray-900 text-white relative shadow-2xl z-10 border-r border-gray-800">
        
        {/* Yuqori Panel */}
        <div className="p-5 bg-gray-800/50 backdrop-blur-md border-b border-gray-700 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3">
               <h1 className="text-xl font-black text-indigo-400 uppercase tracking-widest">Sirdaryo Monitoring</h1>
               <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 text-[10px] rounded border border-indigo-500/30 font-bold">PRO-SYSTEM</span>
            </div>
            <button 
              onClick={() => setShowDistricts(!showDistricts)}
              className={`mt-3 px-6 py-2 rounded-xl text-[11px] font-black transition-all duration-500 border-2 ${
                showDistricts 
                ? 'bg-red-500/20 border-red-500 text-red-500 shadow-[0_0_25px_rgba(239,68,68,0.4)]' 
                : 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400 hover:bg-indigo-500/20'
              }`}
            >
              {showDistricts ? "TUMANLARNI YASHIRISH" : "BARCHA TUMANLARNI AKTIVLASHTIRISH"}
            </button>
          </div>
          <div className="text-right">
            <div className="text-2xl font-mono text-indigo-400 leading-none">
              {currentTime.toLocaleTimeString('uz-UZ')}
            </div>
            <div className="text-[10px] text-gray-500 font-bold mt-1 tracking-tighter uppercase">
              Data Terminal S-01
            </div>
          </div>
        </div>

        {/* XARITA KONTEYNERI */}
        <div className="flex-grow p-4 bg-gray-900">
          <div className="w-full h-full relative rounded-3xl overflow-hidden border border-gray-700 shadow-lg bg-gray-800">
            
            {/* STATUS BELGISI */}
            <div className="absolute top-4 left-4 z-[1001]">
              <div className="flex items-center gap-2 bg-gray-900/95 px-4 py-2 rounded-2xl border border-indigo-500/40 shadow-2xl">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                  </span>
                  <span className="text-[10px] font-black text-indigo-100 uppercase tracking-tighter">System Online</span>
              </div>
            </div>

            <MapContainer 
              center={[40.5, 68.6]} 
              zoom={10} 
              style={{ height: '100%', width: '100%' }}
              ref={mapRef}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

              {geoData && <GeoJSON data={geoData} style={mapStyle} />}

              <Marker position={[40.4897, 68.7848]} icon={DefaultIcon}>
                <Popup>
                  <div className="text-center">
                    <b className="text-indigo-600">Guliston shahri</b><br/>
                    <span className="text-[10px] text-gray-400 uppercase">Markaz</span>
                  </div>
                </Popup>
              </Marker>

              {showDistricts && sirdaryoTumanlari.map((tuman, idx) => (
                <Marker key={idx} position={tuman.pos} icon={redIcon}>
                  <Popup>
                    <div className="text-gray-900 font-bold">{tuman.name}</div>
                  </Popup>
                </Marker>
              ))}

              <ScaleControl position="bottomleft" />
            </MapContainer>

          </div>
        </div>
      </div>

      {/* 30% MUTLAQ BO'SH QISM */}
      <div className="w-[30%] h-full bg-transparent"></div>

    </div>
  );
}