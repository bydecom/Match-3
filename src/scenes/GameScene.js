// src/scenes/GameScene.js
import Phaser from 'phaser'
import { Board } from '../objects/Board'
import { SCENE_KEYS, BOOSTER_TYPES } from '../utils/constants'
import { BoosterVFXManager } from '../objects/vfx/BoosterVFXManager'
import { PowerupVFXManager } from '../objects/vfx/PowerupVFXManager'

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' })
        this.board = null
        this.levelData = null
        this.activeBooster = null
        this.firstSwapGem = null
        this.boosterVFXManager = null
        this.isPointerDown = false
        this.lastHoveredCell = { row: -1, col: -1 }
        this.timer = null
        this.currentTime = 0
    }

    create(data) {
        const { width, height } = this.scale

        // 1. Tải dữ liệu level vào this.levelData (đã sửa, không gọi board.loadLevel nữa)
        this.loadLevelData(data);

        // 2. Xác định theme dựa trên dữ liệu đã tải
        const themeKey = this.levelData.playgroundTheme || '1';
        const backgroundKey = `playground${themeKey}_background`;
        const borderKey = `playground${themeKey}_border`;
        
        console.log(`Loading board theme: ${themeKey}`);

        // Hiển thị background của scene
        this.add.image(width / 2, height / 2, 'map1_background')
            .setDisplaySize(width, height)
            .setDepth(0);

        // Tính toán vị trí và kích thước board
        const playgroundSize = Math.min(width, height) * 0.9;
        const playgroundX = width / 2;
        const playgroundY = height / 2 + height / 8 - height / 48;

        // 3. Hiển thị background và border của BOARD với depth đã được sửa
        if (this.textures.exists(backgroundKey)) {
            this.add.image(playgroundX, playgroundY, backgroundKey)
                .setDisplaySize(playgroundSize, playgroundSize)
                .setDepth(0); // Nền của board, nằm dưới cùng
        } else {
            console.error(`Không tìm thấy texture: ${backgroundKey}!`);
        }

        if (this.textures.exists(borderKey)) {
            this.add.image(playgroundX, playgroundY, borderKey)
                .setDisplaySize(playgroundSize, playgroundSize)
                .setDepth(1); // Border (khung) của board, nằm trên nền nhưng dưới gem
        } else {
            console.error(`Không tìm thấy texture: ${borderKey}!`);
        }

        // 4. Tạo đối tượng Board
        this.createBoard(playgroundX, playgroundY, playgroundSize);
        
        // 5. << SỬA LỖI: Tải dữ liệu level VÀO board SAU KHI board đã được tạo >>
        if (this.board && this.levelData) {
            this.board.loadLevel(this.levelData);
        }

        // Phần còn lại của hàm create giữ nguyên
        this.boosterVFXManager = new BoosterVFXManager(this, this.board);
        if (!this.scene.isActive('UIScene')) this.scene.launch('UIScene');
        this.game.events.on('boosterSelected', this.onBoosterSelected, this);
        this.input.on('pointerdown', this.onPointerDown, this);
        this.input.on('pointermove', this.onPointerMove, this);
        this.input.on('pointerup', this.onPointerUp, this);
        this.game.events.on('boardBusy', (isBusy) => {
            if (isBusy && this.boosterVFXManager) {
                this.boosterVFXManager.clearPreview();
            }
        }, this);
        this.game.events.on('boosterSelectionCleared', this.clearActiveBooster, this);
        this.game.events.on('screenShake', (shakeData) => {
            this.cameras.main.shake(shakeData.duration, shakeData.intensity);
        }, this);

        const settingsButton = this.add.image(40, 40, 'setting_button')
            .setInteractive({ useHandCursor: true })
            .setDepth(10)
            .setScale(0.15);
        settingsButton.on('pointerdown', () => {
            const currentLevelId = this.levelData?.levelId || 1;
            this.scene.launch('SettingsPopup', { levelId: currentLevelId });
        });
        
        this.startTimer();
    }

    // << HÀM NÀY ĐÃ ĐƯỢC SỬA LẠI ĐỂ CHỈ TẢI DATA >>
    loadLevelData(data) {
        const selectedLevelId = data?.levelId || 1;
        this.levelData = this.cache.json.get(`level_${selectedLevelId}`);
        if (!this.levelData) {
            console.error(`Level data for level_${selectedLevelId} not found in cache!`);
            this.levelData = {}; // Gán một đối tượng rỗng để tránh lỗi ở các bước sau
        }
    }

    createBoard(centerX, centerY, playgroundSize) {
        const gridSize = 9;
        const cellSize = playgroundSize * 0.93 / gridSize;
        const boardOffsetX = centerX - (cellSize * gridSize) / 2;
        const boardOffsetY = centerY - (cellSize * gridSize) / 2;
        
        this.gemLayer = this.add.layer().setDepth(2);
        
        const maskShape = this.make.graphics();
        maskShape.fillStyle(0xffffff);
        maskShape.fillRect(boardOffsetX, boardOffsetY, gridSize * cellSize, gridSize * cellSize);
        this.gemLayer.setMask(maskShape.createGeometryMask());

        this.powerupVFXManager = new PowerupVFXManager(this);
        this.board = new Board(this, boardOffsetX, boardOffsetY, cellSize, this.powerupVFXManager, this.gemLayer);
        
        this.setupBoardEvents();
    }

    // Các hàm còn lại giữ nguyên...
    setupBoardEvents() {
        this.events.on('gemSelected', this.onGemSelected, this)
        this.events.on('blockerSelected', this.onBlockerSelected, this)
    }

    onBoosterSelected(boosterType) {
        this.board?.clearSelection();
        this.boosterVFXManager?.clearCurrentVFX()
        this.activeBooster = boosterType
        this.firstSwapGem = null
        if (boosterType === BOOSTER_TYPES.SHUFFLE && this.boosterVFXManager) {
            this.boosterVFXManager.showShuffleConfirmation()
        }
    }

    clearActiveBooster() {
        if (this.activeBooster) {
            this.activeBooster = null
            this.firstSwapGem = null
            this.boosterVFXManager?.clearCurrentVFX()
        }
    }

    startTimer() {
        if (!this.levelData || !this.levelData.starTimes) return
        this.currentTime = this.levelData.starTimes.startTime
        this.timer = this.time.addEvent({ delay: 1000, callback: this.updateTimer, callbackScope: this, loop: true })
        this.game.events.emit('updateTimer', this.currentTime)
    }

    updateTimer() {
        this.currentTime = Math.max(0, this.currentTime - 1)
        this.game.events.emit('updateTimer', this.currentTime)
        if (this.currentTime <= 0) {
            this.timer.remove()
            console.log('Hết giờ!')
        }
    }

    shutdown() {
        if (this.timer) this.timer.remove()
        this.game.events.off('updateTimer')
        // Dọn dẹp các listener khác để tránh memory leak
        this.game.events.off('boosterSelected', this.onBoosterSelected, this);
        this.game.events.off('boardBusy', null, this);
        this.game.events.off('boosterSelectionCleared', this.clearActiveBooster, this);
        this.game.events.off('screenShake', null, this);
    }

    onPointerDown(pointer) {
        this.isPointerDown = true;
        if (!this.activeBooster || !this.board || this.board.boardBusy) return;
        if (this.activeBooster === BOOSTER_TYPES.ROCKET) {
            this.onPointerMove(pointer);
        }
    }

    onPointerMove(pointer) {
        if (!this.isPointerDown) return;
        if (this.activeBooster !== BOOSTER_TYPES.ROCKET) return;
        if (!this.board || this.board.boardBusy) return;

        const listToCheck = this.children.list.concat(this.gemLayer.list);
        const gameObjects = this.input.manager.hitTest(pointer, listToCheck, this.cameras.main);
        const targetObject = gameObjects.find(obj => typeof obj.getData === 'function' && (obj.getData('isGem') || obj.getData('isCell')));
        
        if (targetObject) {
            const row = targetObject.getData('row');
            const col = targetObject.getData('col');
            if (this.lastHoveredCell.row !== row || this.lastHoveredCell.col !== col) {
                this.lastHoveredCell = { row, col };
                this.boosterVFXManager?.showRocketPreview(row, col);
            }
        } else {
            this.boosterVFXManager?.clearPreview();
            this.lastHoveredCell = { row: -1, col: -1 };
        }
    }

    onPointerUp(pointer) {
        this.isPointerDown = false;
        if (!this.board || this.board.boardBusy) return;

        const listToCheck = this.children.list.concat(this.gemLayer.list);
        const gameObjects = this.input.manager.hitTest(pointer, listToCheck, this.cameras.main);
        const clickedObject = gameObjects.find(obj => obj.getData('isGem') || obj.getData('isCell'));

        if (!this.activeBooster) return;

        if (this.activeBooster === BOOSTER_TYPES.SWAP) {
            if (!clickedObject) return;
            const row = clickedObject.getData('row');
            const col = clickedObject.getData('col');
            const clickedGem = this.board.grid[row]?.[col];
            if (!clickedGem || clickedGem.type !== 'gem') return;

            if (!this.firstSwapGem) {
                this.firstSwapGem = clickedGem;
                this.boosterVFXManager?.showSwapPreview(row, col);
            } else {
                if (this.firstSwapGem !== clickedGem) {
                    this.game.events.emit('boardBusy', true);
                    this.board.useSwap(this.firstSwapGem, clickedGem);
                }
                this.clearActiveBooster();
            }
            return;
        }
        
        const boosterToUse = this.activeBooster;
        this.clearActiveBooster();

        const row = clickedObject?.getData('row');
        const col = clickedObject?.getData('col');

        switch (boosterToUse) {
            case BOOSTER_TYPES.HAMMER:
                if (row !== undefined) {
                    this.game.events.emit('boardBusy', true);
                    this.boosterVFXManager.playHammerEffect(row, col, () => {
                        this.board.useHammer(row, col);
                    });
                }
                break;
            case BOOSTER_TYPES.ROCKET:
                if (row !== undefined) {
                    this.game.events.emit('boardBusy', true);
                    this.boosterVFXManager.playRocketEffect(col, () => {
                        this.board.useRocket(row, col);
                    });
                }
                break;
            case BOOSTER_TYPES.SHUFFLE:
                 if (clickedObject) {
                    this.game.events.emit('boardBusy', true);
                    this.board.useShuffle();
                 }
                break;
        }
    }

    onGemSelected(data) {
        console.log(`Gem selected: ${data.type} at ${data.row},${data.col}`);
    }

    onBlockerSelected(data) {
        console.log(`Blocker selected: ${data.type} at ${data.row},${data.col}`);
    }
}