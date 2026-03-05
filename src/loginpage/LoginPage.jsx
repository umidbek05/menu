import React, { useState, useMemo, useRef, useEffect } from 'react';

const regionsData = [
  { name: "Andijon", code: "60", slug: "andijon" },
  { name: "Buxoro", code: "80", slug: "buxoro" },
  { name: "Farg'ona", code: "40", slug: "fargona" },
  { name: "Jizzax", code: "25", slug: "jizzax" },
  { name: "Xorazm", code: "90", slug: "xorazm" },
  { name: "Namangan", code: "50", slug: "namangan" },
  { name: "Navoiy", code: "85", slug: "navoiy" },
  { name: "Qashqadaryo", code: "70", slug: "qashqadaryo" },
  { name: "Samarqand", code: "30", slug: "samarqand" },
  { name: "Sirdaryo", code: "20", slug: "sirdaryo" },
  { name: "Surxondaryo", code: "75", slug: "surxondaryo" },
  { name: "Toshkent", code: "10", slug: "toshkent" },
  { name: "Qoraqalpog'iston", code: "95", slug: "qoraqalpogiston" },
];

function LoginPage() {
  const [regionInput, setRegionInput] = useState('');
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const dropdownRef = useRef(null);

  // Tashqariga bosilganda dropdownni yopish
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Qidiruv filtri
  const filteredRegions = useMemo(() => {
    if (!regionInput) return [];
    return regionsData.filter(r =>
      r.name.toLowerCase().includes(regionInput.toLowerCase())
    );
  }, [regionInput]);

  const handleSelect = (region) => {
    setRegionInput(region.name);
    setSelectedRegion(region);
    setShowDropdown(false);
    setError('');
  };

  const validatePassword = () => {
    if (!selectedRegion) return false;
    const requiredPassword = `${selectedRegion.slug}_admin`;
    return password.toLowerCase() === requiredPassword.toLowerCase();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validatePassword()) {
      setError("Xato! Parol noto'g'ri kiritildi.");
      return;
    }
    setError('');
    alert(`Muvaffaqiyatli kirdingiz! Hudud: ${selectedRegion.name}`);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#0f172a] overflow-hidden p-5 font-sans text-slate-200">
      
      {/* Orqa fondagi effektlar */}
      <div className="absolute top-[-80px] left-[-80px] w-80 h-80 bg-indigo-600 rounded-full blur-[120px] opacity-30 animate-pulse"></div>
      <div className="absolute bottom-[-80px] right-[-80px] w-80 h-80 bg-emerald-500 rounded-full blur-[120px] opacity-30 animate-pulse delay-1000"></div>

      <div className="relative z-10 w-full max-w-[420px] bg-white/5 backdrop-blur-2xl rounded-[32px] p-8 border border-white/10 shadow-2xl">
        
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-indigo-500 to-emerald-500 flex items-center justify-center font-bold text-2xl text-white shadow-xl shadow-indigo-500/30">
            SOS
          </div>
          <h2 className="text-white text-3xl font-bold mb-2 tracking-tight">Tizimga kirish</h2>
          <p className="text-slate-400 text-sm">Viloyatni tanlang va parolni kiriting</p>
        </div>

        <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
          
          {/* Hudud tanlash qismi */}
          <div className="relative" ref={dropdownRef}>
            <label className="block text-slate-400 text-xs font-bold mb-2 ml-1 uppercase tracking-widest">Hududni tanlang</label>
            <input
              type="text"
              className="w-full px-5 py-4 rounded-2xl border border-white/10 bg-slate-900/40 text-white text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-slate-600"
              value={regionInput}
              onChange={(e) => {
                setRegionInput(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Hudud nomini yozing..."
            />

            {showDropdown && filteredRegions.length > 0 && (
              <ul className="absolute w-full max-h-60 overflow-y-auto bg-slate-900 border border-white/10 rounded-2xl mt-2 z-50 shadow-2xl">
                {filteredRegions.map((region) => (
                  <li 
                    key={region.code} 
                    onClick={() => handleSelect(region)}
                    className="flex justify-between items-center px-5 py-3.5 text-slate-300 cursor-pointer hover:bg-indigo-500/20 hover:text-white transition-all border-b border-white/5 last:border-none"
                  >
                    <span className="font-medium">{region.name}</span>
                    <span className="text-[10px] bg-white/10 px-2.5 py-1 rounded-lg text-indigo-300">ID: {region.code}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Viloyat kodi (Read-only) */}
          <div>
            <label className="block text-slate-400 text-xs font-bold mb-2 ml-1 uppercase tracking-widest">Viloyat kodi</label>
            <input
              type="text"
              className="w-full px-5 py-4 rounded-2xl border border-white/10 bg-slate-900/60 text-indigo-400 font-mono text-lg outline-none cursor-not-allowed"
              value={selectedRegion ? selectedRegion.code : "--"}
              readOnly
            />
          </div>

          {/* Parol kiritish qismi (O'zgartirilgan placeholder) */}
          <div>
            <label className="block text-slate-400 text-xs font-bold mb-2 ml-1 uppercase tracking-widest">Maxsus parol</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className={`w-full px-5 py-4 rounded-2xl border bg-slate-900/40 text-white text-sm outline-none transition-all focus:ring-2 focus:ring-indigo-500/20 placeholder:text-slate-600 ${error ? 'border-red-500/50' : 'border-white/10'}`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Parolni kiriting" 
              />
              <button
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-indigo-400 transition-colors text-xl"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "×" : "●"}
              </button>
            </div>
            {error && <p className="mt-2 ml-1 text-red-400 text-xs font-medium animate-pulse">{error}</p>}
          </div>

          {/* Kirish tugmasi */}
          <button
            type="submit"
            className="mt-2 py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all disabled:opacity-40 disabled:grayscale disabled:cursor-not-allowed"
            disabled={!selectedRegion || !password}
          >
            TIZIMGA KIRISH
          </button>

        </form>
      </div>
    </div>
  );
}

export default LoginPage;