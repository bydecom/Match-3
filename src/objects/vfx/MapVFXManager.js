// src/objects/vfx/MapVFXManager.js
import Phaser from 'phaser';

export class MapVFXManager {
    /**
     * @param {Phaser.Scene} scene
     * @param {Map<string, {image, offsetY, displayHeight}>} mapRegistry 
     */
    constructor(scene, mapRegistry) { // *** NHẬN mapRegistry ***
        /** @type {Phaser.Scene} */
        this.scene = scene;
        /** @type {Map<string, {image, offsetY, displayHeight}>} */
        this.mapRegistry = mapRegistry; // *** LƯU LẠI ***
        
        this.activeVFX = []; // Lưu trữ các đối tượng VFX đang hoạt động để dọn dẹp
        this.defaultScale = 0.4; // Scale mặc định theo yêu cầu
    }

    /**
     * Chuyển đổi tọa độ local của map part thành tọa độ world.
     * @param {string} mapKey Key của map (ví dụ: 'map_part1')
     * @param {number} localX Tọa độ X local
     * @param {number} localY Tọa độ Y local (lấy từ bản demo với 0,0 là góc trên trái map)
     * @returns {{x: number, y: number}} Tọa độ World
     */
    getWorldCoords(mapKey, localX, localY) {
        const mapInfo = this.mapRegistry.get(mapKey);
        const offsetY = mapInfo ? mapInfo.offsetY : 0;
        
        // X hiện tại không đổi, Y = Y (Offset) + Y (Local)
        return {
            x: localX,
            y: offsetY + localY 
        };
    }

    /**
     * Tạo một animation lặp lại từ một mảng các key frame (ảnh riêng lẻ).
     * @param {number} x Tọa độ X
     * @param {number} y Tọa độ Y
     * @param {string} animKey Key duy nhất cho animation này (ví dụ: 'water_ripple_anim')
     * @param {string[]} frameKeys Mảng các key của ảnh texture dùng làm frame.
     * @param {number} frameRate Tốc độ animation (frames per second).
     * @param {object} spriteConfig Cấu hình thêm cho sprite (ví dụ: { scale: 0.5, depth: 1, angle: 0 }). Scale mặc định là this.defaultScale.
     * @returns {Phaser.GameObjects.Sprite | null} Sprite đã tạo hoặc null nếu frameKeys rỗng.
     */
    createLoopingAnimationFromFrames(x, y, animKey, frameKeys, frameRate, spriteConfig = {}) {
        if (!frameKeys || frameKeys.length === 0) {
            console.warn(`Animation key "${animKey}" received empty frameKeys.`);
            return null;
        }

        // Tạo key animation nếu chưa có
        if (!this.scene.anims.exists(animKey)) {
            // Tạo frame objects từ mảng key
            const frames = frameKeys.map(key => ({ key: key }));

            this.scene.anims.create({
                key: animKey,
                frames: frames,
                frameRate: frameRate || 10,
                repeat: -1 // Lặp vô hạn
            });
            console.log(`Created animation: ${animKey} with ${frames.length} frames.`);
        }

        // Tạo sprite và chạy animation (dùng frame đầu tiên làm texture ban đầu)
        const sprite = this.scene.add.sprite(x, y, frameKeys[0])
            .play(animKey);

        // Áp dụng cấu hình sprite
        sprite.setScale(spriteConfig.scale !== undefined ? spriteConfig.scale : this.defaultScale); // Dùng scale mặc định
        if (spriteConfig.depth !== undefined) sprite.setDepth(spriteConfig.depth);
        if (spriteConfig.alpha !== undefined) sprite.setAlpha(spriteConfig.alpha);
        if (spriteConfig.angle !== undefined) sprite.setAngle(spriteConfig.angle);
        if (spriteConfig.originX !== undefined) sprite.setOrigin(spriteConfig.originX, spriteConfig.originY !== undefined ? spriteConfig.originY : spriteConfig.originX);


        this.activeVFX.push(sprite); // Thêm vào danh sách để quản lý
        return sprite;
    }

