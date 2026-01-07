// src/utils/SoundAssets.js

/**
 * Quản lý key và đường dẫn của các file âm thanh effect
 * Tách riêng để dễ quản lý và chỉnh sửa sau này
 */

export const SOUND_KEYS = {
  SPIN_WHEEL: 'spin_effect',
  SPIN_COLLECT: 'spin_collect',
  SWAP_GEM: 'swap_sfx'
};

export const SOUND_PATHS = [
  {
    key: SOUND_KEYS.SPIN_WHEEL,
    path: 'assets/sounds/effect/spin_effect.m4a'
  },
  {
    key: SOUND_KEYS.SPIN_COLLECT,
    path: 'assets/sounds/effect/spin_collect.m4a'
  },
  {
    key: SOUND_KEYS.SWAP_GEM,
    path: 'assets/sounds/effect/swap1.m4a'
  }
];

