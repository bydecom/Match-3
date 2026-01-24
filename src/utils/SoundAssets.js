// src/utils/SoundAssets.js

/**
 * Quản lý key và đường dẫn của các file âm thanh effect
 * Tách riêng để dễ quản lý và chỉnh sửa sau này
 */

export const SOUND_KEYS = {
  SPIN_WHEEL: 'spin_effect',
  SPIN_BACKGROUND_EFFECT: 'spin_background_effect',
  SPIN_COLLECT: 'spin_collect',
  SWAP_GEM: 'swap_sfx',
  WIN_GAME: 'win_game',
  LOSE_GAME: 'lose_game',
  // --- THÊM MỚI ---
  SHAKE: 'shake',
  BOMB: 'bomb',
  STRIPE: 'stripe',
  ROCKET: 'rocket'
};

export const SOUND_PATHS = [
  // {
  //   key: SOUND_KEYS.SPIN_WHEEL,
  //   path: 'assets/sounds/effect/spin_effect__.m4a'
  // },
  {
    key: SOUND_KEYS.SPIN_BACKGROUND_EFFECT,
    path: 'assets/sounds/effect/spin_background_effect.m4a'
  },
  {
    key: SOUND_KEYS.SPIN_COLLECT,
    path: 'assets/sounds/effect/spin_collect.m4a'
  },
  {
    key: SOUND_KEYS.SWAP_GEM,
    path: 'assets/sounds/effect/swap1.m4a'
  },
  {
    key: SOUND_KEYS.WIN_GAME,
    path: 'assets/sounds/effect/win_game.m4a'
  },
  {
    key: SOUND_KEYS.LOSE_GAME,
    path: 'assets/sounds/effect/lose_game.m4a'
  },
  // --- THÊM PATH MỚI ---
  {
    key: SOUND_KEYS.SHAKE,
    path: 'assets/sounds/effect/shake.m4a' 
  },
  {
    key: SOUND_KEYS.BOMB,
    path: 'assets/sounds/effect/bomb2.m4a'
  },
  {
    key: SOUND_KEYS.STRIPE,
    path: 'assets/sounds/effect/stripe.m4a'
  },
  {
    key: SOUND_KEYS.ROCKET,
    path: 'assets/sounds/effect/rocket2.m4a'
  }
];

