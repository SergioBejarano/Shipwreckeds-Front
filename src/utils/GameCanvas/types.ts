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

export type Boat = {
  x: number;
  y: number;
  interactionRadius?: number;
};

export type GameState = {
  code: string;
  timestamp?: number;
  timerSeconds?: number;
  avatars: Avatar[];
  island: Island;
  boat?: Boat;
  fuelPercentage?: number;
  status?: string;
};

export type Props = {
  matchCode: string;
  currentUser: string;
  canvasWidth?: number;
  canvasHeight?: number;
};