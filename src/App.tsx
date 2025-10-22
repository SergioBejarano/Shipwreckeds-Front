import React, { useState } from "react";
import Portada from "./components/Portada";

function App() {
  const [logueado, setLogueado] = useState(false);

  const handleIniciarSesion = () => {
    setLogueado(true);
  };

  return (
    <div>
      {!logueado ? (
        <Portada onIniciarSesion={handleIniciarSesion} />
      ) : (
        <div style={{ textAlign: "center", marginTop: "40vh", fontSize: "2rem" }}>
          Bienvenido al juego 🌊
        </div>
      )}
    </div>
  );
}

export default App;
