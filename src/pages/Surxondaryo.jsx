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

const surxonTumanlari = [
    { name: "Denov", pos: [38.2667, 67.8944] },
    { name: "Sherobod", pos: [37.6667, 67.0125] },
    { name: "Jarqo'rg'on", pos: [37.5000, 67.4167] },
    { name: "Sho'rchi", pos: [38.0000, 67.7833] },
    { name: "Sariosiyo", pos: [38.4000, 67.9333] },
    { name: "Boysun", pos: [38.2000, 67.2000] },
    { name: "Qumqo'rg'on", pos: [37.7667, 67.5833] },
    { name: "Muzrabot", pos: [37.3500, 66.9000] }
];

export default function Surxondaryo() {
  const [geoData, setGeoData] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showDistricts, setShowDistricts] = useState(false);
  const mapRef = useRef(null);
  const termizMarkerRef = useRef(null); // Termiz uchun maxsus ref

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/crebor-online/uzbekistan-geojson/master/uzbekistan.json')
      .then(res => res.json())
      .then(data => {
        const surxonRegion = data.features.find(f => 
            f.properties.name_uz === "Surxondaryo" || f.properties.name === "Surkhandarya"
        );
        setGeoData(surxonRegion);
      });

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Xarita yuklanganda Termiz Popupini avtomatik ochish
  useEffect(() => {
    if (termizMarkerRef.current) {
      setTimeout(() => {
        termizMarkerRef.current.openPopup();
      }, 1000); // Xarita to'liq yuklanishi uchun biroz kutish
    }
  }, [geoData]);

  const mapStyle = {
    fillColor: "#8BC34A",
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
               <h1 className="text-xl font-black text-lime-400 uppercase tracking-widest">Surxon Monitoring</h1>
               <span className="px-2 py-0.5 bg-lime-500/20 text-lime-400 text-[10px] rounded border border-lime-500/30 font-bold">PRO-SYSTEM</span>
            </div>
            <button 
              onClick={() => setShowDistricts(!showDistricts)}
              className={`mt-3 px-6 py-2 rounded-xl text-[11px] font-black transition-all duration-500 border-2 ${
                showDistricts 
                ? 'bg-red-500/20 border-red-500 text-red-500 shadow-[0_0_25px_rgba(239,68,68,0.4)]' 
                : 'bg-lime-500/10 border-lime-500/50 text-lime-400 hover:bg-lime-500/20'
              }`}
            >
              {showDistricts ? "TUMANLARNI YASHIRISH" : "BARCHA TUMANLARNI AKTIVLASHTIRISH"}
            </button>
          </div>
          <div className="text-right">
            <div className="text-2xl font-mono text-lime-400 leading-none">
              {currentTime.toLocaleTimeString('uz-UZ')}
            </div>
            <div className="text-[10px] text-gray-500 font-bold mt-1 tracking-tighter uppercase font-mono">
               South Terminal SUR-07
            </div>
          </div>
        </div>

        {/* XARITA KONTEYNERI */}
        <div className="flex-grow p-4 bg-gray-900">
          <div className="w-full h-full relative rounded-3xl overflow-hidden border border-gray-700 shadow-lg bg-gray-800">
            
            <MapContainer 
              center={[37.9, 67.5]} // Markaz janubga surildi (Termiz yaxshi ko'rinishi uchun)
              zoom={8.5} 
              style={{ height: '100%', width: '100%' }}
              ref={mapRef}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

              {geoData && <GeoJSON data={geoData} style={mapStyle} />}

              {/* VILOYAT MARKAZI - TERMIZ (REF QO'SHILDI) */}
              <Marker 
                position={[37.2242, 67.2783]} 
                icon={DefaultIcon}
                ref={termizMarkerRef} 
              >
                <Popup autoClose={false} closeOnClick={false}>
                  <div className="text-center">
                    <b className="text-blue-600 text-sm">Termiz shahri</b><br/>
                    <div className="h-[1px] bg-gray-200 my-1"></div>
                    <span className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">Ma'muriy Markaz</span>
                  </div>
                </Popup>
              </Marker>

              {showDistricts && surxonTumanlari.map((tuman, idx) => (
                <Marker key={idx} position={tuman.pos} icon={redIcon}>
                  <Popup>
                    <div className="text-gray-900 font-bold">{tuman.name} tumani</div>
                  </Popup>
                </Marker>
              ))}

              <ScaleControl position="bottomleft" />
            </MapContainer>

            {/* STATUS OVERLAY */}
            <div className="absolute top-4 left-4 z-[1001]">
                <div className="flex items-center gap-2 bg-gray-900/95 px-4 py-2 rounded-2xl border border-lime-500/40 shadow-2xl font-mono">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-lime-500"></span>
                    </span>
                    <span className="text-[10px] font-black text-lime-100 uppercase tracking-tighter">OS Live: Stable</span>
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