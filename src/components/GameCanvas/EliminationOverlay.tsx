type EliminationOverlayProps = {
  message: string | null;
  onReturnToLobby: () => void;
};

export function EliminationOverlay({ message, onReturnToLobby }: EliminationOverlayProps) {
  if (!message) {
    return null;
  }

  return (
    <div className="elimination-overlay">
      <div className="elimination-overlay__card">
        <h2>Has sido eliminado</h2>
        <p>{message}</p>
        <button type="button" className="elimination-overlay__button" onClick={onReturnToLobby}>
          Volver al lobby
        </button>
      </div>
    </div>
  );
}
