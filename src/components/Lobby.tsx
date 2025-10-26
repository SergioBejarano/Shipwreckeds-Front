// src/components/Lobby.tsx
import React, { useEffect, useState } from "react";
import { useLobby } from "../utils/useLobby";
import { getMatch, startMatch } from "../utils/api";
import lobbyImg from "../assets/lobby.jpg";
import type { Match } from "../utils/api";

interface LobbyProps {
  code: string;
  currentUser: string;
  isHost: boolean;
  onStartGame?: (match: Match) => void;
}

const Lobby: React.FC<LobbyProps> = ({ code, currentUser, isHost, onStartGame }) => {
  const [match, setMatch] = useState<Match | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    let mounted = true;
    getMatch(code).then((m) => { if (mounted) setMatch(m); }).catch(console.warn);
    return () => { mounted = false; };
  }, [code]);

  useLobby(
    code,
    (payload: any) => setMatch(payload as Match),
    () => console.log("Conectado al lobby", code),
    () => console.log("Desconectado del lobby", code)
  );

  useEffect(() => {
    if (match && match.status === "STARTED") {
      onStartGame && onStartGame(match);
    }
  }, [match, onStartGame]);

  const handleStart = async () => {
    if (!match) return;
    setStarting(true);
    try {
      const updated = await startMatch(code, currentUser);
      setMatch(updated);
    } catch (e: any) {
      alert(e.message || "Error al iniciar partida");
    } finally {
      setStarting(false);
    }
  };

  if (!match) return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-800 text-white">
      Cargando lobby...
    </div>
  );

  return (
    <div
      className="fixed inset-0 bg-cover bg-center overflow-hidden"
      style={{ backgroundImage: `url(${lobbyImg})` }}
    >
      {/* capa oscurecedora para contraste */}
      <div className="absolute inset-0 bg-black bg-opacity-30 pointer-events-none" />

      {/* Contenedor centrado y con ancho limitado (no usa w-screen) */}
      <div className="relative z-10 mx-auto w-full max-w-[1400px] h-full flex items-start justify-center px-6 py-8">
        {/* Columna principal */}
        <div className="flex-1 bg-white bg-opacity-95 rounded-3xl shadow-2xl p-8 flex flex-col gap-6 overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-amber-900">Lobby — Código: {match.code}</h2>
              <p className="text-sm text-gray-700 mt-1">
                Estado: {match.status === "WAITING" ? "EN ESPERA" : match.status}
              </p>
            </div>
            <div className="px-3 py-1 bg-blue-600 text-white rounded-full font-semibold text-sm shadow-md">
              Jugadores: {match.players.length}
            </div>
          </div>

          <h3 className="text-2xl font-semibold text-amber-800">Jugadores</h3>

          {/* Lista con scroll interno controlado (no afecta al documento) */}
          <ul className="flex flex-col gap-2 overflow-y-auto max-h-[520px] pr-2 hide-scrollbar">
            {match.players.map((p) => (
              <li key={p.id} className="px-4 py-2 bg-amber-100 rounded-lg shadow-sm text-amber-900">
                {p.username}{p.username === currentUser ? " (tú)" : ""}
              </li>
            ))}
          </ul>
        </div>

        {/* Sidebar */}
        <aside className="w-72 ml-6 bg-white bg-opacity-95 rounded-3xl shadow-2xl p-6 flex flex-col gap-4">
          {isHost ? (
            <>
              <button
                className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-700 hover:scale-105 transition-transform duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleStart}
                disabled={starting || match.players.length < 5}
              >
                {starting ? "Iniciando..." : "Iniciar partida"}
              </button>

              {match.players.length < 5 && (
                <p className="text-gray-600 text-center text-sm">Se necesitan al menos 5 jugadores para iniciar</p>
              )}
            </>
          ) : (
            <p className="text-gray-600 text-center text-sm">Esperando al host para iniciar la partida...</p>
          )}
        </aside>
      </div>
    </div>
  );
};

export default Lobby;
