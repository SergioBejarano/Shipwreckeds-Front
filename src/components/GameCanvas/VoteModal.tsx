import type { Avatar } from '../../utils/GameCanvas/types';

interface Props {
  options: Avatar[];
  hasVoted: boolean;
  onVote: (id: number) => Promise<void>;
  onClose: () => void;
  getDisplayName: (a: Avatar) => string;
  isInfiltrator: boolean;
}

export default function VoteModal({ options, hasVoted, onVote, onClose, getDisplayName, isInfiltrator }: Props) {
  return (
    <div className="vote-modal">
      <div className="vote-modal-card">
        {isInfiltrator ? (
          <p style={{ fontWeight: 700, textAlign: 'center', margin: '12px 0 18px' }}>Ha iniciado una votación</p>
        ) : (
          <>
            <h3>Elige un NPC para expulsar</h3>
            <div className="vote-options">
              {options.map((o) => (
                <div key={o.id} className="vote-option">
                  <div>{getDisplayName(o)} — {o.type}</div>
                  <button disabled={hasVoted} onClick={() => onVote(o.id)}>Votar</button>
                </div>
              ))}
            </div>
          </>
        )}
        <div style={{ marginTop: 12 }}>
          <button onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
