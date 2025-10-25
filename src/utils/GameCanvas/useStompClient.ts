import { useEffect } from 'react';
import { Client } from '@stomp/stompjs';
import type { IMessage } from '@stomp/stompjs';
import type { GameState } from './types';

const WS_URL = 'http://localhost:8080/ws';

export function useStompClient(
  matchCode: string,
  clientRef: { current: Client | null },
  setGameState: (s: GameState | null) => void,
  setConnected: (v: boolean) => void,
  setVoteOptions?: (opts: any[]) => void,
  setVoteModalOpen?: (v: boolean) => void,
  setVoteResult?: (r: any) => void
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
                const payload = JSON.parse(msg.body) as GameState;
                setGameState(payload);
              } catch (e) {
                console.warn('Invalid game message', e);
              }
            });

            // optional voting topics
            if (setVoteOptions && setVoteModalOpen) {
              client.subscribe(`/topic/game/${matchCode}/vote/start`, (msg: IMessage) => {
                try {
                  const payload = JSON.parse(msg.body);
                  setVoteOptions(payload.options || []);
                  setVoteModalOpen(true);
                } catch (e) {
                  console.warn('Invalid vote start', e);
                }
              });
            }

            if (setVoteResult) {
              client.subscribe(`/topic/game/${matchCode}/vote/result`, (msg: IMessage) => {
                try {
                  const payload = JSON.parse(msg.body);
                  setVoteResult(payload);
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
  }, [matchCode, clientRef, setGameState, setConnected, setVoteOptions, setVoteModalOpen, setVoteResult]);
}
