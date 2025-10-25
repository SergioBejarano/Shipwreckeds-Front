// types for GameCanvas (moved to utils)
export type Avatar = {
  id: number;
  type: "human" | "npc";
  ownerUsername?: string | null;
  x: number;
  y: number;
  isInfiltrator?: boolean;
  isAlive?: boolean;
  displayName?: string | null;
};

export type Island = {
  cx: number;
  cy: number;
  radius: number;
};

export type GameState = {
  code: string;
  timestamp?: number;
  timerSeconds?: number;
  avatars: Avatar[];
  island: Island;
  boat?: { x: number; y: number };
};

export type Props = {
  matchCode: string;
  currentUser: string;
  canvasWidth?: number;
  canvasHeight?: number;
};
