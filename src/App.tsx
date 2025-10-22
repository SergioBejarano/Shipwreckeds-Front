import React, { useState } from "react";
import Portada from "./components/Portada";
import Login from "./components/Login";

function App() {
  const [pantalla, setPantalla] = useState<"portada" | "login" | "juego">("portada");
  const [jugador, setJugador] = useState("");

  const handleIrLogin = () => setPantalla("login");

  const handleLoginSuccess = (username: string) => {
    setJugador(username);
    setPantalla("juego");
  };

  return (
    <>
      {pantalla === "portada" && <Portada onIniciarSesion={handleIrLogin} />}
      {pantalla === "login" && <Login onLoginSuccess={handleLoginSuccess} />}
      {pantalla === "juego" && (
        <div style={{ textAlign: "center", marginTop: "40vh", fontSize: "2rem" }}>
          Bienvenido al juego, {jugador} 🌴
        </div>
      )}
    </>
  );
}

export default App;
