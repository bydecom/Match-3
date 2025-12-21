// src/main.js
import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { PreloaderScene } from './scenes/PreloaderScene';
import { MapScene } from './scenes/MapScene';
import { DemoScene } from './scenes/DemoScene';
import { LevelLoaderScene } from './scenes/LevelLoaderScene';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';
import { SettingsPopup } from './scenes/popups/SettingsPopup';
import { PausePopup } from './scenes/popups/PausePopup';
import { WinPopup } from './scenes/popups/WinPopup';
import { LevelReviewPopup } from './scenes/popups/LevelReviewPopup';
import { LosePopup } from './scenes/popups/LosePopup';
import { SpinPopup } from './scenes/popups/SpinPopup';
import { ShopPopup } from './scenes/popups/ShopPopup';
import { FriendPopup } from './scenes/popups/FriendPopup';

const config = {
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: '#1b1e27',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 576,
    height: 1024,
  },
  scene: [BootScene, PreloaderScene, DemoScene, MapScene, LevelLoaderScene, GameScene, UIScene, SettingsPopup, PausePopup, WinPopup, LosePopup, LevelReviewPopup, SpinPopup, ShopPopup, FriendPopup] 
};

function initializeApp() {
  const fullscreenButton = document.getElementById('fullscreen-button');

  const enterFullscreen = () => {
    const element = document.documentElement;
    if (element.requestFullscreen) {
      element.requestFullscreen();
    } else if (element.webkitRequestFullscreen) {
      element.webkitRequestFullscreen();
    }
  }

  fullscreenButton.addEventListener('click', () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (!isIOS) {
      enterFullscreen();
    }
    fullscreenButton.style.display = 'none';

    const game = new Phaser.Game(config);
    
    // << [AUDIO] Gán game instance vào window để AudioManager có thể emit event >>
    if (typeof window !== 'undefined') {
      window.game = game;
      console.log('[Main] Game instance assigned to window.game');
    }

  }, { once: true });
}

initializeApp();