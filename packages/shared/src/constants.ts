export const WORLD = {
  width: 1600,
  height: 900,
  margin: 56,
} as const;

export const PLAYER = {
  maxHealth: 100,
  speed: 260,
  radius: 20,
  invulnerabilityMs: 550,
} as const;

export const SIMULATION = {
  fixedStepMs: 1000 / 30,
  maxZombies: 48,
  maxBullets: 96,
} as const;
