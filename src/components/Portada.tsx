import React from "react";
import portadaImg from "../assets/portada.jpg";

interface PortadaProps {
  onIniciarSesion: () => void;
}

const Portada: React.FC<PortadaProps> = ({ onIniciarSesion }) => {
  return (
    <div
      className="relative flex items-center justify-center w-screen h-[100dvh] bg-cover bg-center overflow-hidden"
      style={{ backgroundImage: `url(${portadaImg})` }}
    >
      
      <div className="relative z-10 text-center px-4">
        <button
          onClick={onIniciarSesion}
          className="px-8 py-4 bg-[#5a8342] text-white font-bold rounded-xl shadow-md transition-transform duration-300 hover:scale-105"
        >
          Iniciar Sesión
        </button>
      </div>
    </div>
  );
};

export default Portada;
