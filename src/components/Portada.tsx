import React from "react";
import portadaImg from "../assets/images/portada.jpg";
import { colors } from "../styles/colors"; // opcional si quieres usar paleta

interface PortadaProps {
  onIniciarSesion: () => void;
}

const Portada: React.FC<PortadaProps> = ({ onIniciarSesion }) => {
  return (
    <div
      className="w-screen h-screen relative overflow-hidden flex justify-center items-center"
      style={{
        backgroundImage: `url(${portadaImg})`,
        backgroundSize: "cover",   // escala para cubrir todo
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="absolute inset-0 bg-black bg-opacity-30"></div> 
      {/* capa oscura semitransparente para contraste del botón */}

      <button
        onClick={onIniciarSesion}
        className="relative z-10 px-10 py-4 bg-gradient-to-br from-blue-400 to-yellow-200 
                   text-white font-bold text-2xl rounded-xl shadow-lg hover:scale-105 
                   transition-transform duration-300"
      >
        Iniciar Sesión
      </button>
    </div>
  );
};

export default Portada;
