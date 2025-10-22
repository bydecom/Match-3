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

        // --- 2. TẠO LEVEL NODE VỚI TỌA ĐỘ LOCAL ---
        
        // *** FIX 2: Lấy offset của map_part1 (map ở dưới cùng) ***
        const map1Offset = this.getMapOffsetY('map_part1'); 
        console.log(`Map part 'map_part1' (map đáy) bắt đầu tại Y: ${map1Offset}`);

        // *** Dữ liệu vị trí level MỚI (dùng tọa độ local) ***
        // Tọa độ world cũ (1164-1990) rõ ràng là thuộc về map_part1.
        // y_local = y_world_cũ - offset_của_map_part1
        const localLevelPositions = [
            // *** FIX 3: Gán các level này cho 'map_part1' và trừ đi 'map1Offset' ***
            { id: 1, mapKey: 'map_part1', x: 223, y: (1990 - map1Offset) },
            { id: 2, mapKey: 'map_part1', x: 297, y: (1752 - map1Offset) },
            { id: 3, mapKey: 'map_part1', x: 296, y: (1563 - map1Offset) },
            { id: 4, mapKey: 'map_part1', x: 288, y: (1300 - map1Offset) },
            { id: 5, mapKey: 'map_part1', x: 286, y: (1164 - map1Offset) }

            // Ví dụ: Nếu bạn có level 6 trên map_part2 (map ở trên)
            // const map2Offset = this.getMapOffsetY('map_part2'); // Sẽ là 0
            // { id: 6, mapKey: 'map_part2', x: 300, y: (500 - map2Offset) } // y_local = 500
        ];

        localLevelPositions.forEach(level => {
            const isLocked = level.id > playerData.highestLevelUnlocked;
            const stars = playerData.levelStars[level.id] || 0;
            
            // *** TÍNH TOÁN TỌA ĐỘ WORLD ***
            const mapOffsetY = this.getMapOffsetY(level.mapKey);
            const worldX = level.x; // X không đổi
            const worldY = mapOffsetY + level.y; // Y (World) = Y (Offset) + Y (Local)
            
            const levelNode = new LevelNode(this, worldX, worldY, level.id, isLocked, stars);
            
            // Đặt depth cho LevelNode để hiển thị trên map_part1 nhưng dưới map_part2
            levelNode.setDepth(5);
            
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
        
        
        // Dọn dẹp VFX khi scene shutdown
        this.events.once('shutdown', () => {
            if (this.vfxManager) {
                this.vfxManager.shutdown();
            }
        });
    }
}