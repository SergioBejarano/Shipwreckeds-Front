// src/components/Lobby.tsx (versión actualizada)
import React, { useEffect, useState } from "react";
import { useLobby } from "../utils/useLobby";
import { getMatch, startMatch } from "../utils/api";
import type { Match } from "../utils/api";

interface LobbyProps {
  code: string;
  currentUser: string;
  isHost: boolean;
}

const Lobby: React.FC<LobbyProps> = ({ code, currentUser, isHost }) => {
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

  if (!match) return <div className="card">Cargando lobby...</div>;

  return (
    <div className="lobby">
      <div className="lobby-main">
        <div className="header">
          <div className="brand">
            <div className="logo" />
            <div>
                <div className="title">Lobby — Código: {match.code}</div>
                <div className="small-muted">Estado: {match.status ? (match.status === 'WAITING' ? 'EN ESPERA' : match.status) : 'EN ESPERA'}</div>
            </div>
          </div>
          <div className="status-badge">Jugadores: {match.players.length}</div>
        </div>

        <h3>Jugadores</h3>
        <ul className="players-list">
          {match.players.map((p) => (
            <li key={p.id} className="player">
              <div className="name">{p.username}{p.username === currentUser ? " (tú)" : ""}</div>
              {/* rol oculto: no mostrar "Náufrago / Infiltrado" */}
            </li>
          ))}
        </ul>
      </div>

      <aside className="lobby-aside">
        {isHost ? (
          <>
            <button className="button" onClick={handleStart} disabled={starting || (match.players.length < 5)}>
              {starting ? "Iniciando..." : "Iniciar partida"}
            </button>
            {match.players.length < 5 && <p className="small-muted">Se necesitan al menos 5 jugadores para iniciar</p>}
          </>
        ) : (
          <p className="small-muted">Esperando al host para iniciar la partida...</p>
        )}
      </aside>
    </div>
  );
};

export default Lobby;