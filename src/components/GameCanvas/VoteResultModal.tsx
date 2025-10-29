import type { Avatar } from '../../utils/GameCanvas/types';

type VoteResultPayload = { counts: Record<number, number>; expelledId?: number | null; expelledType?: string; message?: string; abstentions?: number };

interface Props {
  result: VoteResultPayload;
  gameState: { avatars: Avatar[] } | null;
  npcNameMap: Record<number, string>;
  onClose: () => void;
}

export default function VoteResultModal({ result, gameState, npcNameMap, onClose }: Props) {
  return (
    <div className="vote-modal">
      <div className="vote-modal-card">
        <h3>Resultados de la votación</h3>
        <div style={{ marginTop: 8 }}>
          {Object.keys(result.counts).map((k) => {
            const id = Number(k);
            const count = result.counts[id];
            const av = gameState?.avatars.find(a => a.id === id);
            const name = av ? (av.displayName || av.ownerUsername || npcNameMap[id] || `NPC-${id}`) : (npcNameMap[id] || `NPC-${id}`);
            return (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: '#f7f9fb', borderRadius: 6, marginBottom: 6 }}>
                <div>{name}</div>
                <div><strong>{count}</strong></div>
              </div>
            );
          })}
          {(result.abstentions ?? 0) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: '#f0f1f5', borderRadius: 6, marginBottom: 6 }}>
              <div>Abstenciones</div>
              <div><strong>{result.abstentions}</strong></div>
            </div>
          )}
        </div>
        <div style={{ marginTop: 12 }}>
          <div>{result.message}</div>
          <div style={{ marginTop: 12 }}>
            <button onClick={onClose}>Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
