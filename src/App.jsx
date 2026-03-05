import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// CSS importi
import "./index.css";
// Viloyatlar importi
import Andijon from "./pages/Andijon";
import Buxoro from "./pages/Buxoro";
import Fargona from "./pages/Fargona";
import Jizzax from "./pages/Jizzax";
import Xorazm from "./pages/Xorazm";
import Namangan from "./pages/Namangan";
import Navoiy from "./pages/Navoiy";
import Qashqadaryo from "./pages/Qashqadaryo";
import Samarqand from "./pages/Samarqand";
import Sirdaryo from "./pages/Sirdaryo";
import Surxondaryo from "./pages/Surxondaryo";
import Toshkent from "./pages/Toshkent";

const App = () => {
  return (
    <Routes>
      {/* Asosiy sahifaga kirganda avtomatik Toshkentga yo'naltirish */}
      <Route path="/" element={<Navigate to="/toshkent" />} />

      {/* Viloyatlar yo'llari (Routes) */}
      <Route path="/andijon" element={<Andijon />} />
      <Route path="/buxoro" element={<Buxoro />} />
      <Route path="/fargona" element={<Fargona />} />
      <Route path="/jizzax" element={<Jizzax />} />
      <Route path="/xorazm" element={<Xorazm />} />
      <Route path="/namangan" element={<Namangan />} />
      <Route path="/navoiy" element={<Navoiy />} />
      <Route path="/qashqadaryo" element={<Qashqadaryo />} />
      <Route path="/samarqand" element={<Samarqand />} />
      <Route path="/sirdaryo" element={<Sirdaryo />} />
      <Route path="/surxondaryo" element={<Surxondaryo />} />
      <Route path="/toshkent" element={<Toshkent />} />
    </Routes>
  );
};

export default App;