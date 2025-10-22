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
    <div className="create-join-container">
      <h2 className="cj-title">Bienvenido, {username}</h2>

      <div className="cj-actions">
        <button className="button" onClick={handleCreate} disabled={loadingCreate}>
          {loadingCreate ? "Creando..." : "Crear partida"}
        </button>
      </div>

      <div className="cj-separator" />

      <form className="cj-form" onSubmit={handleJoin}>
        <input
          className="input"
          placeholder="Código de partida"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          style={{ textTransform: "uppercase" }}
        />

        <div className="cj-actions" style={{ marginTop: 12 }}>
          <button className="button" type="submit" disabled={joining}>
            {joining ? "Uniéndote..." : "Unirse a partida"}
          </button>
        </div>
      </form>

      {error && <p className="error-message">{error}</p>}
    </div>
  );
};

export default CreateJoin;