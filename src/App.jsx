import { Routes, Route } from "react-router-dom";
import Header from "./header/Header"; 
import Footer from "./footer/Footer";

const App = () => {
  return (
    <div className="min-h-screen flex flex-col font-sans">
      <Header />
      <h1>xarita va contakt</h1>
      <Footer />
    </div>
  );
};

export default App;