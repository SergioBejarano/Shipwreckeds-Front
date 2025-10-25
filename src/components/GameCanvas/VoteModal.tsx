import type { Avatar } from '../../utils/GameCanvas/types';

interface Props {
  options: Avatar[];
  hasVoted: boolean;
  onVote: (id: number) => Promise<void>;
  onClose: () => void;
  getDisplayName: (a: Avatar) => string;
}

export default function VoteModal({ options, hasVoted, onVote, onClose, getDisplayName }: Props) {
  return (
    <div className="vote-modal">
      <div className="vote-modal-card">
        <h3>Elige un NPC para expulsar</h3>
        <div className="vote-options">
          {options.map((o) => (
            <div key={o.id} className="vote-option">
              <div>{getDisplayName(o)} — {o.type}</div>
              <button disabled={hasVoted} onClick={() => onVote(o.id)}>Votar</button>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12 }}>
          <button onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
