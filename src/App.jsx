import React from "react";
import { Routes, Route } from "react-router-dom";

// CSS va Pages
import "./index.css";
import LoginPage from "./loginpage/LoginPage"; // Login sahifasini import qiling
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
      {/* Birinchi bo'lib Login sahifasi chiqadi */}
      <Route path="/" element={<LoginPage />} />

      {/* Viloyatlar yo'llari */}
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