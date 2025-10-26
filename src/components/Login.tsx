import React, { useState } from "react";
import { login } from "../utils/api";
import loginImg from "../assets/login.jpg";

interface LoginProps {
  onLoginSuccess: (username: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Por favor ingresa tu nombre y contraseña");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const player = await login({ username, password });
      onLoginSuccess(player.username);
    } catch (err: any) {
      setError(err.message || "Error inesperado");
    } finally {
      setLoading(false);
    }
  };

  return (
    /* wrapper fixed ocupa EXACTAMENTE la ventana y no provoca scroll en el documento */
    <div
      className="fixed inset-0 flex items-center justify-center bg-cover bg-center overflow-hidden px-4"
      style={{ backgroundImage: `url(${loginImg})` }}
    >
      {/* capa semi-transparente */}
      <div className="absolute inset-0 bg-black bg-opacity-40 pointer-events-none"></div>

      {/* form: limita su altura y permite scroll interno si hace falta */}
      <form
        onSubmit={handleSubmit}
        className="relative z-10 bg-white bg-opacity-95 p-8 rounded-2xl shadow-lg w-full max-w-sm box-border max-h-[90dvh] overflow-auto"
      >
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Inicio de Sesión</h2>

        <input
          type="text"
          placeholder="Nombre de usuario"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full mb-4 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        {error && <p className="text-red-500 text-sm mb-2 text-center">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 px-6 py-3 bg-blue-500 text-white font-bold rounded-lg shadow-md hover:bg-blue-600 transition-transform duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Conectando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
};

export default Login;
