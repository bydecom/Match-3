// src/scenes/popups/SpinPopup.js
import Phaser from 'phaser';

export class SpinPopup extends Phaser.Scene {
    constructor() {
        super({ key: 'SpinPopup' });
        this.baseRotation = 22.5; // Độ xoay gốc
        this.pointerTargetAngle = 92.5; // Góc mục tiêu của con trỏ (độ)
        this.boardContainer = null; // Container chứa board và items
        this.items = []; // Mảng chứa các item
        this.isSpinning = false; // Cờ chặn spin khi đang quay
        this.pointer = null; // tham chiếu con trỏ
        this.spinButton = null; // tham chiếu nút spin
    }

    init(data) {
        // this.baseRotation = data?.baseRotation ?? 0;
    }

    create() {
        const { width, height } = this.scale;

        // 1. Tạm dừng MapScene (nếu có)
        if (this.scene.isActive('MapScene')) {
            this.scene.pause('MapScene');
        }

        // 2. Tạo một lớp nền mờ
        const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.7)
            .setOrigin(0)
            .setInteractive()
            .setDepth(1);

        // 3. Tạo background UI
        const uiBackground = this.add.image(width / 2, height / 2, 'spin_background')
            .setOrigin(0.5)
            .setScale(0.4)
            .setDepth(2);

        // 3.1. Tạo container chứa board và items (để xoay cùng nhau)
        const boardX = width / 2;
        const boardY = 558;
        this.boardContainer = this.add.container(boardX, boardY);

        // 3.2. Tạo board và thêm vào container
        const board = this.add.image(0, 0, 'spin_board')
            .setOrigin(0.5)
            .setScale(0.4);
        this.boardContainer.add(board);

        // 3.3. Tạo 8 items xung quanh board (bao gồm booster và item đặc biệt)
        // - Booster: dùng icon booster mặc định khi x1, và _2 khi x2
        // - Đặc biệt: coin_x2, heart_2 (luôn x2, texture riêng)
        const wheelItems = [
            { kind: 'booster', baseKey: 'booster_hammer', texture: 'hammer_2', quantity: 2 },
            { kind: 'booster', baseKey: 'booster_shuffle', texture: 'shuffle_2', quantity: 2 },
            { kind: 'special', rewardType: 'coin', texture: 'coin_x2', quantity: 1 },
            { kind: 'booster', baseKey: 'booster_rocket', texture: 'rocket_2', quantity: 2 },
            { kind: 'special', rewardType: 'heart', texture: 'heart_2', quantity: 2 },
            { kind: 'booster', baseKey: 'booster_shuffle', texture: 'shuffle_2', quantity: 2 },
            { kind: 'booster', baseKey: 'booster_rocket', texture: 'rocket_2', quantity: 2 },
            { kind: 'booster', baseKey: 'booster_swap', texture: 'swap_2', quantity: 2 }
        ];

        const itemCount = 8;
        const radius = 180; // Bán kính vòng tròn (tính theo scale 0.4)
        const angleStep = (360 / itemCount) * (Math.PI / 180); // Góc giữa mỗi item (radian)

        // Chuyển độ lệch gốc sang Radian
        const baseOffsetRadians = this.baseRotation * (Math.PI / 180);

        for (let i = 0; i < itemCount; i++) {
            // Thêm độ lệch vào góc
            const angle = (i * angleStep) + baseOffsetRadians;
            const itemX = Math.cos(angle) * radius;
            const itemY = Math.sin(angle) * radius;

            // Tạo container cho mỗi item
            const itemContainer = this.add.container(itemX, itemY);

            // Xoay container của item để nó hướng ra ngoài tâm
            // (angle là góc vị trí, + Math.PI / 2 là +90 độ để hướng "lên" của item trùng với hướng ra tâm)
            itemContainer.setRotation(angle + (Math.PI / 2));

            // Chọn texture và quantity theo loại item
            const def = wheelItems[i];
            const keyMap2 = {
                booster_hammer: 'hammer_2',
                booster_shuffle: 'shuffle_2',
                booster_rocket: 'rocket_2',
                booster_swap: 'swap_2'
            };
            let quantity;
            let textureKey;
            let rewardType;
            let baseKey = null;
            if (def.kind === 'special') {
                quantity = def.quantity;
                textureKey = def.texture;
                rewardType = def.rewardType; // 'coin' | 'heart'
            } else {
                baseKey = def.baseKey;
                quantity = Phaser.Math.Between(1, 2);
                textureKey = quantity === 2 ? (keyMap2[baseKey] || baseKey) : baseKey;
                rewardType = baseKey;
            }

            const boosterIcon = this.add.image(0, 0, textureKey)
                .setOrigin(0.5)
            if (baseKey === 'booster_swap') {
                boosterIcon.y += 5;
            }
            itemContainer.add(boosterIcon);

            // Lưu dữ liệu phần thưởng trên item
            const reward = { type: rewardType, quantity, index: i };
            itemContainer.setData('reward', reward);

            this.boardContainer.add(itemContainer);
            this.items.push(itemContainer);
        }

