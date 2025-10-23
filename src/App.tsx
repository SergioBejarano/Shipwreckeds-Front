// src/App.tsx (corregido: ya no pasa onBackToMenu)
import { useState } from "react";
import Portada from "./components/Portada";
import Login from "./components/Login";
import Lobby from "./components/Lobby";
import CreateJoin from "./components/CreateJoin";
import GameCanvas from "./components/GameCanvas";

function App() {
  const [pantalla, setPantalla] = useState<"portada" | "login" | "menu" | "lobby" | "game">("portada");
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

  const handleStartGame = () => setPantalla("game");

  return (
    <div className="app-container">
      {/* Cada pantalla puede usar la clase .card para aparecer como un recuadro centrado */}
      {pantalla === "portada" && <Portada onIniciarSesion={handleIrLogin} />}
      {pantalla === "login" && <Login onLoginSuccess={handleLoginSuccess} />}
      {pantalla === "menu" && <CreateJoin username={jugador} onEnterLobby={handleEnterLobby} />}
      {pantalla === "lobby" && currentMatchCode && (
        <div className="card">
          <Lobby code={currentMatchCode} currentUser={jugador} isHost={isHost} onStartGame={handleStartGame} />
        </div>
      )}

      {pantalla === "game" && currentMatchCode && (
        <div className="card">
          <GameCanvas matchCode={currentMatchCode} currentUser={jugador} />
        </div>
      )}
    </div>
  );
}

export default App;