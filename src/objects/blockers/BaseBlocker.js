import Phaser from 'phaser';

export class BaseBlocker extends Phaser.GameObjects.Image {
  constructor(scene, x, y, key, type, row, col) {
    super(scene, x, y, key)
    this.scene = scene
    this.type = type
    this.row = row
    this.col = col
    this.scene.add.existing(this)
    this.setDepth(4)
  }

  takeDamage() {
    this.destroy()
    return true
  }

  spread(board) {
    // no-op by default
  }
}


