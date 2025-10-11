// src/objects/board/BoardMatcher.js
import { GEM_TYPES, GRID_SIZE } from '../../utils/constants'

export class BoardMatcher {
  // << THÊM HÀM HELPER NÀY >>
  canMatchAt(row, col) {
    const blocker = this.blockerGrid?.[row]?.[col]
    if (!blocker) return true // Không có blocker, có thể match

    // Đá nguyên khối không thể match
    if (blocker.type === 'stone' && blocker.health === 2) {
      return false
    }

    // Đá vỡ và dây leo có thể match
    return true
  }

  findAllMatches() {
    let horizontalMatches = []
    let verticalMatches = []

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE - 2; ) {
        const gem = this.grid[row][col]
        const isPowerUp = gem && (gem.value === GEM_TYPES.BOMB || gem.value === GEM_TYPES.COLOR_BOMB || gem.value === GEM_TYPES.STRIPE)
        if (gem && gem.type === 'gem' && !isPowerUp && this.canMatchAt(row, col)) {
          let match = [gem]
          for (let i = col + 1; i < GRID_SIZE; i++) {
            const nextGem = this.grid[row][i]
            if (nextGem && nextGem.type === 'gem' && nextGem.value === gem.value && this.canMatchAt(row, i)) {
              match.push(nextGem)
            } else {
              break
            }
          }
          if (match.length >= 3) horizontalMatches.push(match)
          col += match.length
        } else {
          col++
        }
      }
    }

    for (let col = 0; col < GRID_SIZE; col++) {
      for (let row = 0; row < GRID_SIZE - 2; ) {
        const gem = this.grid[row][col]
        const isPowerUp = gem && (gem.value === GEM_TYPES.BOMB || gem.value === GEM_TYPES.COLOR_BOMB || gem.value === GEM_TYPES.STRIPE)
        if (gem && gem.type === 'gem' && !isPowerUp && this.canMatchAt(row, col)) {
          let match = [gem]
          for (let i = row + 1; i < GRID_SIZE; i++) {
            const nextGem = this.grid[i][col]
            if (nextGem && nextGem.type === 'gem' && nextGem.value === gem.value && this.canMatchAt(i, col)) {
              match.push(nextGem)
            } else {
              break
            }
          }
          if (match.length >= 3) verticalMatches.push(match)
          row += match.length
        } else {
          row++
        }
      }
    }

    const allMatches = horizontalMatches.concat(verticalMatches)
    const mergedMatches = []
    while (allMatches.length > 0) {
      let currentGroup = new Set(allMatches.shift())
      let merged = true
      while (merged) {
        merged = false
        for (let i = allMatches.length - 1; i >= 0; i--) {
          const otherMatch = allMatches[i]
          const hasIntersection = otherMatch.some(gem => currentGroup.has(gem))
          if (hasIntersection) {
            otherMatch.forEach(gem => currentGroup.add(gem))
            allMatches.splice(i, 1)
            merged = true
          }
        }
      }
      mergedMatches.push(Array.from(currentGroup))
    }
    console.log(`Found ${mergedMatches.length} match groups:`, mergedMatches.map(match => match.length))
    return mergedMatches
  }
}


