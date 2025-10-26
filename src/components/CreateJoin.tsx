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
  <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-b from-blue-200 via-green-100 to-amber-100 overflow-hidden px-4">
    <div className="relative z-10 w-full max-w-md bg-white bg-opacity-90 rounded-3xl shadow-2xl p-8 flex flex-col items-center box-border max-h-[90dvh] overflow-auto">
      <h2 className="text-3xl font-bold text-amber-800 mb-6 text-center drop-shadow-md">
        Bienvenido, {username}
      </h2>

      <div className="w-full mb-6">
        <button
          onClick={handleCreate}
          disabled={loadingCreate}
          className="w-full py-3 bg-amber-400 text-amber-900 font-bold rounded-xl shadow-md hover:bg-amber-500 hover:scale-105 transition-transform duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loadingCreate ? "Creando..." : "Crear partida"}
        </button>
      </div>

      <div className="w-full h-px bg-amber-300 my-4 rounded-full" />

      <form className="w-full flex flex-col items-center" onSubmit={handleJoin}>
        <input
          type="text"
          placeholder="Código de partida"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          style={{ textTransform: "uppercase" }}
          className="w-full mb-4 px-4 py-2 border border-amber-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300"
        />

        <button
          type="submit"
          disabled={joining}
          className="w-full py-3 bg-green-600 text-white font-bold rounded-xl shadow-md hover:bg-green-700 hover:scale-105 transition-transform duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {joining ? "Uniéndote..." : "Unirse a partida"}
        </button>
      </form>

      {error && <p className="mt-4 text-red-600 text-center font-semibold">{error}</p>}
    </div>
  </div>
    );
  };

export default CreateJoin;
