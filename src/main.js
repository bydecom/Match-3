// src/main.js
import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { PreloaderScene } from './scenes/PreloaderScene';
import { MainScene } from './scenes/Mainscene';

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
  scene: [BootScene, PreloaderScene, MainScene] 
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


  }, { once: true });
}

initializeApp();