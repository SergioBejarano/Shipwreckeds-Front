import React from "react";
import { buildCognitoLoginUrl } from "../utils/api";
import loginImg from "../assets/login.jpg";

interface LoginProps {
  processingCode?: boolean;
  codeError?: string | null;
}

const Login: React.FC<LoginProps> = ({ processingCode = false, codeError = null }) => {
  const handleCognitoRedirect = () => {
    window.location.href = buildCognitoLoginUrl();
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
      <div className="relative z-10 bg-white bg-opacity-95 p-8 rounded-2xl shadow-lg w-full max-w-sm box-border max-h-[90dvh] overflow-auto text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Inicio de Sesión</h2>
        <p className="mb-6 text-gray-600">
          Para continuar serás redirigido al portal seguro de AWS Cognito.
        </p>

        {processingCode && (
          <p className="mb-4 text-blue-600 font-semibold">Confirmando tu sesión, espera un momento...</p>
        )}
        {codeError && <p className="mb-4 text-red-500 font-semibold">{codeError}</p>}

        <button
          onClick={handleCognitoRedirect}
          className="w-full px-6 py-3 bg-blue-500 text-white font-bold rounded-lg shadow-md hover:bg-blue-600 transition-transform duration-200 hover:scale-105"
        >
          Entrar con AWS Cognito
        </button>

        <p className="text-xs text-gray-500 text-center mt-5">
          Usuarios habilitados: ana, bruno, carla, diego, eva
        </p>
      </div>
    </div>
  );
};

export default Login;