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

const jizzaxTumanlari = [
    { name: "Zomin", pos: [39.9606, 68.3958] },
    { name: "G'allaorol", pos: [40.0267, 67.5856] },
    { name: "Paxtakor", pos: [40.3167, 67.9500] },
    { name: "Do'stlik", pos: [40.5250, 68.0333] },
    { name: "Forish", pos: [40.5667, 67.1167] },
    { name: "Mirzacho'l", pos: [40.7167, 68.1833] },
    { name: "Zafarobod", pos: [40.2333, 67.8500] },
    { name: "Baxmal", pos: [39.8167, 67.9000] }
];

export default function Jizzax() {
  const [geoData, setGeoData] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showDistricts, setShowDistricts] = useState(false);
  const mapRef = useRef(null);
  const jizzaxMarkerRef = useRef(null);

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/crebor-online/uzbekistan-geojson/master/uzbekistan.json')
      .then(res => res.json())
      .then(data => {
        const region = data.features.find(f => 
            f.properties.name_uz === "Jizzax" || f.properties.name === "Jizzakh"
        );
        setGeoData(region);
      });

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (jizzaxMarkerRef.current) {
      setTimeout(() => {
        jizzaxMarkerRef.current.openPopup();
      }, 1000);
    }
  }, [geoData]);

  const mapStyle = {
    fillColor: "#607D8B", 
    weight: 3,
    opacity: 1,
    color: 'white',
    dashArray: '5, 10', 
    fillOpacity: 0.1
  };

  return (
    <div className="flex h-screen font-sans overflow-hidden bg-white">
      
      {/* MONITORING PANEL - 70% */}
      <div className="w-[70%] h-full flex flex-col bg-gray-900 text-white relative shadow-[25px_0_50px_-15px_rgba(0,0,0,0.5)] z-10 border-r border-gray-800">
        
        {/* Yuqori Panel */}
        <div className="p-5 bg-gray-800/80 backdrop-blur-md border-b border-gray-700 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3">
               <h1 className="text-xl font-black text-slate-400 uppercase tracking-widest">Jizzax Monitoring</h1>
               <span className="px-2 py-0.5 bg-slate-500/20 text-slate-400 text-[10px] rounded border border-slate-500/30 font-bold">LOGISTIC-HUB</span>
            </div>
            <button 
              onClick={() => setShowDistricts(!showDistricts)}
              className={`mt-3 px-6 py-2 rounded-xl text-[11px] font-black transition-all duration-500 border-2 ${
                showDistricts 
                ? 'bg-red-500/20 border-red-500 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]' 
                : 'bg-slate-500/10 border-slate-500/50 text-slate-400 hover:bg-slate-500/20'
              }`}
            >
              {showDistricts ? "TUMANLARNI YASHIRISH" : "HUDUDLARNI ANALIZ QILISH"}
            </button>
          </div>
          <div className="text-right">
            <div className="text-2xl font-mono text-slate-400 leading-none">
              {currentTime.toLocaleTimeString('uz-UZ')}
            </div>
            <div className="text-[10px] text-gray-500 font-bold mt-1 uppercase font-mono">
               Central Transit JIZ-04
            </div>
          </div>
        </div>

        {/* XARITA KONTEYNERI */}
        <div className="flex-grow p-4 bg-gray-900">
          <div className="w-full h-full relative rounded-3xl overflow-hidden border border-gray-700/50 shadow-inner bg-gray-800">
            
            <MapContainer 
              center={[40.3, 67.8]} 
              zoom={9} 
              style={{ height: '100%', width: '100%' }}
              ref={mapRef}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

              {geoData && <GeoJSON data={geoData} style={mapStyle} />}

              {/* VILOYAT MARKAZI */}
              <Marker 
                position={[40.1158, 67.8422]} 
                icon={DefaultIcon}
                ref={jizzaxMarkerRef}
              >
                <Popup autoClose={false} closeOnClick={false}>
                  <div className="text-center p-1">
                    <b className="text-slate-700 text-sm">Jizzax shahri</b><br/>
                    <div className="h-[1px] bg-gray-200 my-1"></div>
                    <span className="text-[10px] text-gray-400 uppercase font-black">Markaziy Sektor</span>
                  </div>
                </Popup>
              </Marker>

              {showDistricts && jizzaxTumanlari.map((tuman, idx) => (
                <Marker key={idx} position={tuman.pos} icon={redIcon}>
                  <Popup>
                    <div className="text-gray-900 font-bold text-xs">{tuman.name} tumani</div>
                  </Popup>
                </Marker>
              ))}

              <ScaleControl position="bottomleft" />
            </MapContainer>

            {/* STATUS OVERLAY */}
            <div className="absolute top-4 left-4 z-[1001]">
                <div className="flex items-center gap-2 bg-gray-900/90 px-4 py-2 rounded-2xl border border-slate-500/30 shadow-2xl">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-slate-500"></span>
                    </span>
                    <span className="text-[10px] font-black text-slate-100 uppercase tracking-tighter">Status: Live</span>
                </div>
            </div>

          </div>
        </div>
      </div>

      {/* 30% MUTLAQ BO'SH QISM - RANGLAR VA DEKORATSIYALARSIZ */}
      <div className="w-[30%] h-full bg-white"></div>

    </div>
  );
}