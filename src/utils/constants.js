// src/utils/constants.js
export const SCENE_KEYS = {
  BOOT: 'BootScene',
  PRELOADER: 'PreloaderScene',
  MAP: 'MapScene',
  GAME: 'GameScene',
  UI: 'UIScene',
  LEADERBOARD: 'LeaderboardScene'
}

export const GEM_TYPES = {
  RED: 'red',
  GREEN: 'green', 
  BLUE: 'blue',
  PURPLE: 'purple',
  YELLOW: 'yellow',
  ORANGE: 'orange',
  BOMB: 'bomb',
  COLOR_BOMB: 'color_bomb',
  STRIPE: 'stripe'
}

export const BLOCKER_TYPES = {
  STONE: 'stone',
  VINE: 'vine'
}

export const GRID_SIZE = 9
export const CELL_SIZE = 60 // Kích thước mặc định của cell

export const BOOSTER_TYPES = {
  HAMMER: 'hammer',
  SWAP: 'swap',
  ROCKET: 'rocket',
  SHUFFLE: 'shuffle',
}

export const SCORE_VALUES = {
  GEM_MATCH: 10,
  BLOCKER_DESTROY: 100,
  POWERUP_ACTIVATE_SINGLE: 200,
  POWERUP_ACTIVATE_COMBO: 1000,
  CHAIN_MULTIPLIER: 2,
}
