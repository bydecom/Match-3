import Phaser from 'phaser'
import { MainScene } from './scenes/MainScene'

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: '#1b1e27',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 480,
    height: 800
  },
  physics: {
    default: 'arcade',
    arcade: { debug: false }
  },
  scene: [MainScene]
}

// eslint-disable-next-line no-new
new Phaser.Game(config)

