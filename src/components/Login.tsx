import React, { useState } from "react";
import { login } from "../utils/api";

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
      setError("Por favor ingresa tu nombre y contraseña para continuar");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const player = await login({ username, password });
      console.log("Inicio de sesión exitoso:", player);

      onLoginSuccess(player.username);
    } catch (err: any) {
      setError(err.message || "Error inesperado al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit}>
        <h2>Inicio de Sesión</h2>

        <input
          type="text"
          placeholder="Nombre de usuario"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="error-message">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? "Conectando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
};

export default Login;
