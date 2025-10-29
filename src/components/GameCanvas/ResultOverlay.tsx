type ResultOverlayProps = {
  isOpen: boolean;
  winnerMessage?: string | null;
  onConfirm: () => void;
};

export function ResultOverlay({ isOpen, winnerMessage, onConfirm }: ResultOverlayProps) {
  if (!isOpen || !winnerMessage) {
    return null;
  }

  return (
    <div className="result-overlay" role="dialog" aria-modal="true">
      <div className="result-card animate-fadeIn">
        <div className="result-anim">
          <h2 className="result-title">{winnerMessage}</h2>
        </div>
        <p className="result-sub">¡Partida finalizada!</p>
        <div style={{ marginTop: 14 }}>
          <button className="button" onClick={onConfirm}>
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}