    /**
     * Tạo hiệu ứng lấp lánh xuất hiện ngẫu nhiên trong một khu vực theo định kỳ.
     * @param {Phaser.Geom.Rectangle} area Khu vực hình chữ nhật để spawn hiệu ứng.
     * @param {string} textureKey Key của ảnh lấp lánh.
     * @param {object} timerConfig Cấu hình Timer (ví dụ: { delay: 500 }).
     * @param {object} tweenConfig Cấu hình Tween cho hiệu ứng (ví dụ: { scaleFactor: 1.5, duration: 300, alpha: 1 }). scaleFactor là hệ số nhân với scale ban đầu.
     * @param {object} spriteConfig Cấu hình sprite ban đầu (ví dụ: { initialScale: 0.1, depth: 2 }). Scale mặc định là this.defaultScale.
     */
    createPeriodicSparkle(area, textureKey, timerConfig, tweenConfig, spriteConfig = {}) {
        const initialScale = spriteConfig.initialScale !== undefined ? spriteConfig.initialScale : this.defaultScale;
        const targetScaleFactor = tweenConfig.scaleFactor !== undefined ? tweenConfig.scaleFactor : 1.5; // Scale lên gấp rưỡi

        const timer = this.scene.time.addEvent({
            delay: timerConfig.delay || 500,
            callback: () => {
                const sparkleX = Phaser.Math.Between(area.x, area.x + area.width);
                const sparkleY = Phaser.Math.Between(area.y, area.y + area.height);

                const sparkle = this.scene.add.image(sparkleX, sparkleY, textureKey)
                    .setScale(initialScale)
                    .setAlpha(0)
                    .setDepth(spriteConfig.depth !== undefined ? spriteConfig.depth : 2);

                this.scene.tweens.add({
                    targets: sparkle,
                    alpha: tweenConfig.alpha !== undefined ? tweenConfig.alpha : 1,
                    scale: initialScale * targetScaleFactor, // Scale tới giá trị đích
                    duration: tweenConfig.duration || 300,
                    yoyo: true,
                    ease: tweenConfig.ease || 'Cubic.easeOut',
                    onComplete: () => {
                        sparkle.destroy();
                    }
                });
            },
            callbackScope: this,
            loop: true
        });
        this.activeVFX.push(timer); // Lưu lại timer để có thể dừng sau này
    }

    /**
     * Tạo và trả về một Particle Emitter.
     * @param {number} x Tọa độ X của emitter (hoặc dùng trong config).
     * @param {number} y Tọa độ Y của emitter (hoặc dùng trong config).
     * @param {string} textureKey Key của particle texture.
     * @param {Phaser.Types.GameObjects.Particles.ParticleEmitterConfig} config Cấu hình chi tiết cho emitter.
     * @returns {Phaser.GameObjects.Particles.ParticleEmitter} Emitter đã tạo.
     */
    createParticleEmitter(x, y, textureKey, config) {
        // Áp dụng scale mặc định cho particle nếu chưa có
         if (config.scale === undefined) {
             config.scale = this.defaultScale;
         } else if (typeof config.scale === 'object' && config.scale !== null) {
             // Nếu là object {start, end}, áp dụng scale mặc định cho cả hai nếu chưa có
             if (config.scale.start === undefined) config.scale.start = this.defaultScale;
             if (config.scale.end === undefined) config.scale.end = this.defaultScale;
         }


        const emitter = this.scene.add.particles(x, y, textureKey, config);
        if (config.depth !== undefined) {
             emitter.setDepth(config.depth);
        }
        this.activeVFX.push(emitter); // Lưu lại emitter
        return emitter;
    }

