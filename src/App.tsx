import { useEffect, useRef, useState } from "react";
import Portada from "./components/Portada";
import Lobby from "./components/Lobby";
import CreateJoin from "./components/CreateJoin";
import GameCanvas from "./components/GameCanvas";
import { buildCognitoLoginUrl, clearSessionTokens, getRedirectUri, loginWithCode, type LoginResponse } from "./utils/api";

function App() {
  const [pantalla, setPantalla] = useState<"portada" | "menu" | "lobby" | "game">("portada");
  const [jugador, setJugador] = useState("");
  const [currentMatchCode, setCurrentMatchCode] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [processingCode, setProcessingCode] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const codeHandledRef = useRef(false);

  const handleIrLogin = () => {
    if (typeof window === "undefined") return;
    window.location.href = buildCognitoLoginUrl();
  };
  const handleLoginSuccess = (loginSession: LoginResponse) => {
    setJugador(loginSession.player.username);
    setPantalla("menu");
  };
  const handleEnterLobby = (matchCode: string, asHost: boolean) => { setCurrentMatchCode(matchCode); setIsHost(asHost); setPantalla("lobby"); };
  const handleStartGame = () => setPantalla("game");
  const handleReturnToMenu = () => { setPantalla("menu"); setCurrentMatchCode(null); setIsHost(false); };
  const handleLogout = () => {
    clearSessionTokens();
    setJugador("");
    setCurrentMatchCode(null);
    setIsHost(false);
    setPantalla("portada");
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (codeHandledRef.current) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (!code) {
      return;
    }

    codeHandledRef.current = true;

    setProcessingCode(true);
    setCodeError(null);

    loginWithCode(code, getRedirectUri())
      .then((session) => {
        handleLoginSuccess(session);
      })
      .catch((err: any) => {
        setCodeError(err?.message || "No fue posible completar el inicio de sesión.");
      })
      .finally(() => {
        setProcessingCode(false);
        params.delete("code");
        const rest = params.toString();
        const newUrl = `${window.location.pathname}${rest ? `?${rest}` : ""}`;
        window.history.replaceState({}, document.title, newUrl);
      });
  }, []);

  return (
    <div className="w-screen h-[100dvh] flex items-center justify-center bg-gray-100">
      {pantalla === "portada" && (
        <Portada onIniciarSesion={handleIrLogin} processingCode={processingCode} codeError={codeError} />
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