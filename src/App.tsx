// src/App.tsx (corregido: ya no pasa onBackToMenu)
import { useState } from "react";
import Portada from "./components/Portada";
import Login from "./components/Login";
import Lobby from "./components/Lobby";
import CreateJoin from "./components/CreateJoin";

function App() {
  const [pantalla, setPantalla] = useState<"portada" | "login" | "menu" | "lobby">("portada");
  const [jugador, setJugador] = useState("");
  const [currentMatchCode, setCurrentMatchCode] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);

  const handleIrLogin = () => setPantalla("login");

  const handleLoginSuccess = (username: string) => {
    setJugador(username);
    setPantalla("menu");
  };

  const handleEnterLobby = (matchCode: string, asHost: boolean) => {
    setCurrentMatchCode(matchCode);
    setIsHost(asHost);
    setPantalla("lobby");
  };

  return (
    <div className="app-container">
      {/* Cada pantalla puede usar la clase .card para aparecer como un recuadro centrado */}
      {pantalla === "portada" && <Portada onIniciarSesion={handleIrLogin} />}
      {pantalla === "login" && <Login onLoginSuccess={handleLoginSuccess} />}
      {pantalla === "menu" && <CreateJoin username={jugador} onEnterLobby={handleEnterLobby} />}
      {pantalla === "lobby" && currentMatchCode && (
        <div className="card">
          <Lobby code={currentMatchCode} currentUser={jugador} isHost={isHost} />
        </div>
      )}
    </div>
  );
}

export default App;