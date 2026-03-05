import React, { useState } from 'react';

const Namangan = () => {
  const districts = [
    { id: 1, name: "Namangan shahri", phone: "+998 69 227 00 00", address: "Bobur shoh ko'chasi, 15-uy", query: "Namangan+City" },
    { id: 2, name: "Mingbuloq tumani", phone: "+998 69 622 11 22", address: "Jumasho'y shaharchasi, Markaziy ko'cha", query: "Mingbulak+District+Namangan" },
    { id: 3, name: "Kosonsoy tumani", phone: "+998 69 632 88 99", address: "Kosonsoy sh., Tinchlik ko'chasi", query: "Kasansay+District+Namangan" },
    { id: 4, name: "Namangan tumani", phone: "+998 69 532 10 10", address: "Toshbuloq shaharchasi, A.Navoiy ko'chasi", query: "Tashbulak+Namangan" },
    { id: 5, name: "Norin tumani", phone: "+998 69 612 11 22", address: "Haqqulobod sh., Mustaqillik ko'chasi", query: "Naryn+District+Namangan" },
    { id: 6, name: "Pop tumani", phone: "+998 69 331 55 66", address: "Pop sh., Islom Karimov ko'chasi", query: "Pap+District+Namangan" },
    { id: 7, name: "To'raqo'rg'on tumani", phone: "+998 69 412 20 30", address: "To'raqo'rg'on sh., Ibrat ko'chasi", query: "Turakurgan+District+Namangan" },
    { id: 8, name: "Uychi tumani", phone: "+998 69 482 10 20", address: "Uychi shaharchasi, Markaziy ko'cha", query: "Uychi+District+Namangan" },
    { id: 9, name: "Uchqo'rg'on tumani", phone: "+998 69 462 30 40", address: "Uchqo'rg'on sh., Do'stlik ko'chasi", query: "Uchkorgan+District+Namangan" },
    { id: 10, name: "Chortoq tumani", phone: "+998 69 412 55 44", address: "Chortoq sh., Alisher Navoiy ko'chasi", query: "Chartak+District+Namangan" },
    { id: 11, name: "Chust tumani", phone: "+998 69 442 12 34", address: "Chust sh., Mustaqillik ko'chasi", query: "Chust+District+Namangan" },
    { id: 12, name: "Yangiqo'rg'on tumani", phone: "+998 69 632 44 55", address: "Yangiqo'rg'on shaharchasi, Navoiy ko'chasi", query: "Yangikurgan+District+Namangan" },
  ];

  const [selectedDistrict, setSelectedDistrict] = useState(districts[0]);

  // Xarita havolasi. output=embed xaritani interaktiv qiladi
  const mapUrl = `https://maps.google.com/maps?q=${selectedDistrict.query}&t=&z=13&ie=UTF8&iwloc=&output=embed`;

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-73px)] bg-white overflow-hidden font-sans text-gray-900">
      
      {/* LEFT SIDE: Xarita */}
      <div className="w-full md:w-2/3 relative h-[400px] md:h-full bg-gray-100">
        <iframe
          key={selectedDistrict.id} // Muhim: Bu tuman o'zgarganda xaritani yangilaydi
          src={mapUrl}
          className="w-full h-full border-0"
          allowFullScreen=""
          loading="lazy"
          title="Namangan Regional Map"
        ></iframe>
        
        {/* Info Box */}
        <div className="absolute top-4 left-4 right-4 md:right-auto z-10 pointer-events-none">
          <div className="bg-white/95 backdrop-blur-sm p-5 rounded-2xl shadow-2xl border-l-[10px] border-[#00B5B8] max-w-sm">
            <p className="text-[11px] font-black text-[#00B5B8] uppercase tracking-[0.2em] mb-1">Hududiy Filial</p>
            <h3 className="text-xl font-black uppercase leading-tight text-gray-800">{selectedDistrict.name}</h3>
            <div className="mt-3 flex items-center text-[10px] text-gray-500 font-bold bg-gray-50 p-2 rounded-lg">
                <span className="mr-2">🔍</span> 
                Xarita ichida qidirish va masshtabni o'zgartirish mumkin
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Tumanlar ro'yxati */}
      <div className="w-full md:w-1/3 flex flex-col bg-white border-l border-gray-100 shadow-2xl z-20">
        
        <div className="p-8 pb-4 bg-gradient-to-b from-gray-50 to-white">
          <div className="flex items-center mb-2">
            <div className="w-2 h-2 bg-[#00B5B8] rounded-full mr-2"></div>
            <p className="text-[#00B5B8] text-[11px] font-black uppercase tracking-[0.3em]">Viloyat bo'limlari</p>
          </div>
          <h2 className="text-4xl font-black tracking-tighter uppercase text-gray-900">Namangan</h2>
          <p className="text-xl font-bold text-gray-300 uppercase tracking-widest -mt-1">Filiallari</p>
        </div>

        {/* Tumanlar listi */}
        <div className="flex-grow overflow-y-auto px-6 py-4 space-y-2 custom-scrollbar scroll-smooth">
          {districts.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedDistrict(item)}
              className={`w-full text-left px-5 py-4 rounded-2xl font-bold text-[11px] uppercase tracking-wider transition-all duration-300 border-2 flex justify-between items-center group ${
                selectedDistrict.id === item.id
                  ? "bg-[#00B5B8] border-[#00B5B8] text-white shadow-lg shadow-cyan-100 translate-x-1"
                  : "bg-white border-gray-50 text-gray-400 hover:border-[#00B5B8]/40 hover:text-[#00B5B8]"
              }`}
            >
              <span>{item.name}</span>
              <div className={`p-1 rounded-full transition-colors ${selectedDistrict.id === item.id ? "bg-white/20" : "bg-gray-50 group-hover:bg-[#00B5B8]/10"}`}>
                <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className={`h-4 w-4 transition-transform duration-300 ${selectedDistrict.id === item.id ? "rotate-90" : "group-hover:translate-x-1"}`} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>

        {/* Kontakt Footer */}
        <div className="p-8 bg-[#0a192f] text-white rounded-t-[40px] shadow-2xl border-t border-white/5">
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-white/5 backdrop-blur-sm flex items-center justify-center border border-white/10 text-xl shadow-lg">
                📞
              </div>
              <div>
                <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-[0.2em] mb-1">Aloqa markazi</p>
                <p className="text-lg font-black tracking-tight font-mono">{selectedDistrict.phone}</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-white/5 backdrop-blur-sm flex items-center justify-center border border-white/10 text-xl shadow-lg">
                📍
              </div>
              <div>
                <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-[0.2em] mb-1">Hududiy manzil</p>
                <p className="text-[12px] font-medium text-gray-300 leading-snug">{selectedDistrict.address}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Namangan;