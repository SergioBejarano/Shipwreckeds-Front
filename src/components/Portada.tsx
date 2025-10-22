import React from "react";
import portadaImg from "../assets/portada.jpg";

interface PortadaProps {
  onIniciarSesion: () => void;
}

const Portada: React.FC<PortadaProps> = ({ onIniciarSesion }) => {
  return (
    <div className="portada-container">
      <button className="boton-iniciar" onClick={onIniciarSesion}>
        Iniciar Sesión
      </button>
    </div>
  );
};

export default Portada;
