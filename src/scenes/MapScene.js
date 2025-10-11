// src/scenes/MapScene.js
import Phaser from 'phaser';
import PlayerDataManager from '../managers/PlayerDataManager';

export class MapScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MapScene' });
        this.mapContainer = null;
    }

    create() {
        const { width, height } = this.scale;

        const playerData = PlayerDataManager.getProgression();

        const levelPositions = [
            { id: 1, x: 221, y: 1986 },
            { id: 2, x: 298, y: 1749 },
            { id: 3, x: 296, y: 1557 },
            { id: 4, x: 288, y: 1300 },
            { id: 5, x: 280, y: 1164 } 
        ];

        this.mapContainer = this.add.container(0, 0);

        // --- PHẦN SỬA LỖI NẰM Ở ĐÂY ---

        // Thêm map_part1 và scale nó lại
        const map1 = this.add.image(width / 2, 0, 'map_part1').setOrigin(0.5, 0);
        map1.displayWidth = width; // Bắt buộc chiều rộng của ảnh phải bằng chiều rộng của game (576px)
        map1.scaleY = map1.scaleX; // Giữ đúng tỷ lệ ảnh để không bị méo

        // Thêm map_part2, đặt nó ngay bên dưới map_part1 đã được scale
        // Dùng map1.displayHeight để lấy chiều cao mới sau khi scale
        const map2 = this.add.image(width / 2, map1.displayHeight, 'map_part2').setOrigin(0.5, 0);
        map2.displayWidth = width; // Tương tự, scale chiều rộng
        map2.scaleY = map2.scaleX; // Giữ đúng tỷ lệ

        // --- KẾT THÚC SỬA LỖI ---

        this.mapContainer.add([map1, map2]);
        // Tổng chiều cao giờ sẽ dựa trên chiều cao đã được scale
        const totalHeight = map1.displayHeight + map2.displayHeight;

        // Tạo các nút level với tọa độ chính xác
        levelPositions.forEach(level => {
            const isLocked = level.id > playerData.highestLevelUnlocked;
            
            const button = this.add.image(level.x, level.y, 'level_node_button')
                .setScale(0.2)
                .setInteractive({ useHandCursor: !isLocked });

            const levelText = this.add.text(level.x, level.y, level.id, {
                font: '48px Arial',
                fill: '#ffffff',
                stroke: '#000000',
                strokeThickness: 6
            }).setOrigin(0.5);
            
            this.mapContainer.add([button, levelText]);

            if (isLocked) {
                button.setTint(0x555555);
                levelText.setAlpha(0.7);
            } else {
                const stars = playerData.levelStars[level.id] || 0;
                const starContainer = this.add.container(level.x, level.y - 60);
                for (let i = 0; i < 3; i++) {
                    const starKey = i < stars ? 'star_on' : 'star_off';
                    const star = this.add.image((i - 1) * 35, 0, starKey).setScale(0.15);
                    starContainer.add(star);
                }
                this.mapContainer.add(starContainer);
                button.on('pointerdown', () => {
                    this.scene.start('LevelLoaderScene', { levelId: level.id });
                });
            }
        });

        this.cameras.main.setBounds(0, 0, width, totalHeight);
        
        // Mặc định cuộn xuống dưới cùng (level 1 ở dưới cùng)
        this.cameras.main.scrollY = totalHeight - height;

        // Chức năng kéo để cuộn
        this.input.on('pointermove', (pointer) => {
            if (pointer.isDown) {
                this.cameras.main.scrollY -= (pointer.y - pointer.prevPosition.y);
            }
        });

        // Chức năng cuộn bằng nút lăn chuột
        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            const scrollSpeed = 1; // Tốc độ cuộn (có thể điều chỉnh)
            this.cameras.main.scrollY += deltaY * scrollSpeed;
            
            // Giới hạn cuộn trong phạm vi cho phép
            this.cameras.main.scrollY = Phaser.Math.Clamp(
                this.cameras.main.scrollY, 
                0, 
                totalHeight - height
            );
        });
    }
}