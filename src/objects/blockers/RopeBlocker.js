  import { BaseBlocker } from './BaseBlocker'

  export class RopeBlocker extends BaseBlocker {
    constructor(scene, x, y, row, col) {
      super(scene, x, y, 'blocker_rope', 'rope', row, col)
      this.health = 1
    }

    // Rope bị phá khi match chính viên gem ở vị trí này (damage trực tiếp)
    // Không override takeDamage khác hành vi mặc định

  spread(board, plannedSpawns) {
    const candidates = []
    
    const pushIfFree = (r, c) => {
      // Kiểm tra ô có nằm trong biên của board không
      if (r >= 0 && r < board.grid.length && c >= 0 && c < board.grid[0].length) {
        const hasBlocker = board.blockerGrid[r][c]
        // <<< SỬA Ở ĐÂY: Thêm điều kiện kiểm tra gridLayout >>>
        // Một ô là hợp lệ NẾU:
        // 1. Không có blocker nào khác ở đó.
        // 2. Ô đó là một ô chơi được (không phải null) trong thiết kế màn chơi.
        const isPlayableCell = board.levelData.gridLayout[r][c] !== null
        
        if (!hasBlocker && isPlayableCell) {
          candidates.push({ row: r, col: c })
        }
      }
    }
    
    pushIfFree(this.row - 1, this.col)
    pushIfFree(this.row + 1, this.col)
    pushIfFree(this.row, this.col - 1)
    pushIfFree(this.row, this.col + 1)
    
    if (candidates.length === 0) return
    
    const keyOf = (r, c) => `${r},${c}`
    const nonPlanned = candidates.filter(p => !plannedSpawns?.has(keyOf(p.row, p.col)))
    const pool = nonPlanned.length > 0 ? nonPlanned : candidates
    const target = Phaser.Math.RND.pick(pool)
    
    board.createRopeBlocker(target.row, target.col)
    if (plannedSpawns) plannedSpawns.add(keyOf(target.row, target.col))
  }
  }


