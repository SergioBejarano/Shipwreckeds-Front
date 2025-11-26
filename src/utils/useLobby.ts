// src/utils/useLobby.ts
import { useEffect, useRef } from "react";
import { Client } from "@stomp/stompjs";
import type { Frame, IMessage } from "@stomp/stompjs";
import { WS_ENDPOINT } from "./api";

type LobbyCallback = (payload: any) => void;

export function useLobby(
  matchCode: string | null,
  onMessage: LobbyCallback,
  onConnect?: (frame?: Frame) => void,
  onDisconnect?: () => void
) {
  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    if (!matchCode) return;

    let mounted = true;

    const init = async () => {
      // shim global for modules that expect a Node-like global variable (sockjs-client)
      try {
        (window as any).global = (window as any).global || window;
      } catch (e) {
        // ignore if window isn't available (shouldn't happen in browser)
      }

      let SockJS: any;
      try {
        const mod = await import("sockjs-client");
        SockJS = (mod && (mod as any).default) || mod;
      } catch (e) {
        console.error("Failed to load sockjs-client:", e);
        return;
      }

      if (!mounted) return;

      const socketUrl = (() => {
        if (!WS_ENDPOINT) return "/ws";
        if (WS_ENDPOINT.startsWith("http")) {
          return WS_ENDPOINT;
        }
        if (typeof window !== "undefined") {
          const base = window.location.origin.replace(/\/$/, "");
          const suffix = WS_ENDPOINT.startsWith("/") ? WS_ENDPOINT : `/${WS_ENDPOINT}`;
          return `${base}${suffix}`;
        }
        return WS_ENDPOINT;
      })();

      const socket = new SockJS(socketUrl);
      const client = new Client({
        webSocketFactory: () => socket as any,
        debug: () => {},
        reconnectDelay: 5000,
        onConnect: (frame) => {
          onConnect && onConnect(frame);
          client.subscribe(`/topic/lobby/${matchCode}`, (msg: IMessage) => {
            try {
              const payload = JSON.parse(msg.body);
              onMessage(payload);
            } catch {
              onMessage(msg.body);
            }
          });
        },
        onStompError: (frame) => console.error("STOMP error", frame),
        onDisconnect: () => onDisconnect && onDisconnect(),
      });

      client.activate();
      clientRef.current = client;
    };

    init();

    return () => {
      mounted = false;
      try { clientRef.current?.deactivate(); } catch {}
      clientRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchCode]);

  return {
    disconnect: () => { if (clientRef.current) clientRef.current.deactivate(); },
  };
}