import { BaseBlocker } from './BaseBlocker'

export class StoneBlocker extends BaseBlocker {
  constructor(scene, x, y, row, col, health = 2) {
    const textureKey = `blocker_stone_${health}`
    super(scene, x, y, textureKey, 'stone', row, col)
    this.health = health
  }

  takeDamage() {
    this.health--
    if (this.health <= 0) {
      this.destroy()
      return true
    } else {
      this.setTexture(`blocker_stone_${this.health}`)
      return false
    }
  }
}


