import { useEffect } from 'react';
import { Client } from '@stomp/stompjs';
import type { IMessage } from '@stomp/stompjs';
import type { Avatar, GameState } from './types';

const WS_URL = 'http://localhost:8080/ws';

export function useStompClient(
  matchCode: string,
  clientRef: { current: Client | null },
  setGameState: (s: GameState | null) => void,
  setConnected: (v: boolean) => void,
  setVoteOptions?: (opts: any[]) => void,
  setVoteModalOpen?: (v: boolean) => void,
  setVoteResult?: (r: any) => void,
  onVoteStart?: (payload: any) => void
) {
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        // shim global for sockjs-client modules that expect Node global
        try { (window as any).global = (window as any).global || window; } catch (e) {}

        const mod = await import('sockjs-client');
        const SockJS = (mod && (mod as any).default) || mod;

        if (!mounted) return;

        const socket = new SockJS(WS_URL);
        const client = new Client({
          webSocketFactory: () => socket as any,
          reconnectDelay: 2000,
          heartbeatIncoming: 0,
          heartbeatOutgoing: 20000,
          onConnect: () => {
            setConnected(true);
            client.subscribe(`/topic/game/${matchCode}`, (msg: IMessage) => {
              try {
                const payload = JSON.parse(msg.body) as GameState & { avatars?: any[] };
                const normalized: GameState = {
                  ...payload,
                  avatars: Array.isArray(payload.avatars)
                    ? payload.avatars.map((avatar: any): Avatar => ({
                        ...avatar,
                        ownerUsername: avatar.ownerUsername ?? avatar.ownerusername ?? null,
                        isInfiltrator: avatar.isInfiltrator ?? avatar.infiltrator ?? false,
                        isAlive: avatar.isAlive ?? avatar.alive ?? true,
                        displayName: avatar.displayName ?? avatar.displayname ?? null,
                      }))
                    : [],
                };
                setGameState(normalized);
              } catch (e) {
                console.warn('Invalid game message', e);
              }
            });

            // optional voting topics
            if (onVoteStart || (setVoteOptions && setVoteModalOpen)) {
              client.subscribe(`/topic/game/${matchCode}/vote/start`, (msg: IMessage) => {
                try {
                  const payload = JSON.parse(msg.body);
                  if (onVoteStart) {
                    onVoteStart(payload);
                  } else {
                    setVoteOptions?.(payload.options || []);
                    setVoteModalOpen?.(true);
                  }
                } catch (e) {
                  console.warn('Invalid vote start', e);
                }
              });
            }

            if (setVoteResult) {
              client.subscribe(`/topic/game/${matchCode}/vote/result`, (msg: IMessage) => {
                try {
                  const payload = JSON.parse(msg.body);
                  const countsSrc = payload?.counts ?? {};
                  const normalizedCounts: Record<number, number> = {};
                  if (countsSrc && typeof countsSrc === 'object') {
                    Object.entries(countsSrc).forEach(([key, value]) => {
                      const numericKey = Number(key);
                      if (!Number.isNaN(numericKey)) {
                        const numericValue = typeof value === 'number' ? value : Number(value);
                        normalizedCounts[numericKey] = Number.isFinite(numericValue) ? numericValue : 0;
                      }
                    });
                  }
                  setVoteResult({
                    ...payload,
                    counts: normalizedCounts,
                  });
                } catch (e) {
                  console.warn('Invalid vote result', e);
                }
              });
            }
          },
          onStompError: (frame) => {
            console.error('STOMP error', frame);
          },
          onDisconnect: () => setConnected(false),
        });

        client.activate();
        clientRef.current = client;
      } catch (e) {
        console.error('Failed to init SockJS/STOMP client', e);
      }
    };

    init();

    return () => {
      mounted = false;
      try { clientRef.current?.deactivate(); } catch {}
      clientRef.current = null;
      setConnected(false);
    };
  }, [matchCode, clientRef, setGameState, setConnected, setVoteOptions, setVoteModalOpen, setVoteResult, onVoteStart]);
}