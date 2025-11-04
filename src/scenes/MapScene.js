// src/scenes/MapScene.js
import Phaser from 'phaser';
import PlayerDataManager from '../managers/PlayerDataManager';
import { MapVFXManager } from '../objects/vfx/MapVFXManager';
import { LevelNode } from '../ui/LevelNode';
import { ResourceDisplay } from '../ui/ResourceDisplay';

export class MapScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MapScene' });
        // this.mapContainer = null; // <-- BỎ DÒNG NÀY
        this.vfxManager = null;
        
        /** 
         * Sổ đăng ký map, lưu trữ thông tin vị trí của mỗi map part
         * @type {Map<string, {image: Phaser.GameObjects.Image, offsetY: number, displayHeight: number}>} 
         */
        this.mapRegistry = new Map();
    }

    /**
     * Hàm tiện ích để lấy vị trí Y bắt đầu (offset) của một map part
     * @param {string} key Key của map (ví dụ: 'map_part1')
     * @returns {number} Tọa độ Y (world) bắt đầu của map part đó
     */
    getMapOffsetY(key) {
        const mapInfo = this.mapRegistry.get(key);
        return mapInfo ? mapInfo.offsetY : 0;
    }

    create() {
        const { width, height } = this.scale;
        const playerData = PlayerDataManager.getProgression();
        const fullPlayerData = PlayerDataManager.getUserData();

        // this.mapContainer = this.add.container(0, 0); // <-- BỎ DÒNG NÀY

        // --- 1. XÂY DỰNG MAP ĐỘNG VÀ TẠO REGISTRY ---

        // *** FIX 1: Đảo ngược thứ tự. map_part2 ở trên, map_part1 ở dưới. ***
        const mapPartKeys = [
            'map_part2', // Map ở trên cùng (Offset Y = 0)
            'map_part1'  // Map ở dưới (Offset Y = map2.displayHeight)
        ]; 
        
        let currentY = 0; // Vị trí Y (world) để đặt map part tiếp theo

        mapPartKeys.forEach((key, index) => {
            const mapImage = this.add.image(width / 2, currentY, key).setOrigin(0.5, 0);
            mapImage.displayWidth = width;
            mapImage.scaleY = mapImage.scaleX; // Giữ tỷ lệ
            
            // Đặt depth để map_part2 đè lên map_part1
            if (key === 'map_part2') {
                mapImage.setDepth(10); // Depth cao để đè lên VFX của map_part1
            } else if (key === 'map_part1') {
                mapImage.setDepth(0); // Depth thấp để VFX có thể hiển thị trên nó
            }
            
            // this.mapContainer.add(mapImage); // <-- BỎ DÒNG NÀY

            // Đăng ký thông tin của map part này
            this.mapRegistry.set(key, {
                image: mapImage,
                offsetY: currentY, // Vị trí Y (world) bắt đầu
                displayHeight: mapImage.displayHeight // Chiều cao thực tế sau khi scale
            });
            
            console.log(`Map part '${key}' đã được đặt tại Y offset: ${currentY} với depth: ${mapImage.depth}`);
            // Cập nhật Y cho map part tiếp theo
            currentY += mapImage.displayHeight;
        });

        const totalHeight = currentY; // Tổng chiều cao của toàn bộ map
        console.log(`=== MAP INFO ===`);
        console.log(`Total map height: ${totalHeight}`);

        // --- 2. TẠO LEVEL NODE VỚI TỌA ĐỘ LOCAL ---
        
        // *** FIX 2: Lấy offset của map_part1 (map ở dưới cùng) ***
        const map1Offset = this.getMapOffsetY('map_part1'); 
        console.log(`Map part 'map_part1' bắt đầu tại Y: ${map1Offset}, Height: ${this.mapRegistry.get('map_part1').displayHeight}`);

        // *** Dữ liệu vị trí level MỚI (dùng tọa độ local) ***
        // Tọa độ world cũ (1164-1990) rõ ràng là thuộc về map_part1.
        // y_local = y_world_cũ - offset_của_map_part1
        
        // Lấy offset của map_part2
        const map2Offset = this.getMapOffsetY('map_part2');
        console.log(`Map part 'map_part2' bắt đầu tại Y: ${map2Offset}, Height: ${this.mapRegistry.get('map_part2').displayHeight}`);
        console.log(`=== LEVEL NODES ===`);
        
        const localLevelPositions = [
            // Map Part 1 - Level 1 đến 4
            { id: 1, mapKey: 'map_part1', x: 223, y: (1990 - map1Offset) },
            { id: 2, mapKey: 'map_part1', x: 297, y: (1752 - map1Offset) },
            { id: 3, mapKey: 'map_part1', x: 296, y: (1563 - map1Offset) },
            { id: 4, mapKey: 'map_part1', x: 286, y: (1164 - map1Offset) }, // Level 4 lên vị trí cũ của level 5
            
            // Map Part 2 - Level 5 đến 9
            { id: 5, mapKey: 'map_part2', x: 215, y: (900 - map2Offset) },
            { id: 6, mapKey: 'map_part2', x: 310, y: (730 - map2Offset) },
            { id: 7, mapKey: 'map_part2', x: 295, y: (520 - map2Offset) },
            { id: 8, mapKey: 'map_part2', x: 320, y: (350 - map2Offset) },
            { id: 9, mapKey: 'map_part2', x: 362, y: (180 - map2Offset) }
        ];

        localLevelPositions.forEach(level => {
            const isLocked = level.id > playerData.highestLevelUnlocked;
            const stars = playerData.levelStars[level.id] || 0;
            
            // *** TÍNH TOÁN TỌA ĐỘ WORLD ***
            const mapOffsetY = this.getMapOffsetY(level.mapKey);
            const worldX = level.x; // X không đổi
            const worldY = mapOffsetY + level.y; // Y (World) = Y (Offset) + Y (Local)
            
            console.log(`Level ${level.id} (${level.mapKey}): Local Y=${level.y}, Map Offset=${mapOffsetY}, World Y=${worldY}, Locked=${isLocked}`);
            
            const levelNode = new LevelNode(this, worldX, worldY, level.id, isLocked, stars);
            
            // Đặt depth cho LevelNode dựa trên map
            // Map_part1 (depth 0): LevelNode depth 5
            // Map_part2 (depth 10): LevelNode depth 15 để hiển thị trên map_part2
            if (level.mapKey === 'map_part2') {
                levelNode.setDepth(15);
            } else {
                levelNode.setDepth(5);
            }
            
            // *** SỬA Ở ĐÂY: Thêm levelNode trực tiếp vào Scene ***
            // Giả sử LevelNode là một GameObject, dùng this.add.existing
            this.add.existing(levelNode); 
            // this.mapContainer.add(levelNode); // <-- THAY DÒNG NÀY
        });

        // --- 3. CAMERA VÀ INPUT ---
        this.cameras.main.setBounds(0, 0, width, totalHeight);
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

        // --- 4. KHỞI TẠO VFX VỚI HỆ THỐNG MAPPING ---
        
        // *** Truyền mapRegistry cho VFXManager ***
        this.vfxManager = new MapVFXManager(this, this.mapRegistry); 
        
        // Khởi tạo VFX cho TẤT CẢ các map
        this.vfxManager.startAllMapVFX();
        
        // --- 5. TẠO UI OVERLAY HIỂN THỊ COIN VÀ HEART ---
        
        // Tạo ResourceDisplay ở góc trên bên trái màn hình
        this.resourceDisplay = new ResourceDisplay(this, 20, 20, fullPlayerData);
        
        // --- 6. TẠO NÚT SPIN VÀ STORE ---
        // Vị trí (góc dưới bên trái và dưới bên phải)
        const iconScale = 1; // Tùy chỉnh scale của icon
        const iconDepth = 1000; // Đặt depth cao để nổi lên trên

        // Tạo nút Spin (Vòng quay) - Góc dưới bên trái
        const spinButton = this.add.image(50, 120, 'spin')
            .setScale(iconScale)
            .setInteractive({ useHandCursor: true })
            .setDepth(iconDepth)
            .setScrollFactor(0); // <-- Đây là chìa khóa để "dính" vào màn hình

        spinButton.on('pointerdown', () => {
            console.log('Spin button clicked!');
            this.scene.launch('SpinPopup');
        });

        // Tạo nút Store (Cửa hàng) - Góc dưới bên phải
        const storeButton = this.add.image(50, 190, 'store')
            .setScale(iconScale)
            .setInteractive({ useHandCursor: true })
            .setDepth(iconDepth)
            .setScrollFactor(0); // <-- Đây là chìa khóa để "dính" vào màn hình

        storeButton.on('pointerdown', () => {
            console.log('Store button clicked!');
            this.scene.launch('ShopPopup');
        });

        // (Tùy chọn) Thêm hiệu ứng hover giống nút settings
        [spinButton, storeButton].forEach(button => {
            button.on('pointerover', () => {
                this.tweens.add({ targets: button, scale: iconScale * 1.1, duration: 100 });
            });

            button.on('pointerout', () => {
                this.tweens.add({ targets: button, scale: iconScale, duration: 100 });
            });
        });
        
        // Dọn dẹp VFX khi scene shutdown
        this.events.once('shutdown', () => {
            if (this.vfxManager) {
                this.vfxManager.shutdown();
            }
        });
    }
}