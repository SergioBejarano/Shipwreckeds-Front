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
  const handleLoginSuccess = (username: string) => { setJugador(username); setPantalla("menu"); };
  const handleEnterLobby = (matchCode: string, asHost: boolean) => { setCurrentMatchCode(matchCode); setIsHost(asHost); setPantalla("lobby"); };
  const handleStartGame = () => setPantalla("game");
  const handleReturnToMenu = () => { setPantalla("menu"); setCurrentMatchCode(null); setIsHost(false); };
  const handleLogout = () => { setJugador(""); setCurrentMatchCode(null); setIsHost(false); setPantalla("login"); };

  return (
    <div className="w-screen h-[100dvh] flex items-center justify-center bg-gray-100">
      {pantalla === "portada" && <Portada onIniciarSesion={handleIrLogin} />}

      {pantalla === "login" && (
        <div className="w-full max-w-sm p-6 bg-white rounded-2xl shadow-lg">
          <Login onLoginSuccess={handleLoginSuccess} />
        </div>
      )}

      {pantalla === "menu" && (
        <div className="w-full max-w-sm p-6 bg-white rounded-2xl shadow-lg">
          <CreateJoin username={jugador} onEnterLobby={handleEnterLobby} onLogout={handleLogout} />
        </div>
      )}

      {pantalla === "lobby" && currentMatchCode && (
        <div className="w-full max-w-3xl p-6 bg-white rounded-2xl shadow-lg">
          <Lobby code={currentMatchCode} currentUser={jugador} isHost={isHost} onStartGame={handleStartGame} />
        </div>
      )}

      {pantalla === "game" && currentMatchCode && (
        <div className="w-full max-w-5xl p-4 bg-white rounded-2xl shadow-lg">
          <GameCanvas matchCode={currentMatchCode} currentUser={jugador} onExitToMenu={handleReturnToMenu} />
        </div>
      )}
    </div>
  );
}

export default App;
