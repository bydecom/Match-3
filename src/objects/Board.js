// src/objects/Board.js
import { applyMixins } from '../utils/helpers'
import { BoardCreator } from './board/BoardCreator'
import { BoardInput } from './board/BoardInput'
import { BoardMatcher } from './board/BoardMatcher'
import { BoardPowerups } from './board/BoardPowerups'
import { BoardState } from './board/BoardState'

export class Board {
  constructor(scene, offsetX, offsetY, cellSize) {
    this.scene = scene
    this.offsetX = offsetX
    this.offsetY = offsetY
    this.cellSize = cellSize

    // Khởi tạo state
    this.grid = []
    this.blockerGrid = []
    this.gems = []
    this.blockers = []
    this.levelData = null
    this.selectedGem = null
    this.ropeDestroyedThisTurn = false
    this.boardBusy = false

    // Lắp ráp trạng thái ban đầu
    this.initGrid()
    this.selectionFrame = this.createSelectionFrame()
  }

  loadLevel(levelData) {
    this.levelData = levelData
    if (!levelData.gridLayout) {
      console.error('Level data missing gridLayout!')
      return
    }

    this.clearBoard()
    this.createAllCells()

    // Load gem layout
    for (let row = 0; row < levelData.gridLayout.length; row++) {
      for (let col = 0; col < levelData.gridLayout[row].length; col++) {
        const cellValue = levelData.gridLayout[row][col]
        if (cellValue === null) {
          this.grid[row][col] = null
        } else if (cellValue === 0) {
          this.grid[row][col] = { type: 'empty' }
        } else if (cellValue >= 1) {
          this.createGem(row, col, this.getGemTypeByNumber(cellValue))
        }
      }
    }

    // Load blocker layout (nếu có)
    if (levelData.blockerLayout) {
      for (let row = 0; row < levelData.blockerLayout.length; row++) {
        for (let col = 0; col < levelData.blockerLayout[row].length; col++) {
          const blockerValue = levelData.blockerLayout[row][col]
          if (blockerValue === 1) {
            this.createRopeBlocker(row, col)
          } else if (blockerValue === 2 || blockerValue === 3) {
            // Thiết kế mới: tất cả stone có 2 máu
            this.createStoneBlocker(row, col, 2)
          }
        }
      }
    }

    this.fillEmptyCells()
  }

  // Entry point nhận input từ Scene
  handleInput(inputData) {
    console.log('Board received input:', inputData)
    switch (inputData.type) {
      case 'gem_click':
        this.handleGemClick(inputData.row, inputData.col)
        break
      case 'blocker_click':
        this.handleBlockerClick(inputData.row, inputData.col, inputData.blockerType)
        break
      default:
        console.warn('Unknown input type:', inputData.type)
    }
  }
}

// Trộn các module vào Board
applyMixins(Board, [BoardCreator, BoardInput, BoardMatcher, BoardPowerups, BoardState])