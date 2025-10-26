import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Importar WindiCSS
import "virtual:windi.css";

// Tus estilos globales opcionales (solo los que quieras conservar)

import './styles/reset.css';
import './styles/layout.css';
import './styles/form.css';
import './styles/lobby.css';

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
