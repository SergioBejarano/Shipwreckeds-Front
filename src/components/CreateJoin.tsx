// src/components/CreateJoin.tsx
import React, { useState } from "react";
import { createMatch, joinMatch } from "../utils/api";

interface CreateJoinProps {
  username: string;
  onEnterLobby: (matchCode: string, isHost: boolean) => void;
}

const CreateJoin: React.FC<CreateJoinProps> = ({ username, onEnterLobby }) => {
  const [joining, setJoining] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loadingCreate, setLoadingCreate] = useState(false);

  const handleCreate = async () => {
    setError("");
    setLoadingCreate(true);
    try {
      const res = await createMatch(username);
      onEnterLobby(res.code, true);
    } catch (e: any) {
      setError(e.message || "Error al crear la partida");
    } finally {
      setLoadingCreate(false);
    }
  };

  const handleJoin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!code) { setError("Ingresa un código"); return; }
    setJoining(true);
    setError("");
    try {
      await joinMatch(code.trim().toUpperCase(), username);
      onEnterLobby(code.trim().toUpperCase(), false);
    } catch (e: any) {
      setError(e.message || "Error al unirse a la partida");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: 40 }}>
      <h2>Bienvenido, {username}</h2>

      <div style={{ marginTop: 20 }}>
        <button onClick={handleCreate} disabled={loadingCreate}>
          {loadingCreate ? "Creando..." : "Crear partida"}
        </button>
      </div>

      <hr style={{ width: 300, margin: "20px auto" }} />

      <form onSubmit={handleJoin}>
        <div>
          <input
            placeholder="Código de partida"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            style={{ textTransform: "uppercase" }}
          />
        </div>

        <div style={{ marginTop: 10 }}>
          <button type="submit" disabled={joining}>
            {joining ? "Uniéndote..." : "Unirse a partida"}
          </button>
        </div>
      </form>

      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
};

export default CreateJoin;