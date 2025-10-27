import { useEffect, useState } from 'react';
import type { Avatar } from '../../utils/GameCanvas/types';

interface Props {
  options: Avatar[];
  hasVoted: boolean;
  onVote: (id: number) => Promise<void>;
  onClose: () => void; // se mantiene por compatibilidad pero no se muestra opción de cerrar
  getDisplayName: (a: Avatar) => string;
  isInfiltrator: boolean;
}

export default function VoteModal({ options, hasVoted, onVote, onClose, getDisplayName, isInfiltrator }: Props) {
  const [timeLeft, setTimeLeft] = useState(60);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Si el tiempo se acaba y no se ha votado, cuenta como abstención
          onVote(-1);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onVote]);

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white p-5 rounded-lg shadow-xl min-w-[320px] max-w-xl w-[90%]"
        onClick={(e) => e.stopPropagation()} /* evita cerrar si accidentalmente hay handler en padre */
      >
        {isInfiltrator ? (
          <p className="font-bold text-center my-3">Ha iniciado una votación</p>
        ) : (
          <>
            <h3 className="text-lg font-semibold mb-3">Elige un NPC para expulsar</h3>
            <div className="flex flex-col gap-3">
              {options.map((o) => (
                <div key={o.id} className="flex items-center justify-between gap-3 p-2 bg-slate-50 rounded-md">
                  <div className="flex-1 text-sm text-slate-700 truncate">
                    {getDisplayName(o)} — <span className="text-xs text-slate-500">{o.type}</span>
                  </div>
                  <button
                    className={
                      hasVoted
                        ? 'px-3 py-1 rounded-md bg-gray-400 text-white font-semibold cursor-not-allowed'
                        : 'px-3 py-1 rounded-md bg-sky-500 hover:bg-sky-600 text-white font-semibold'
                    }
                    disabled={hasVoted}
                    onClick={() => onVote(o.id)}
                  >
                    Votar
                  </button>
                </div>
              ))}

              <div className="flex items-center justify-between gap-3 p-2 bg-slate-50 rounded-md">
                <div className="flex-1 text-sm text-slate-700">Abstenerse</div>
                <button
                  className={
                    hasVoted
                      ? 'px-3 py-1 rounded-md bg-gray-400 text-white font-semibold cursor-not-allowed'
                      : 'px-3 py-1 rounded-md bg-amber-500 hover:bg-amber-600 text-white font-semibold'
                  }
                  disabled={hasVoted}
                  onClick={() => onVote(-1)}
                >
                  Abstenerme
                </button>
              </div>
            </div>
          </>
        )}

        {/* No hay botón de cerrar: la votación termina solo cuando todos voten o se acabe el tiempo */}
        <div className="mt-4 text-center text-sm text-slate-600">
          <p>Tiempo restante: <span className="font-medium">{timeLeft}</span> segundos</p>
        </div>
      </div>
    </div>
  );
}
