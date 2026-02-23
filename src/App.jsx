import { Routes, Route } from "react-router-dom";

const App = () => {
  return (
    <div>
      <Routes>
        <Route
          path="/"
          element={
            <h1 className="text-2xl font-bold text-blue-900 justify-center items-center flex h-screen">
              Tailwind ishlayapti!
            </h1>
          }
        />
      </Routes>
    </div>
  );
};

export default App;