    // --- HÀM TẠO 1 HIỆU ỨNG TĨNH (hoặc có tween đơn giản) ---
    /**
     * Tạo một ảnh tĩnh hoặc ảnh có tween đơn giản (ví dụ: alpha, vị trí)
     * @param {number} x
     * @param {number} y
     * @param {string} textureKey
     * @param {object} spriteConfig Cấu hình sprite { scale, depth, alpha, angle, originX, originY }
     * @param {object | null} tweenConfig Cấu hình tween (optional). Ví dụ: { props: { alpha: 0.5 }, duration: 1000, yoyo: true, repeat: -1 }
     */
    createStaticOrTweenedImage(x, y, textureKey, spriteConfig = {}, tweenConfig = null) {
        const image = this.scene.add.image(x, y, textureKey);

        // Apply sprite config
        image.setScale(spriteConfig.scale !== undefined ? spriteConfig.scale : this.defaultScale);
        if (spriteConfig.depth !== undefined) image.setDepth(spriteConfig.depth);
        if (spriteConfig.alpha !== undefined) image.setAlpha(spriteConfig.alpha);
        if (spriteConfig.angle !== undefined) image.setAngle(spriteConfig.angle);
        if (spriteConfig.originX !== undefined) image.setOrigin(spriteConfig.originX, spriteConfig.originY !== undefined ? spriteConfig.originY : spriteConfig.originX);

        this.activeVFX.push(image);

        // Apply tween if provided
        if (tweenConfig) {
            const tween = this.scene.tweens.add({
                targets: image,
                ...tweenConfig.props, // e.g., alpha: 0.5, y: '+=10'
                duration: tweenConfig.duration || 1000,
                ease: tweenConfig.ease || 'Linear',
                yoyo: tweenConfig.yoyo !== undefined ? tweenConfig.yoyo : false,
                repeat: tweenConfig.repeat !== undefined ? tweenConfig.repeat : 0,
                delay: tweenConfig.delay || 0
            });
            // Lưu tween để dừng nếu cần, mặc dù image đã được lưu
            this.activeVFX.push(tween);
        }

        return image;
    }


    // ---------------------------------------------------
    // --- HÀM TRUNG TÂM ĐỂ KHỞI TẠO VFX CHO TẤT CẢ MAP ---
    // ---------------------------------------------------
    /**
     * Khởi tạo VFX cho tất cả các map parts đã đăng ký.
     */
    startAllMapVFX() {
        console.log("Starting All Map VFX...");
        
        // Tự động gọi hàm khởi tạo cho mỗi map part
        this.mapRegistry.forEach((mapInfo, mapKey) => {
            if (mapKey === 'map_part1') {
                this.startMapPart1VFX();
            } else if (mapKey === 'map_part2') {
                this.startMapPart2VFX();
            }
            // Thêm: else if (mapKey === 'map_part3') { this.startMapPart3VFX(); }
        });
    }

