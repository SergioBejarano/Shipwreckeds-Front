import React from "react";
import portadaImg from "../assets/portada.jpg";

interface PortadaProps {
  onIniciarSesion: () => void;
  processingCode?: boolean;
  codeError?: string | null;
}

const Portada: React.FC<PortadaProps> = ({ onIniciarSesion, processingCode = false, codeError = null }) => {
  return (
    <div
      className="relative flex items-center justify-center w-screen h-[100dvh] bg-cover bg-center overflow-hidden"
      style={{ backgroundImage: `url(${portadaImg})` }}
    >
      <div className="relative z-10 text-center px-6 space-y-3">
        {codeError && <p className="text-red-200 font-semibold drop-shadow">{codeError}</p>}
        <button
          onClick={onIniciarSesion}
          disabled={processingCode}
          className="px-8 py-4 bg-[#5a8342] text-white font-bold rounded-xl shadow-md transition-transform duration-300 hover:scale-105 disabled:opacity-60 disabled:hover:scale-100"
        >
          {processingCode ? "Redirigiendo..." : "Iniciar Sesión"}
        </button>
      </div>
    </div>
  );
};

export default Portada;
