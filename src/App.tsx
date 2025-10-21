import React, { useState } from "react";
import Portada from "./components/Portada";

function App() {
  const [logueado, setLogueado] = useState(false);

  const handleIniciarSesion = () => {
    // Aquí luego rediriges al lobby o pantalla de login real
    setLogueado(true);
  };

  return (
    <div className="App">
      {!logueado ? (
        <Portada onIniciarSesion={handleIniciarSesion} />
      ) : (
        <div>
          {/* Aquí tu componente de login/lobby */}
          Bienvenido al juego
        </div>
      )}
    </div>
  );
}

export default App;
