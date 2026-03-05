import React from 'react';

const Header = () => {
  return (
    <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100 px-8 py-3 flex items-center justify-between font-sans">
      
      {/* Logo Section */}
      <div className="flex items-center space-x-3 group cursor-pointer">
        <div className="relative">
          <div className="w-10 h-10 bg-gradient-to-tr from-[#00B5B8] to-[#00D1D4] rounded-xl flex items-center justify-center text-white shadow-lg shadow-[#00B5B8]/20 group-hover:rotate-6 transition-transform duration-300">
            <span className="text-[10px] font-black tracking-tighter">GC</span>
          </div>
          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
        </div>
        
        <div className="flex flex-col">
          <h1 className="text-[18px] font-extrabold tracking-tight text-slate-800 leading-none">
            GLOBAL<span className="text-[#00B5B8]">.</span>
          </h1>
          <p className="text-[9px] font-bold text-slate-400 tracking-[0.3em] uppercase mt-1">
            Connect
          </p>
        </div>
      </div>

      {/* Navigation (Optional - Uncomment to use) */}
      {/* <nav className="hidden lg:flex items-center space-x-1">
        {['Bosh Sahifa', 'Xizmatlar', 'Filiallar', 'Blog'].map((item, idx) => (
          <a
            key={idx}
            href="#"
            className={`px-4 py-2 text-[13px] font-semibold transition-all duration-200 rounded-lg ${
              idx === 0 ? 'text-[#00B5B8] bg-[#00B5B8]/5' : 'text-slate-600 hover:text-[#00B5B8] hover:bg-slate-50'
            }`}
          >
            {item}
          </a>
        ))}
      </nav> */}

      {/* Action Section */}
      <div className="flex items-center space-x-4">
        <div className="h-6 w-[1px] bg-slate-200 mx-2 hidden sm:block"></div>
        
        <button 
          onClick={() => console.log("Logout clicked")}
          className="group flex items-center space-x-2 bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-600 px-5 py-2.5 rounded-xl border border-slate-200 hover:border-red-100 transition-all duration-300 active:scale-95"
        >
          <span className="text-[13px] font-bold tracking-wide">Chiqish</span>
          <div className="p-1 bg-white rounded-md shadow-sm group-hover:shadow-none transition-all">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-4 w-4 group-hover:translate-x-0.5 transition-transform duration-300" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </div>
        </button>
      </div>

    </header>
  );
};

export default Header;