    // ---------------------------------------------------
    // --- HÀM VFX CHO MAP_PART1 (Tách ra từ hàm cũ) ---
    // ---------------------------------------------------
    startMapPart1VFX() {
        console.log("Starting Map Part 1 VFX...");
        const mapKey = 'map_part1'; // Chỉ định map key
        const { width, height } = this.scene.scale;

        // --- Tọa độ LOCAL (Lấy từ demo, 0,0 là góc trên trái của map_part1) ---
        const waterfallPos = { x: 120, y: 635 };
        const waterfallTopPos = { x: 115, y: 635 };
        const waterfallMidPos = { x: 128, y: 680 };
        const waterfallBasePos = { x: 115, y: 635 };
        const waterSurfacePos1 = { x: 115, y: 635 };
        const waterSurfacePos2 = { x: 115, y: 635 };
        const decanterSpoutPos = { x: 445, y: 622 };
        const decanterBasePos = { x: 445, y: 622 };
        const bambooPos = { x: 86, y: 205};
        const bananaTreePos = { x: width * 0.15, y: height * 1 };

        // --- Nhóm VFX Thác nước (Steam) ---

        // 1. Animation bọt nước bắn lên (4 frames)
        let coords = this.getWorldCoords(mapKey, waterfallBasePos.x, waterfallBasePos.y);
        this.createLoopingAnimationFromFrames(
            coords.x, coords.y, // Dùng tọa độ World đã tính
            'steam_water_bubbles', // Key animation
            [
                'vfx_steam_1_1_bot_nuoc',
                'vfx_steam_1_2_bot_nuoc',
                'vfx_steam_1_3_bot_nuoc',
                'vfx_steam_1_4_bot_nuoc'
            ],
            4, // Frame rate - chậm hơn
            { depth: 3 } // Cấu hình sprite
        );

        // 2. Animation mặt nước loang (vùng 1 - 4 frames)
        coords = this.getWorldCoords(mapKey, waterSurfacePos1.x, waterSurfacePos1.y);
        this.createLoopingAnimationFromFrames(
            coords.x, coords.y, // Dùng tọa độ World đã tính
            'steam_water_ripple_1',
            [
                'vfx_steam_10_mat_nuoc_loang_1',
                'vfx_steam_11_mat_nuoc_loang_1',
                'vfx_steam_mat_nuoc_loang_2', // Frame 12
                'vfx_steam_13_mat_nuoc_loang_3'
            ],
            3, // Chậm hơn
            { depth: 1 }
        );

        // 3. Animation mặt nước loang (vùng 2 - dùng frame 13 & 14)
        coords = this.getWorldCoords(mapKey, waterSurfacePos2.x, waterSurfacePos2.y);
        this.createLoopingAnimationFromFrames(
            coords.x, coords.y, // Dùng tọa độ World đã tính
            'steam_water_ripple_2',
            [
                'vfx_steam_13_mat_nuoc_loang_3',
                'vfx_steam_mat_nuoc_loang_4' // Frame 14
            ],
            2, // Chậm hơn
            { depth: 1, alpha: 0.8 } // Hơi mờ hơn
        );


        // 4. Animation nước chảy chân thác (2 frames)
        coords = this.getWorldCoords(mapKey, waterfallBasePos.x, waterfallBasePos.y);
        this.createLoopingAnimationFromFrames(
            coords.x, coords.y, // Dùng tọa độ World đã tính
            'steam_base_flow',
            [
                'vfx_steam_15_nuoc_chay_chan_thac',
                'vfx_steam_16_nuoc_chay_chan_thac'
            ],
            2, // Chậm hơn
            { depth: 2 }
        );

        // 5. Nước loang chân thác (ảnh tĩnh) - Có thể thêm tween alpha nhẹ
        coords = this.getWorldCoords(mapKey, waterfallBasePos.x, waterfallBasePos.y);
        this.createStaticOrTweenedImage(
            coords.x, coords.y, // Dùng tọa độ World đã tính
            'vfx_steam_17_nuoc_loang_chan_thac',
            { depth: 1, alpha: 0.7 },
            { props: { alpha: 0.9 }, duration: 4500, yoyo: true, repeat: -1 } // Tween alpha
        );

        // 6. Animation nước đầu ngọn thác (2 frames)
        coords = this.getWorldCoords(mapKey, waterfallTopPos.x, waterfallTopPos.y);
        this.createLoopingAnimationFromFrames(
            coords.x, coords.y, // Dùng tọa độ World đã tính
            'steam_top_flow',
            [
                'vfx_steam_3_nuoc_dau_ngon_thac',
                'vfx_steam_4_nuoc_dau_ngon_thac'
            ],
            3, // Chậm hơn
            { depth: 2 }
        );

        // 7. Giọt nước rơi từ ngọn thác (ảnh tĩnh) - Dùng Particle Emitter sẽ đẹp hơn
        // Tạm thời tạo ảnh tĩnh
        // this.createStaticOrTweenedImage(
        //     waterfallTopPos.x + 5, waterfallTopPos.y + 10,
        //     'vfx_steam_5_giot_nuoc_ngon_thac',
        //     { depth: 3 }
        // );
        // >> Thay bằng Particle Emitter cho giọt nước rơi <<
        //  this.createParticleEmitter(
        //     waterfallTopPos.x, waterfallTopPos.y, // Vị trí spawn
        //     'vfx_steam_5_giot_nuoc_ngon_thac', // Dùng ảnh giọt nước làm particle
        //     {
        //         lifespan: 800,
        //         speedY: { min: 80, max: 120 }, // Rơi xuống
        //         gravityY: 100, // Có trọng lực
        //         scale: { start: this.defaultScale, end: this.defaultScale * 0.8 }, // Nhỏ dần chút
        //         alpha: { start: 1, end: 0.5 },
        //         frequency: 300, // Tần suất rơi
        //         quantity: 1,
        //         depth: 3
        //     }
        // );


        // 8. Animation nước chảy giữa thác (4 frames)
        coords = this.getWorldCoords(mapKey, waterfallMidPos.x, waterfallMidPos.y);
        this.createLoopingAnimationFromFrames(
            coords.x, coords.y, // Dùng tọa độ World đã tính
            'steam_mid_flow',
            [
                'vfx_steam_6_nuoc_chay_giua_ngon_thac',
                'vfx_steam_7_nuoc_chay_giua_angon_thac', // Chú ý tên file có thể sai chính tả
                'vfx_steam_8_nuoc_chay_giua_ngon_thac',
                'vfx_steam_9_nuoc_chay_giua_ngon_thac'
            ],
            3, // Chậm hơn
            { depth: 2 }
        );

        // 9. Ảnh tĩnh thác nước chính (có thể là phần nền)
        coords = this.getWorldCoords(mapKey, waterfallMidPos.x, waterfallMidPos.y);
        this.createStaticOrTweenedImage(
            coords.x, coords.y, // Dùng tọa độ World đã tính
            'vfx_steam_thac_nuoc',
            { depth: 0 } // Nằm dưới cùng
        );

        // --- Thêm props bổ sung trong khu vực thác nước (steam) ---
        // Bạn có thể tự chỉnh lại tọa độ dưới đây cho phù hợp
        let extra = this.getWorldCoords(mapKey, 125, 587);
        this.createStaticOrTweenedImage(
            extra.x, extra.y,
            'steam_cay_chuoi1',
            { 
                depth: 2,
                originX: 0.5,
                originY: 1.0
            },
            {
                props: { angle: 3 },
                duration: 2500,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            }
        );

        extra = this.getWorldCoords(mapKey, 70, 727);
        this.createStaticOrTweenedImage(
            extra.x, extra.y,
            'steam_cay_chuoi2',
            { 
                depth: 2,
                originX: 0.5,
                originY: 1.0
            },
            {
                props: { angle: -4 },
                duration: 3100,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            }
        );

        extra = this.getWorldCoords(mapKey, 173, 702);
        this.createStaticOrTweenedImage(
            extra.x, extra.y,
            'steam_coc_go',
            { depth: 3 }
        );

        // 10. 4 giọt nước văng ra ngẫu nhiên quanh khu vực thác nước
        const steamDropletTextures = [
            'vfx_decanter_giot_nuoc_1',
            'vfx_decanter_giot_nuoc_2', 
            'vfx_decanter_giot_nuoc_3',
            'vfx_decanter_giot_nuoc_4'
        ];

        // Tạo timer để spawn giọt nước thác định kỳ
        const steamDropletTimer = this.scene.time.addEvent({
            delay: 800, // Spawn mỗi 800ms
            callback: () => {
                // Chọn ngẫu nhiên 1 trong 4 loại giọt nước
                const randomTexture = Phaser.Utils.Array.GetRandom(steamDropletTextures);
                
                // *** Quan trọng: Tính tọa độ World cho tâm văng ***
                const worldBasePos = this.getWorldCoords(mapKey, waterfallBasePos.x, waterfallBasePos.y);
                
                // Vị trí ngẫu nhiên quanh thác nước (trong vòng tròn bán kính 40px)
                const angle = Phaser.Math.Between(0, 360) * Math.PI / 180;
                const distance = Phaser.Math.Between(20, 100);
                const dropletX = worldBasePos.x + Math.cos(angle) * distance;
                const dropletY = worldBasePos.y + Math.sin(angle) * distance;

                // Tính hướng di chuyển từ tâm thác nước ra ngoài
                const deltaX = dropletX - worldBasePos.x; // Khoảng cách ngang từ tâm
                const deltaY = dropletY - worldBasePos.y; // Khoảng cách dọc từ tâm
                
                // Tính hướng di chuyển (bên phải chạy qua phải, bên trái chạy qua trái)
                const moveDirectionX = deltaX > 0 ? 1 : -1; // 1 = phải, -1 = trái
                const moveDistanceX = Math.abs(deltaX) * 0.5; // Di chuyển theo hướng với khoảng cách tương ứng
                const moveDistanceY = Phaser.Math.Between(30, 50); // Luôn rơi xuống

                // Tạo giọt nước
                const droplet = this.scene.add.image(dropletX, dropletY, randomTexture)
                    .setScale(this.defaultScale * Phaser.Math.Between(0.8, 2))
                    .setAlpha(0.8)
                    .setDepth(4);

                // Animation cho giọt nước: di chuyển theo hướng từ tâm ra ngoài
                this.scene.tweens.add({
                    targets: droplet,
                    x: dropletX + (moveDirectionX * moveDistanceX), // Tọa độ World
                    y: dropletY + moveDistanceY, // Tọa độ World
                    alpha: 0,
                    scale: this.defaultScale * 0.3, // Thu nhỏ dần
                    duration: Phaser.Math.Between(800, 1200), // Thời gian ngẫu nhiên
                    ease: 'Cubic.easeOut',
                    onComplete: () => {
                        droplet.destroy(); // Xóa giọt nước sau khi animation xong
                    }
                });

                this.activeVFX.push(droplet); // Thêm vào danh sách quản lý
            },
            callbackScope: this,
            loop: true
        });

        this.activeVFX.push(steamDropletTimer); // Lưu timer để có thể dừng sau này


        // --- Nhóm VFX Bình rót nước (Decanter) ---

        // 1. Ảnh tĩnh dòng nước chính
        coords = this.getWorldCoords(mapKey, decanterBasePos.x, decanterBasePos.y);
        this.createStaticOrTweenedImage(
            coords.x, coords.y, // Dùng tọa độ World đã tính
            'vfx_decanter_dong_nuoc_chinh',
            { depth: 2 }
        );

        // 1.5. Nước chảy 1 với opacity tăng giảm
        coords = this.getWorldCoords(mapKey, decanterBasePos.x, decanterBasePos.y);
        this.createStaticOrTweenedImage(
            coords.x, coords.y, // Dùng tọa độ World đã tính
            'vfx_decanter_nuoc_chay_1',
            { depth: 2.5, alpha: 0.3 }, // Bắt đầu với alpha thấp
            { props: { alpha: 1 }, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' } // Tween alpha
        );

        // 2. Animation nước chảy từ miệng bình (4 frames)
        coords = this.getWorldCoords(mapKey, decanterSpoutPos.x, decanterSpoutPos.y);
        this.createLoopingAnimationFromFrames(
            coords.x, coords.y, // Dùng tọa độ World đã tính
            'decanter_spout_flow',
            [
                'vfx_decanter_nuoc_chay_2',
                'vfx_decanter_nuoc_chay_3',
                'vfx_decanter_nuoc_chay_4'
            ],
            6, // Chậm hơn
            { depth: 3 }
        );

        // 3. 4 giọt nước văng ra ngẫu nhiên quanh khu vực bình nước
        const dropletTextures = [
            'vfx_decanter_giot_nuoc_1',
            'vfx_decanter_giot_nuoc_2', 
            'vfx_decanter_giot_nuoc_3',
            'vfx_decanter_giot_nuoc_4'
        ];

        // Tạo timer để spawn giọt nước định kỳ
        const dropletTimer = this.scene.time.addEvent({
            delay: 800, // Spawn mỗi 800ms
            callback: () => {
                // Chọn ngẫu nhiên 1 trong 4 loại giọt nước
                const randomTexture = Phaser.Utils.Array.GetRandom(dropletTextures);
                
                // *** Quan trọng: Tính tọa độ World cho tâm văng ***
                const worldBasePos = this.getWorldCoords(mapKey, decanterBasePos.x, decanterBasePos.y);
                
                // Vị trí ngẫu nhiên quanh bình nước (trong vòng tròn bán kính 40px)
                const angle = Phaser.Math.Between(0, 360) * Math.PI / 180;
                const distance = Phaser.Math.Between(20, 40);
                const dropletX = worldBasePos.x + Math.cos(angle) * distance;
                const dropletY = worldBasePos.y + Math.sin(angle) * distance;

                // Tính hướng di chuyển từ tâm bình nước ra ngoài
                const deltaX = dropletX - worldBasePos.x; // Khoảng cách ngang từ tâm
                const deltaY = dropletY - worldBasePos.y; // Khoảng cách dọc từ tâm
                
                // Tính hướng di chuyển (bên phải chạy qua phải, bên trái chạy qua trái)
                const moveDirectionX = deltaX > 0 ? 1 : -1; // 1 = phải, -1 = trái
                const moveDistanceX = Math.abs(deltaX) * 0.5; // Di chuyển theo hướng với khoảng cách tương ứng
                const moveDistanceY = Phaser.Math.Between(30, 50); // Luôn rơi xuống

                // Tạo giọt nước
                const droplet = this.scene.add.image(dropletX, dropletY, randomTexture)
                    .setScale(this.defaultScale * 1)
                    .setAlpha(0.8)
                    .setDepth(4);

                // Animation cho giọt nước: di chuyển theo hướng từ tâm ra ngoài
                this.scene.tweens.add({
                    targets: droplet,
                    x: dropletX + (moveDirectionX * moveDistanceX), // Tọa độ World
                    y: dropletY + moveDistanceY, // Tọa độ World
                    alpha: 0,
                    scale: this.defaultScale * 0.3, // Thu nhỏ dần
                    duration: Phaser.Math.Between(800, 1200), // Thời gian ngẫu nhiên
                    ease: 'Cubic.easeOut',
                    onComplete: () => {
                        droplet.destroy(); // Xóa giọt nước sau khi animation xong
                    }
                });

                this.activeVFX.push(droplet); // Thêm vào danh sách quản lý
            },
            callbackScope: this,
            loop: true
        });

        this.activeVFX.push(dropletTimer); // Lưu timer để có thể dừng sau này


        // --- Nhóm VFX Tre (Bamboo) ---

        // 1. Ảnh tĩnh cây tre (nền)
        coords = this.getWorldCoords(mapKey, bambooPos.x, bambooPos.y);
        this.createStaticOrTweenedImage(
            coords.x, coords.y, // Dùng tọa độ World đã tính
            'vfx_bambo_cay_tre',
            { depth: 3}, // Đặt origin lên trên để xoay đúng
            { props: { angle: 5 }, duration: 3000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' } // Tween góc quay
        );

        // 2. Ảnh tĩnh mặt sau trống (nền)
        coords = this.getWorldCoords(mapKey, 94, 327); // Chỉnh vị trí
        this.createStaticOrTweenedImage(
            coords.x, coords.y, // Dùng tọa độ World đã tính
            'vfx_bambo_mat_sau_quai_trong_dong',
            { depth: 2 }
        );

        // 3. Ảnh trống đung đưa nhẹ (tween angle)
        coords = this.getWorldCoords(mapKey, 90, 347); // Chỉnh vị trí
        this.createStaticOrTweenedImage(
            coords.x, coords.y, // Dùng tọa độ World đã tính
            'vfx_bambo_quai_trong_dong_1',
            { depth: 4 }
        );
        
        coords = this.getWorldCoords(mapKey, 90, 347); // Chỉnh vị trí
        this.createStaticOrTweenedImage(
            coords.x, coords.y, // Dùng tọa độ World đã tính
            'vfx_bambo_quai_trong_dong_2',
            { depth: 1 }
        );


        // --- Nhóm VFX Chuối (Banana) ---

        // 1. Cây chuối lắc lư nhẹ (tween angle) - LAYER TRÊN
        coords = this.getWorldCoords(mapKey, bananaTreePos.x, bananaTreePos.y);
        const treeSprite = this.createStaticOrTweenedImage(
            coords.x, coords.y, // Dùng tọa độ World đã tính
            'vfx_banana_cay_chuoi',
            { depth: 2, originX: 0.5, originY: 0.9 }, // Đặt origin ở gốc cây
            { props: { angle: 5 }, duration: 2500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' } // Lắc lư rõ hơn
        );

        // 2. Buồng chuối - vừa theo cây vừa lắc lư riêng - LAYER DƯỚI
        coords = this.getWorldCoords(mapKey, bananaTreePos.x + 30, bananaTreePos.y - 130); // Lệch lên trên bên phải
        const fruitSprite = this.createStaticOrTweenedImage(
            coords.x, coords.y, // Dùng tọa độ World đã tính
            'vfx_banana_buong_chuoi',
            { depth: 1, originX: 0.5, originY: 0 }, // Đặt origin lên trên
            null // Không tween ngay, sẽ tạo riêng
        );

        // Tạo tween cho quả chuối: vừa theo cây vừa lắc lư riêng
        if (fruitSprite) {
            // Tween theo chuyển động của cây (cùng góc và thời gian)
            this.scene.tweens.add({
                targets: fruitSprite,
                angle: 5, // Cùng góc với cây
                duration: 2500,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });

            // Tween lắc lư riêng của quả (góc nhỏ hơn, nhanh hơn)
            this.scene.tweens.add({
                targets: fruitSprite,
                angle: '+=3', // Lắc lư thêm ±3 độ
                duration: 1200,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
                delay: 200 // Lệch pha một chút
            });
        }


        // --- Các hiệu ứng dùng hàm cũ (nếu muốn giữ lại) ---
        // Ví dụ: Hiệu ứng lấp lánh và nút "thở"
        const level3Area = new Phaser.Geom.Rectangle(width * 0.4, height * 0.45, width * 0.2, height * 0.1);
        // Tạm thời comment vì texture 'sparkle' chưa được load
        // this.createPeriodicSparkle(
        //      level3Area,
        //     'sparkle', // Texture đã load ở Preloader
        //      { delay: 700 },
        //      { scaleFactor: 1.5, duration: 400 }, // Dùng scaleFactor
        //      { initialScale: this.defaultScale * 0.5, depth: 3 } // initialScale nhỏ hơn
        //  );

        const levelButtons = this.scene.children.list.filter(child => child.type === 'Rectangle' && child.isFilled);
        levelButtons.forEach((button, index) => {
             const tween = this.scene.tweens.add({
                 targets: button,
                 scaleX: 1.05,
                 scaleY: 1.05,
                 duration: 800,
                 yoyo: true,
                 repeat: -1,
                 ease: 'Sine.easeInOut',
                 delay: index * 200
             });
             this.activeVFX.push(tween);
         });

         const title = this.scene.children.list.find(child => child.type === 'Text' && child.text === 'Chọn Map');
         if (title) {
            const tween = this.scene.tweens.add({
                 targets: title,
                 y: title.y - 10,
                 duration: 2000,
                 yoyo: true,
                 repeat: -1,
                 ease: 'Sine.easeInOut'
             });
             this.activeVFX.push(tween);
         }

        console.log(`Created ${this.activeVFX.length} VFX elements/timers/tweens for Map Part 1.`);
    }

    // ---------------------------------------------------
    // --- HÀM MỚI CHO MAP_PART2 (VÍ DỤ) ---
    // ---------------------------------------------------
    startMapPart2VFX() {
        console.log("Starting Map Part 2 VFX...");
        const mapKey = 'map_part2';

        // Ví dụ: thêm 1 hiệu ứng lấp lánh ở gần Level 5
        // Tọa độ local của Level 5 trên map_part2 là (x: 286, y: 64) (giả sử offset là 1100)
        
        // Tạo 1 vùng lấp lánh *quanh* level 5 (tọa độ local)
        const localArea = new Phaser.Geom.Rectangle(250, 20, 100, 100); // (quanh 286, 64)
        
        // Chuyển đổi vùng local -> vùng world
        const worldTopLeft = this.getWorldCoords(mapKey, localArea.x, localArea.y);
        const worldArea = new Phaser.Geom.Rectangle(
            worldTopLeft.x,
            worldTopLeft.y,
            localArea.width,
            localArea.height
        );

        // Tạm thời comment vì 'sparkle' có thể chưa được load
        /*
        this.createPeriodicSparkle(
            worldArea, // Dùng tọa độ WORLD
            'sparkle', // Texture bạn phải load trước
            { delay: 700 },
            { scaleFactor: 1.5, duration: 400 },
            { initialScale: this.defaultScale * 0.5, depth: 15 } // Depth cao hơn để hiển thị trên map_part2
        );
        */
        
        console.log(`Added sparkle effect for Map 2 at world Y: ${worldTopLeft.y}`);
    }

    // Hàm dọn dẹp khi Scene bị shutdown
    shutdown() {
        console.log("Stopping Map Part 1 VFX...");
        // Lặp ngược để tránh lỗi khi xóa phần tử khỏi mảng đang lặp
        for (let i = this.activeVFX.length - 1; i >= 0; i--) {
            const vfx = this.activeVFX[i];
            try {
                if (vfx instanceof Phaser.Time.TimerEvent) {
                    vfx.remove();
                } else if (vfx instanceof Phaser.Tweens.Tween) {
                    // Chỉ cần dừng tween, target của nó (nếu là GO) sẽ được xử lý riêng
                     vfx.stop();
                     // Không remove target ở đây nữa
                } else if (vfx instanceof Phaser.GameObjects.Particles.ParticleEmitter) {
                    vfx.destroy(); // Emitter cần destroy
                } else if (vfx instanceof Phaser.GameObjects.GameObject && vfx.scene) {
                    // Chỉ destroy GameObject không phải là nút bấm hoặc tiêu đề
                     if (vfx.type !== 'Rectangle' && vfx.type !== 'Text') {
                         vfx.destroy();
                     }
                }
            } catch (error) {
                console.warn("Error shutting down VFX:", vfx, error);
            }
        }
        this.activeVFX = []; // Reset mảng
    }
}


