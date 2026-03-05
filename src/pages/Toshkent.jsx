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

const tumanlar = [
    { name: "Chirchiq", pos: [41.4689, 69.5822] },
    { name: "Angren", pos: [41.0167, 70.1433] },
    { name: "Olmaliq", pos: [40.8453, 69.5917] },
    { name: "Bekobod", pos: [40.2117, 69.2556] },
    { name: "Yangiyo'l", pos: [41.1147, 69.0494] },
    { name: "G'azalkent", pos: [41.5583, 69.7694] },
    { name: "Parkent", pos: [41.2944, 69.6764] },
    { name: "Chinoz", pos: [40.9414, 68.7558] }
];

export default function Toshkent() {
  const [geoData, setGeoData] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showMarkers, setShowMarkers] = useState(false);
  const mapRef = useRef(null);
  const nurafshonMarkerRef = useRef(null); // Markaz uchun ref

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/crebor-online/uzbekistan-geojson/master/uzbekistan.json')
      .then(res => res.json())
      .then(data => {
        const toshkentRegion = data.features.find(f => 
            f.properties.name_uz === "Toshkent" || f.properties.name === "Toshkent"
        );
        setGeoData(toshkentRegion);
      });

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Nurafshon Popupini avtomatik ochish
  useEffect(() => {
    if (nurafshonMarkerRef.current) {
      setTimeout(() => {
        nurafshonMarkerRef.current.openPopup();
      }, 1000);
    }
  }, [geoData]);

  const mapStyle = {
    fillColor: "#3b82f6",
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
               <h1 className="text-xl font-black text-blue-400 uppercase tracking-widest">Toshkent Monitoring</h1>
               <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] rounded border border-blue-500/30 font-bold">PRO-SYSTEM</span>
            </div>
            <button 
              onClick={() => setShowMarkers(!showMarkers)}
              className={`mt-3 px-6 py-2 rounded-xl text-[11px] font-black transition-all duration-500 border-2 ${
                showMarkers 
                ? 'bg-red-500/20 border-red-500 text-red-500 shadow-[0_0_25px_rgba(239,68,68,0.4)]' 
                : 'bg-blue-500/10 border-blue-500/50 text-blue-400 hover:bg-blue-500/20'
              }`}
            >
              {showMarkers ? "TUMANLARNI YASHIRISH" : "BARCHA TUMANLARNI AKTIVLASHTIRISH"}
            </button>
          </div>
          <div className="text-right">
            <div className="text-2xl font-mono text-blue-400 leading-none">
              {currentTime.toLocaleTimeString('uz-UZ')}
            </div>
            <div className="text-[10px] text-gray-500 font-bold mt-1 tracking-tighter uppercase font-mono">
               Central Terminal TAS-01
            </div>
          </div>
        </div>

        {/* XARITA KONTEYNERI */}
        <div className="flex-grow p-4 bg-gray-900">
          <div className="w-full h-full relative rounded-3xl overflow-hidden border border-gray-700 shadow-lg bg-gray-800">
            
            <MapContainer 
              center={[41.15, 69.8]} // Toshkent viloyati uchun optimal markaz
              zoom={8.5} 
              style={{ height: '100%', width: '100%' }}
              ref={mapRef}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

              {geoData && <GeoJSON data={geoData} style={mapStyle} />}

              {/* VILOYAT MARKAZI - NURAFSHON */}
              <Marker 
                position={[41.0422, 69.3556]} 
                icon={DefaultIcon}
                ref={nurafshonMarkerRef}
              >
                <Popup autoClose={false} closeOnClick={false}>
                  <div className="text-center">
                    <b className="text-blue-600 text-sm">Nurafshon shahri</b><br/>
                    <div className="h-[1px] bg-gray-200 my-1"></div>
                    <span className="text-[10px] text-gray-400 uppercase font-bold">Ma'muriy Markaz</span>
                  </div>
                </Popup>
              </Marker>

              {showMarkers && tumanlar.map((tuman, idx) => (
                <Marker key={idx} position={tuman.pos} icon={redIcon}>
                  <Popup>
                    <div className="text-gray-900 font-bold">{tuman.name} shahri</div>
                  </Popup>
                </Marker>
              ))}

              <ScaleControl position="bottomleft" />
            </MapContainer>

            {/* STATUS OVERLAY */}
            <div className="absolute top-4 left-4 z-[1001]">
                <div className="flex items-center gap-2 bg-gray-900/95 px-4 py-2 rounded-2xl border border-blue-500/40 shadow-2xl font-mono">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                    </span>
                    <span className="text-[10px] font-black text-blue-100 uppercase tracking-tighter">OS Live: Stable</span>
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