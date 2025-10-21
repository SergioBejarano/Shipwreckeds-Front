import React from "react";
import portadaImg from "../assets/images/portada.jpg";

interface PortadaProps {
  onIniciarSesion: () => void;
}

const Portada: React.FC<PortadaProps> = ({ onIniciarSesion }) => {
  return (
    <div
      className="w-screen h-screen bg-center bg-cover flex justify-center items-center"
      style={{ backgroundImage: `url(${portadaImg})` }}
    >
      <button className="bg-blue-400 text-white px-8 py-3 rounded-lg text-xl font-bold hover:bg-blue-500 transition-all duration-200">
        Iniciar Sesión
      </button>
    </div>
  );
};

export default Portada;
