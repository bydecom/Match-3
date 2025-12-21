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
    return this._findAllMatchesLogic()
  }

  _findAllMatchesLogic() {
    let horizontalMatches = []
    let verticalMatches = []

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE - 2; ) {
        const gem = this.grid[row][col]
        const isPowerUp = gem && (gem.value === GEM_TYPES.BOMB || gem.value === GEM_TYPES.COLOR_BOMB)
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
        const isPowerUp = gem && (gem.value === GEM_TYPES.BOMB || gem.value === GEM_TYPES.COLOR_BOMB)
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

  /**
   * [AUTO SHUFFLE] Kiểm tra xem còn nước đi nào hợp lệ không.
   * Thuật toán: Duyệt qua từng ô, thử swap ảo với ô bên phải và bên dưới.
   * @returns {boolean} True nếu còn nước đi, False nếu bế tắc.
   */
  hasPossibleMoves() {
    if (!this.grid || !this.grid.length) return false

    const tempGrid = this.grid.map(row => row.map(cell => (cell ? { ...cell } : null)))

    const isValidSwap = (r1, c1, r2, c2) => {
      if (!this.isValidCell || !this.isValidCell(r1, c1) || !this.isValidCell(r2, c2)) return false

      const gem1 = tempGrid[r1][c1]
      const gem2 = tempGrid[r2][c2]

      if (!gem1 || gem1.type !== 'gem' || !this.canMatchAt(r1, c1)) return false
      if (!gem2 || gem2.type !== 'gem' || !this.canMatchAt(r2, c2)) return false

      tempGrid[r1][c1] = gem2
      tempGrid[r2][c2] = gem1

      const hasMatch = this._checkMatchAt(tempGrid, r1, c1) || this._checkMatchAt(tempGrid, r2, c2)

      tempGrid[r1][c1] = gem1
      tempGrid[r2][c2] = gem2

      return hasMatch
    }

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (isValidSwap(r, c, r, c + 1)) return true
        if (isValidSwap(r, c, r + 1, c)) return true

        const gem = this.grid[r][c]
        if (this.isPowerup && this.isPowerup(gem)) return true
      }
    }

    return false
  }

  /**
   * Helper kiểm tra match tại 1 ô cụ thể trong lưới ảo
   */
  _checkMatchAt(tempGrid, row, col) {
    if (!this.isValidCell || !this.isValidCell(row, col)) return false

    const gem = tempGrid[row]?.[col]
    if (!gem || gem.type !== 'gem') return false

    const type = gem.value

    let countH = 1
    let left = col - 1
    while (left >= 0 && tempGrid[row]?.[left] && tempGrid[row][left].type === 'gem' && tempGrid[row][left].value === type) {
      countH++
      left--
    }

    let right = col + 1
    while (right < GRID_SIZE && tempGrid[row]?.[right] && tempGrid[row][right].type === 'gem' && tempGrid[row][right].value === type) {
      countH++
      right++
    }
    if (countH >= 3) return true

    let countV = 1
    let up = row - 1
    while (up >= 0 && tempGrid[up]?.[col] && tempGrid[up][col].type === 'gem' && tempGrid[up][col].value === type) {
      countV++
      up--
    }

    let down = row + 1
    while (down < GRID_SIZE && tempGrid[down]?.[col] && tempGrid[down][col].type === 'gem' && tempGrid[down][col].value === type) {
      countV++
      down++
    }
    return countV >= 3
  }

  /**
   * [HỆ THỐNG GỢI Ý] Tìm tọa độ cụ thể của một nước đi khả thi (Dùng cho Hint)
   * Thay vì chỉ trả về true/false, hàm này trả về {r1, c1, r2, c2}
   * @returns {object|null} Tọa độ nước đi {r1, c1, r2, c2} hoặc null nếu không có
   */
  findPotentialMove() {
    if (!this.grid || !this.grid.length) return null

    // Clone grid ảo để test swap
    const tempGrid = this.grid.map(row => row.map(cell => (cell ? { ...cell } : null)))

    const isValidSwap = (r1, c1, r2, c2) => {
      if (!this.isValidCell || !this.isValidCell(r1, c1) || !this.isValidCell(r2, c2)) return false

      const gem1 = tempGrid[r1][c1]
      const gem2 = tempGrid[r2][c2]

      // Chỉ check gem thường và không bị chặn
      if (!gem1 || gem1.type !== 'gem' || !this.canMatchAt(r1, c1)) return false
      if (!gem2 || gem2.type !== 'gem' || !this.canMatchAt(r2, c2)) return false

      // Swap thử trên grid ảo
      tempGrid[r1][c1] = gem2
      tempGrid[r2][c2] = gem1

      // Check match
      const hasMatch = this._checkMatchAt(tempGrid, r1, c1) || this._checkMatchAt(tempGrid, r2, c2)

      // Trả lại vị trí cũ
      tempGrid[r1][c1] = gem1
      tempGrid[r2][c2] = gem2

      return hasMatch
    }

    // Duyệt qua lưới để tìm nước đi đầu tiên thấy
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        // Kiểm tra swap ngang
        if (isValidSwap(r, c, r, c + 1)) return { r1: r, c1: c, r2: r, c2: c + 1 }
        // Kiểm tra swap dọc
        if (isValidSwap(r, c, r + 1, c)) return { r1: r, c1: c, r2: r + 1, c2: c }
        
        // Hint cho Powerup (nếu có powerup thì click vào nó là ăn)
        const gem = this.grid[r][c]
        if (this.isPowerup && this.isPowerup(gem)) return { r1: r, c1: c, r2: r, c2: c }
      }
    }

    return null
  }
}


