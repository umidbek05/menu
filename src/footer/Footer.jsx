import React, { useState } from 'react';

const Footer = () => {
  const [modalContent, setModalContent] = useState(null);

  // Nusxa olish funksiyasi
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert("Nomer nusxalandi: " + text);
  };

  // Modalni yopish
  const closeModal = () => setModalContent(null);

  return (
    <footer className="bg-slate-50 border-t border-gray-200 pt-16 pb-8 px-6 font-sans relative">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">

        {/* Aloqa bo'limi */}
        <div className="space-y-6">
          <div>
            <h3 className="text-[#00B5B8] text-xs font-bold uppercase tracking-[0.2em] mb-3">Aloqa</h3>
            <h2 className="text-2xl font-black text-slate-800 uppercase leading-tight">
              Biz bilan <br /> bog'laning
            </h2>
          </div>

          <div className="space-y-4">
            <div
              onClick={() => copyToClipboard("+998905982909")}
              className="group cursor-pointer flex items-center space-x-3 p-3 bg-white rounded-xl border border-transparent hover:border-[#00B5B8] hover:shadow-md transition-all"
            >
              <div className="p-2 bg-cyan-50 text-[#00B5B8] rounded-lg group-hover:bg-[#00B5B8] group-hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold">Tel (Nusxa olish)</p>
                <p className="text-sm font-bold text-slate-700">+998 90 598 29 09</p>
              </div>
            </div>

            <a
              href="https://mail.google.com/mail/?view=cm&fs=1&to=muhiddinkamolov180@gmail.com"
              target="_blank"
              rel="noreferrer"
              className="group flex items-center space-x-3 p-3 bg-white rounded-xl border border-transparent hover:border-[#00B5B8] hover:shadow-md transition-all"
            >
              <div className="p-2 bg-cyan-50 text-[#00B5B8] rounded-lg group-hover:bg-[#00B5B8] group-hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold">Email yuborish</p>
                <p className="text-sm font-bold text-slate-700">muhiddinkamolov180@gmail.com</p>
              </div>
            </a>
            <a
              href="https://t.me/muhiddin_kamoljonov"
              target="_blank"
              rel="noreferrer"
              className="group flex items-center space-x-3 p-3 bg-white rounded-xl border border-transparent hover:border-[#00B5B8] hover:shadow-md transition-all"
            >
              <div className="p-2 bg-cyan-50 text-[#00B5B8] rounded-lg group-hover:bg-[#24A1DE] group-hover:text-white transition-colors">
                <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.14-.26.26-.53.26l.204-3.11 5.48-5.11c.24-.21-.054-.327-.376-.11l-7.1 4.47-3.01-.94c-.655-.205-.668-.655.137-.97l11.77-4.54c.545-.2.1.33.22.448z" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold">Telegram</p>
                <p className="text-sm font-bold text-slate-700">@muhiddin_kamoljonov</p>
              </div>
            </a>
          </div>
        </div>

        {/* Linklar bo'limi */}
        <div className="grid grid-cols-2 gap-8 py-4">
          <div className="space-y-4">
            <h4 className="font-bold text-slate-800 text-sm">Kompaniya</h4>
            <ul className="space-y-3 text-sm text-slate-500 font-medium">
              <li onClick={() => setModalContent({ title: "Biz haqimizda", text: "Global Connect - bu xalqaro ta'lim va biznes aloqalari markazi. Biz sizga dunyo bo'ylab eng yaxshi imkoniyatlarni topishda yordam beramiz." })} className="hover:text-[#00B5B8] cursor-pointer transition-colors">Biz haqimizda</li>
              <li onClick={() => setModalContent({ title: "Xizmatlarimiz", text: "Konsaltinq, viza ko'magi, xalqaro ta'lim va biznes hamkorlik yo'nalishlarida professional xizmat ko'rsatamiz." })} className="hover:text-[#00B5B8] cursor-pointer transition-colors">Xizmatlar</li>
              <li onClick={() => setModalContent({ title: "So'nggi Yangiliklar", text: "Yaqinda Namangan filialimizda yangi grant dasturlari e'lon qilindi. Batafsil ma'lumot uchun bizni kuzatib boring." })} className="hover:text-[#00B5B8] cursor-pointer transition-colors">Yangiliklar</li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="font-bold text-slate-800 text-sm">Yordam</h4>
            <ul className="space-y-3 text-sm text-slate-500 font-medium">
              <li
                onClick={() => setModalContent({
                  title: "Maxfiylik siyosati",
                  text: "Sizning ma'lumotlaringiz biz bilan xavfsiz. Biz foydalanuvchi ma'lumotlarini uchinchi shaxslarga bermaymiz va xalqaro GDPR qoidalariga amal qilamiz."
                })}
                className="hover:text-[#00B5B8] cursor-pointer transition-colors"
              >
                Maxfiylik siyosati
              </li>

              <li
                onClick={() => setModalContent({
                  title: "Yordam markazi",
                  text: "Texnik muammolar yoki xizmatdan foydalanishda savollaringiz bo'lsa, +998 90 598 2909 raqamiga qo'ng'iroq qiling yoki sayt operatoriga yozing."
                })}
                className="hover:text-[#00B5B8] cursor-pointer transition-colors"
              >
                Yordam
              </li>

              <li
                onClick={() => setModalContent({
                  title: "FAQ (Ko'p so'raladigan savollar)",
                  text: "1. Qanday ro'yxatdan o'tiladi? - Saytning yuqori qismidagi tugma orqali. 2. To'lov turlari qanday? - Payme, Click va naqd pul orqali."
                })}
                className="hover:text-[#00B5B8] cursor-pointer transition-colors"
              >
                FAQ
              </li>
            </ul>
          </div>
        </div>

        {/* Filial Bo'limi */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <button
            onClick={() => setModalContent({ title: "Namangan Filiali", text: "Manzil: Namangan Shaxar, Do'stlik ko'chasi, 12-uy. Mo'ljal: Markaziy kutubxona yonida. Ish vaqti: 09:00 - 18:00" })}
            className="w-full bg-[#00B5B8] hover:bg-[#009da0] text-white font-bold py-4 px-6 rounded-xl transition-all uppercase text-xs tracking-widest shadow-lg shadow-cyan-200 active:scale-95"
          >
            Namangan filiali
          </button>
          <p className="mt-4 text-[11px] text-slate-400 leading-relaxed text-center italic">
            "Namangan filiali orqali siz barcha xizmatlarimizdan bevosita foydalanishingiz mumkin."
          </p>
        </div>
      </div>

      {/* Mualliflik huquqi */}
      <div className="border-t border-slate-200 pt-8 text-center">
        <p className="text-slate-400 text-[11px] font-medium tracking-wide">
          © {new Date().getFullYear()} GLOBAL CONNECT. Barcha huquqlar himoyalangan.
        </p>
      </div>

      {/* MODAL (Ekran ortasida chiqadigan oyna) */}
      {modalContent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={closeModal}></div>
          <div className="bg-white rounded-3xl p-8 max-w-md w-full relative z-10 shadow-2xl animate-in fade-in zoom-in duration-300">
            <button onClick={closeModal} className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h3 className="text-xl font-black text-slate-800 mb-4 uppercase tracking-tight">{modalContent.title}</h3>
            <p className="text-slate-600 leading-relaxed">{modalContent.text}</p>
            <button onClick={closeModal} className="mt-6 w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition-colors">
              Tushunarli
            </button>
          </div>
        </div>
      )}
    </footer>
  );
};

export default Footer;