        this.boardContainer.setDepth(3);

        // 3.4. Tạo các layer khác (led, center) - không xoay theo board
        const led = this.add.image(boardX, boardY, 'spin_led')
            .setOrigin(0.5)
            .setScale(0.4)
            .setDepth(5);

        // Hiệu ứng nhấp nháy cho dải LED (luôn chạy, kể cả khi đang spin)
        this.tweens.add({
            targets: led,
            alpha: { from: 0.55, to: 1 },
            duration: 800,
            hold: 200,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
        });

        const center = this.add.image(boardX, boardY, 'spin_center')
            .setOrigin(0.5)
            .setScale(0.4)
            .setDepth(4);

        // 4. Tạo nút đóng (X) - dùng lại pause_exit
        const closeButton = this.add.image(470, 270, 'pause_exit')
            .setOrigin(0.5)

            .setInteractive({ useHandCursor: true })
            .setDepth(5);

        closeButton.on('pointerdown', () => {
            this.closePopup();
        });

        // 5. Tạo pointer (con trỏ chỉ vị trí trên bánh xe)
        this.pointer = this.add.image(width / 2, 290, 'spin_pointer')
            .setOrigin(0.5,0.1)
            .setScale(0.4)
            .setDepth(4.5);

        // 6. Tạo nút quay (spin button)
        this.spinButton = this.add.image(width / 2, 900, 'spin_button')
            .setOrigin(0.5)
            .setScale(0.4)
            .setInteractive({ useHandCursor: true })
            .setDepth(4.5);

        this.spinButton.on('pointerdown', () => {
            if (this.isSpinning) return;
            this.startSpin();
        });

        // Hiệu ứng hover cho spin button
        this.spinButton.on('pointerover', () => {
            this.tweens.add({ targets: this.spinButton, scale: 0.42, duration: 100 });
        });

        this.spinButton.on('pointerout', () => {
            this.tweens.add({ targets: this.spinButton, scale: 0.4, duration: 100 });
        });

        // 7. Đảm bảo MapScene resume khi popup tắt
        this.events.on('shutdown', this.onResumeMap, this);
    }

    closePopup() {
        this.events.off('shutdown', this.onResumeMap, this);
        this.onResumeMap();
        this.scene.stop();
    }

    onResumeMap() {
        if (this.scene.isPaused('MapScene')) {
            this.scene.resume('MapScene');
        }
    }

    /**
     * Xoay board và tất cả items theo độ xoay mới
     * @param {number} rotation - Độ xoay (độ)
     */
    rotateBoard(rotation) {
        if (this.boardContainer) {
            this.boardContainer.setRotation(rotation * (Math.PI / 180));
        }
    }

    /**
     * Lấy độ xoay hiện tại của board
     * @returns {number} Độ xoay (độ)
     */
    getBoardRotation() {
        if (this.boardContainer) {
            return this.boardContainer.rotation * (180 / Math.PI);
        }
        return 0;
    }

    /**
     * Bắt đầu quá trình quay và xác định người thắng
     */
    startSpin() {
        this.isSpinning = true;
        this.spinButton.disableInteractive();
        this.spinButton.setAlpha(0.7);

        // Hiệu ứng lắc lư cho con trỏ trong khi quay
        const pointerTween = this.tweens.add({
            targets: this.pointer,
            angle: { from: -5, to: 5 },
            duration: 100,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: 40
        });

        // Chọn item trúng thưởng ngẫu nhiên
        const winningIndex = Phaser.Math.Between(0, this.items.length - 1);
        const reward = this.items[winningIndex].getData('reward');

        // Tính toán góc quay cần đạt (độ)
        const angleStepDegrees = 360 / this.items.length;
        const winningItemInitialAngle = (winningIndex * angleStepDegrees) + this.baseRotation;
        const targetAngle = this.pointerTargetAngle;
        let finalBoardRotation = targetAngle - winningItemInitialAngle;
        finalBoardRotation += 360 * 5; // quay thêm 5 vòng

        const currentBoardAngle = this.getBoardRotation();

        this.tweens.add({
            targets: this.boardContainer,
            angle: currentBoardAngle + finalBoardRotation,
            duration: 4000,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                pointerTween.stop();
                this.pointer.setAngle(0);
                this.isSpinning = false;
                this.spinButton.setInteractive();
                this.spinButton.setAlpha(1);
                console.log('--- SPIN DONE ---');
                console.log('Reward:', reward);
            }
        });
    }
}

