// src/objects/vfx/PowerupVFXManager.js

export class PowerupVFXManager {
  constructor(scene, vfxLayer = null) {
    this.scene = scene;
    this.vfxLayer = vfxLayer; // Layer riêng cho VFX (không có mask)
  }
  
  /**
   * Helper: Add sprite vào vfxLayer (nếu có) hoặc scene
   */
  addVFXSprite(x, y, texture) {
    if (this.vfxLayer) {
      return this.vfxLayer.add(this.scene.add.sprite(x, y, texture));
    }
    return this.scene.add.sprite(x, y, texture);
  }
  
  addVFXImage(x, y, texture) {
    if (this.vfxLayer) {
      return this.vfxLayer.add(this.scene.add.image(x, y, texture));
    }
    return this.scene.add.image(x, y, texture);
  }
  
  addVFXCircle(x, y, radius, fillColor, fillAlpha) {
    if (this.vfxLayer) {
      return this.vfxLayer.add(this.scene.add.circle(x, y, radius, fillColor, fillAlpha));
    }
    return this.scene.add.circle(x, y, radius, fillColor, fillAlpha);
  }
  
  addVFXGraphics() {
    if (this.vfxLayer) {
      return this.vfxLayer.add(this.scene.add.graphics());
    }
    return this.scene.add.graphics();
  }
  
  /**
   * Helper: Tắt mask của gemLayer để VFX zoom to không bị cắt
   * @returns originalMask để khôi phục sau
   */
  disableGemLayerMask() {
    const gemLayer = this.scene.gemLayer;
    if (!gemLayer) return null;
    const originalMask = gemLayer.mask;
    gemLayer.clearMask();
    return originalMask;
  }
  
  /**
   * Helper: Khôi phục mask của gemLayer
   */
  restoreGemLayerMask(originalMask) {
    const gemLayer = this.scene.gemLayer;
    if (originalMask && gemLayer) {
      gemLayer.setMask(originalMask);
    }
  }

  /**
   * Hiệu ứng cho Bomb (Match 4)
   * @param {object} bombGem - Đối tượng gem Bomb
   * @param {Set<object>} affectedGems - Set các gem bị ảnh hưởng bởi vụ nổ
   * @param {function} onComplete - Callback để gọi khi animation kết thúc
   */
  playBombEffect(bombGem, affectedGems, onComplete) {
    const bombSprite = bombGem.sprite;

    // 1. Phóng to và rung nhẹ
    const layerMask = this.disableGemLayerMask(); // TẮT MASK CỦA LAYER
    this.scene.tweens.add({
      targets: bombSprite,
      scale: bombSprite.scale * 3, // Phóng to gấp 3 lần kích thước hiện tại
      duration: 200,
      ease: 'Quad.easeOut',
      yoyo: true, // Tự động thu nhỏ lại
      onStart: () => {
        // Đặt depth rất cao để bomb đè lên trên blocker (blocker depth = 4)
        bombSprite.setDepth(50);
        // Rung camera một chút để tạo cảm giác mạnh
        this.scene.game.events.emit('screenShake', { duration: 100, intensity: 0.005 });
      },
      onComplete: () => {
        // Trả lại depth ban đầu và khôi phục mask
        bombSprite.setDepth(2);
        this.restoreGemLayerMask(layerMask); // KHÔI PHỤC MASK CỦA LAYER
        if (onComplete) onComplete(); // Gọi callback để board tiếp tục logic
      }
    });

    // 2. Rung các gem bị ảnh hưởng (KHÔNG xóa sprite)
    affectedGems.forEach(gem => {
      if (gem !== bombGem) { // Không áp dụng hiệu ứng này cho chính quả bomb
        this.scene.tweens.add({
          targets: gem.sprite,
          angle: { from: -10, to: 10 },
          duration: 80,
          delay: 50,
          yoyo: true,
          repeat: 2,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            if (gem.sprite && gem.sprite.active) gem.sprite.setAngle(0);
          }
        });
      }
    });
  }

  /**
   * Hiệu ứng cho Color Bomb (Match 5)
   * @param {object} colorBombGem - Đối tượng gem Color Bomb
   * @param {Set<object>} affectedGems - Set các gem cùng màu bị hút
   * @param {function} onComplete - Callback
   */
  playColorBombEffect(colorBombGem, affectedGems, onComplete) {
    const colorBombSprite = colorBombGem.sprite;
    const targetPos = { x: colorBombSprite.x, y: colorBombSprite.y };

    // === PHẦN SỬA LỖI QUAN TRỌNG NHẤT ===
    // Tạo một Set mới không chứa chính colorBombGem để truyền xuống hàm hút.
    const gemsToSuck = new Set(affectedGems);
    gemsToSuck.delete(colorBombGem); // Loại bỏ chính nó ra khỏi danh sách bị hút

    // 1. Phóng to và lắc lư
    const layerMask = this.disableGemLayerMask(); // TẮT MASK CỦA LAYER
    this.scene.tweens.chain({
      targets: colorBombSprite,
      onStart: () => {
        colorBombSprite.setDepth(50); // Depth cao để đè lên blocker
        this.scene.game.events.emit('screenShake', { duration: 150, intensity: 0.003 });
      },
      tweens: [
        {
          scale: colorBombSprite.scale * 3,
          duration: 400,
          ease: 'Quad.easeOut'
        },
        {
          angle: 5,
          duration: 100,
          ease: 'Sine.easeInOut',
          yoyo: true,
          repeat: 2
        }
      ],
      onComplete: () => {
        // 2. Bắt đầu hút các gem (sử dụng Set đã được lọc)
        this.startSuckingGems(gemsToSuck, targetPos, () => {
          // Sau khi hút xong, trả lại depth, khôi phục mask và gọi callback cuối cùng
          colorBombSprite.setDepth(2);
          this.restoreGemLayerMask(layerMask); // KHÔI PHỤC MASK CỦA LAYER
          if (onComplete) onComplete();
        });
      }
    });
  }

  startSuckingGems(affectedGems, targetPos, onComplete) {
    const totalGems = affectedGems.size;

    if (totalGems === 0) {
        if (onComplete) onComplete();
        return;
    }

    let maxDelay = 0;
    const duration = 500; // Thời gian hút

    // Tạo animation hút cho tất cả các gem
    affectedGems.forEach(gem => {
        const delay = Math.random() * 200 + 100;
        if (delay > maxDelay) {
            maxDelay = delay;
        }

        this.scene.tweens.add({
            targets: gem.sprite,
            x: targetPos.x,
            y: targetPos.y,
            scale: 0,
            alpha: 0,
            duration: duration,
            delay: delay,
            ease: 'Cubic.easeIn',
        });
    });

    // === PHẦN SỬA LỖI NẰM Ở ĐÂY ===

    // 1. Tính toán tổng thời gian cần thiết cho tất cả các gem bay vào
    const totalAnimationTime = duration + maxDelay;
    
    // 2. Định nghĩa thời gian chờ SAU KHI hút xong
    const pauseAfterSuck = 300; // << Giảm từ 300ms xuống 150ms để nhanh hơn

    // 3. Gọi callback cuối cùng SAU KHI animation kết thúc VÀ đã chờ xong
    this.scene.time.delayedCall(totalAnimationTime + pauseAfterSuck, () => {
        if (onComplete) onComplete();
    });
  }

  // << THÊM HÀM MỚI NÀY VÀO CUỐI CLASS >>
  // << THAY THẾ TOÀN BỘ HÀM NÀY >>
  /**
   * Hiệu ứng cho COMBO Bomb + Bomb (Nổ 5x5)
   * @param {object} selectedBomb - Quả bomb được chọn ban đầu (sẽ phóng to)
   * @param {object} targetBomb - Quả bomb ở vị trí đích (sẽ bay vào)
   * @param {Set<object>} affectedGems - Set các gem bị ảnh hưởng bởi vụ nổ
   * @param {function} onComplete - Callback
   */
  playDoubleBombEffect(selectedBomb, targetBomb, affectedGems, onComplete) {
    const selectedSprite = selectedBomb.sprite
    const targetSprite = targetBomb.sprite

    // --- LOGIC ĐÃ ĐƯỢC ĐẢO NGƯỢC ---

    // 1. Quả bom ở vị trí đích (target) bay vào quả bom được chọn (selected)
    this.scene.tweens.add({
      targets: targetSprite,
      x: selectedSprite.x,
      y: selectedSprite.y,
      duration: 200, // Tăng nhẹ thời gian bay
      ease: 'Quad.easeIn',
      onComplete: () => {
        // Sau khi bay vào, làm nó biến mất
        targetSprite.setVisible(false)
      }
    })

    // 2. Quả bom được chọn (selected) phóng to ra để tạo vụ nổ
    const layerMask9 = this.disableGemLayerMask(); // TẮT MASK CỦA LAYER
    
    this.scene.tweens.add({
      targets: selectedSprite,
      scale: selectedSprite.scale * 4.5, // Phóng to hơn một chút
      alpha: { from: 1, to: 0.5 },
      duration: 350, // << Tăng thời gian phóng to
      delay: 150,    // Tăng nhẹ delay
      ease: 'Quad.easeOut',
      onStart: () => {
        selectedSprite.setDepth(50) // Depth cao để đè lên blocker
        this.scene.game.events.emit('screenShake', { duration: 300, intensity: 0.015 }) // Rung mạnh và lâu hơn
      },
      onComplete: () => {
        this.restoreGemLayerMask(layerMask9); // KHÔI PHỤC MASK CỦA LAYER
        // Tạo hiệu ứng sóng lan tỏa từ trung tâm của quả bom được chọn
        this.createExplosionWave(selectedSprite.x, selectedSprite.y, onComplete)
      }
    })

    // 3. Rung các gem bị ảnh hưởng (KHÔNG xóa sprite)
    affectedGems.forEach(gem => {
      if (gem !== selectedBomb && gem !== targetBomb) {
        this.scene.tweens.add({
          targets: gem.sprite,
          angle: { from: -10, to: 10 },
          duration: 80,
          delay: 250 + Math.random() * 200,
          yoyo: true,
          repeat: 2,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            if (gem.sprite && gem.sprite.active) gem.sprite.setAngle(0);
          }
        })
      }
    })
  }

  // << THÊM CẢ HÀM HELPER NÀY VÀO >>
  // Hàm này dùng để vẽ vòng tròn sóng nổ lan ra
  createExplosionWave(x, y, onComplete) {
    const wave = this.addVFXCircle(x, y, this.scene.board.cellSize * 0.5, 0xffffff, 0.7)
    wave.setStrokeStyle(4, 0xFFD700)
    wave.setDepth(9)

    this.scene.tweens.add({
      targets: wave,
      radius: this.scene.board.cellSize * 2.5, // Lan rộng ra đúng 5x5
      alpha: 0,
      duration: 350,
      ease: 'Quad.easeOut',
      onComplete: () => {
        wave.destroy()
        if (onComplete) onComplete()
      }
    })
  }

  playStripeEffect(stripeGem, affectedGems, onComplete) {
    const stripeSprite = stripeGem.sprite;
    if (!stripeSprite || !stripeSprite.active) {
      if (onComplete) onComplete();
      return;
    }
    const startPos = { x: stripeSprite.x, y: stripeSprite.y };
    const stripeRow = stripeSprite.getData('row');

    // 1. Đưa "tù và" lên lớp trên cùng và thực hiện hiệu ứng
    const originalDepth = stripeSprite.depth;
    const layerMask3 = this.disableGemLayerMask(); // TẮT MASK CỦA LAYER
    stripeSprite.setDepth(20); // Đưa lên trên các nốt nhạc (depth 15)

    this.scene.tweens.add({
      targets: stripeSprite,
      scale: stripeSprite.scale * 1.5,
      duration: 200,
      ease: 'Quad.easeOut',
      yoyo: true, // Tự động quay về scale cũ
      onComplete: () => {
          // Trả lại depth ban đầu và khôi phục mask sau khi hiệu ứng kết thúc
          this.scene.time.delayedCall(1200, () => {
              if (stripeSprite && stripeSprite.active) {
                stripeSprite.setDepth(originalDepth);
                this.restoreGemLayerMask(layerMask3); // KHÔI PHỤC MASK CỦA LAYER
              }
          });
      }
    });
    this.scene.tweens.add({
      targets: stripeSprite,
      angle: { from: -5, to: 5 },
      duration: 150,
      yoyo: true,
      repeat: 4,
      delay: 100
    });
    
    // 2. Xác định hướng
    const isHorizontal = Array.from(affectedGems).some(g => g.sprite.getData('row') === stripeRow && g !== stripeGem);
    const noteKeys = Phaser.Utils.Array.Shuffle(['note1', 'note2', 'note3', 'note4', 'note1', 'note2', 'note3', 'note4']);

    // --- Hàm trợ giúp tạo sóng âm ---
    const createNoteWave = (directionVector) => {
        for (let i = 0; i < 4; i++) {
            const noteKey = noteKeys.pop();
            if (!noteKey) continue;

            const note = this.addVFXImage(startPos.x, startPos.y, noteKey)
                .setScale(0.4)
                .setDepth(15) // Nốt nhạc ở dưới "tù và" (depth 20)
                .setAlpha(0.9);

            // 3. Nốt nhạc bay chậm hơn
            const travelDuration = Phaser.Math.Between(1200, 1500); // Tăng thời gian bay
            const maxDistance = this.scene.board.cellSize * (4 + Math.random() * 2);
            const offset = (Math.random() - 0.5) * this.scene.board.cellSize * 0.8;

            this.scene.tweens.add({
                targets: note,
                x: startPos.x + directionVector.x * maxDistance + (isHorizontal ? 0 : offset),
                y: startPos.y + directionVector.y * maxDistance + (isHorizontal ? offset : 0),
                alpha: 0,
                scale: 1.1,
                duration: travelDuration,
                delay: i * 100, // Các nốt nhạc xuất hiện nối đuôi nhau
                ease: 'Quad.easeOut',
                onComplete: () => note.destroy()
            });
        }
    };
    // --- Kết thúc hàm trợ giúp ---

    if (isHorizontal) {
        createNoteWave({ x: 1, y: 0 });
        createNoteWave({ x: -1, y: 0 });
    } else {
        createNoteWave({ x: 0, y: 1 });
        createNoteWave({ x: 0, y: -1 });
    }

    affectedGems.forEach(gem => {
        if (!gem || !gem.sprite || !gem.sprite.active || gem === stripeGem) return;
        const gemSprite = gem.sprite;
        const distance = Phaser.Math.Distance.Between(startPos.x, startPos.y, gemSprite.x, gemSprite.y);
        const effectDelay = distance * 4; // Tăng delay để khớp với tốc độ nốt nhạc chậm hơn

        this.scene.time.delayedCall(effectDelay, () => {
             if (!gemSprite.active) return;
             // Chỉ rung, KHÔNG xóa sprite (xóa sẽ do onVFXComplete xử lý sau)
             this.scene.tweens.add({
                 targets: gemSprite,
                 angle: { from: -15, to: 15 },
                 duration: 100,
                 yoyo: true,
                 repeat: 2,
                 onComplete: () => {
                   // Trả lại angle về 0
                   if (gemSprite && gemSprite.active) gemSprite.setAngle(0);
                 }
             });
        });
    });

    // 4. Kéo dài thời gian chờ trước khi gọi onComplete
    this.scene.time.delayedCall(1500, onComplete);
  }

  /**
   * Hiệu ứng cho COMBO Color Bomb + Stripe (Dàn dựng theo 3 bước)
   * @param {object} colorBombGem - Quả color bomb
   * @param {object} stripeGem - Quả stripe
   * @param {Set<object>} gemsToTransform - Set các gem CÙNG MÀU MỤC TIÊU (sẽ bị hút và biến hình)
   * @param {Set<object>} affectedGems - Set TẤT CẢ gem bị ảnh hưởng (bao gồm cả gemsToTransform và các gem trên hàng/cột)
   * @param {function} onComplete - Callback
   */
  playColorBombStripeComboEffect(colorBombGem, stripeGem, gemsToTransform, affectedGems, onComplete) {
    if (!colorBombGem || !colorBombGem.sprite || !stripeGem || !stripeGem.sprite) {
      if (onComplete) onComplete()
      return
    }

    const colorBombSprite = colorBombGem.sprite
    const stripeSprite = stripeGem.sprite
    const centerPos = { x: colorBombSprite.x, y: colorBombSprite.y }

    // --- HIỆU ỨNG MỞ ĐẦU ---
    // 1. Stripe bay vào Color Bomb
    this.scene.tweens.add({
      targets: stripeSprite,
      x: centerPos.x,
      y: centerPos.y,
      scale: stripeSprite.scale * 0.5,
      alpha: 0,
      duration: 250,
      ease: 'Quad.easeIn',
      onComplete: () => stripeSprite.setVisible(false)
    })

    // 2. Color Bomb rung lắc và phóng to (chuẩn bị hút)
    const layerMask2 = this.disableGemLayerMask(); // TẮT MASK CỦA LAYER
    this.scene.tweens.add({
      targets: colorBombSprite,
      scale: colorBombSprite.scale * 3,
      duration: 400,
      ease: 'Quad.easeOut',
      onStart: () => {
        colorBombSprite.setDepth(50) // Depth cao để đè lên blocker
        this.scene.game.events.emit('screenShake', { duration: 300, intensity: 0.005 })
      },
      onComplete: () => {
        this.restoreGemLayerMask(layerMask2); // KHÔI PHỤC MASK CỦA LAYER
      }
    })

    // 3. Lưu lại vị trí gốc của các gem sẽ bị hút
    const originalPositions = new Map()
    gemsToTransform.forEach(gem => {
      if (gem && gem.sprite) {
        originalPositions.set(gem, {
          x: gem.sprite.x,
          y: gem.sprite.y,
          scale: gem.sprite.scale
        })
      }
    })

    // Xóa chính 2 quả combo khỏi danh sách hút
    gemsToTransform.delete(colorBombGem)
    gemsToTransform.delete(stripeGem)

    // --- BƯỚC 1: HÚT GEM VÀO ---
    let maxSuckDelay = 0
    const suckDuration = 500
    let gemsSuckedCount = 0
    const totalGemsToSuck = gemsToTransform.size

    if (totalGemsToSuck === 0) {
      affectedGems.forEach(gem => {
        if (gem && gem.sprite) {
          this.scene.tweens.add({ targets: gem.sprite, scale: 0, alpha: 0, duration: 200, delay: 600 })
        }
      })
      this.scene.time.delayedCall(600, onComplete)
      return
    }

    gemsToTransform.forEach(gem => {
      if (!gem || !gem.sprite || !gem.sprite.active) {
        gemsSuckedCount++
        return
      }

      const delay = Math.random() * 200 + 100
      if (delay > maxSuckDelay) maxSuckDelay = delay

      this.scene.tweens.add({
        targets: gem.sprite,
        x: centerPos.x,
        y: centerPos.y,
        scale: 0,
        alpha: 0.5,
        duration: suckDuration,
        delay,
        ease: 'Cubic.easeIn',
        onComplete: () => {
          gemsSuckedCount++
          if (gemsSuckedCount === totalGemsToSuck) {
            // BẮT ĐẦU BƯỚC 2: truyền centerPos để bay ngược ra từ tâm
            this.startSpitBackStripes(gemsToTransform, originalPositions, affectedGems, centerPos, onComplete)
          }
        }
      })
    })
  }

  /**
   * [HELPER] Bước 2 & 3: Nhả gem về, biến hình và kích hoạt VFX nốt nhạc
   */
  startSpitBackStripes(gemsToSpit, originalPositions, affectedGems, centerPos, onComplete) {
    let maxSpitDelay = 0
    const spitDuration = 400
    let gemsSpitCount = 0
    const totalGemsToSpit = gemsToSpit.size

    gemsToSpit.forEach(gem => {
      if (!gem || !gem.sprite) {
        gemsSpitCount++
        return
      }

      const oldPos = originalPositions.get(gem)
      if (!oldPos) {
        gemsSpitCount++
        return
      }

      const delay = Math.random() * 150
      if (delay > maxSpitDelay) maxSpitDelay = delay

      // Đặt gem ở tâm (nơi bị hút vào), đổi texture và bắt đầu với scale nhỏ
      gem.sprite.setPosition(centerPos.x, centerPos.y)
      gem.sprite.setTexture('gem_stripe')
      gem.sprite.setAlpha(1)
      gem.sprite.setScale(oldPos.scale * 0.5)
      this.scene.tweens.add({
        targets: gem.sprite,
        x: oldPos.x,
        y: oldPos.y,
        scale: oldPos.scale,
        duration: spitDuration,
        delay,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          if (gem.sprite && gem.sprite.active) {
            const isHorizontal = Phaser.Math.RND.pick([true, false])
            this.playStripeNoteWave(gem.sprite, isHorizontal)
          }
          gemsSpitCount++
          if (gemsSpitCount === totalGemsToSpit) {
            this.finishComboDestruction(affectedGems, onComplete)
          }
        }
      })
    })
  }

  /**
   * [HELPER] Bước 4 & 5: Rung gem và gọi onComplete (KHÔNG xóa sprite)
   */
  finishComboDestruction(affectedGems, onComplete) {
    // Chỉ rung gem, KHÔNG xóa sprite (xóa sẽ do onVFXComplete xử lý)
    affectedGems.forEach(gem => {
      if (!gem || !gem.sprite || !gem.sprite.active) return
      const delay = 500 + Math.random() * 200
      this.scene.tweens.add({
        targets: gem.sprite,
        angle: { from: -15, to: 15 },
        duration: 100,
        yoyo: true,
        repeat: 2,
        delay,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          if (gem.sprite && gem.sprite.active) gem.sprite.setAngle(0);
        }
      })
    })
    // Delay ngắn hơn vì không cần chờ animation scale/alpha
    this.scene.time.delayedCall(900, onComplete)
  }

  /**
   * [HELPER] Tạo sóng nốt nhạc bay ra từ 1 stripe (không phá gem)
   */
  playStripeNoteWave(stripeSprite, isHorizontal) {
    if (!stripeSprite || !stripeSprite.active) return

    const startPos = { x: stripeSprite.x, y: stripeSprite.y }
    const noteKeys = Phaser.Utils.Array.Shuffle(['note1', 'note2', 'note3', 'note4', 'note1', 'note2', 'note3', 'note4'])

    const createNoteWave = (directionVector) => {
      for (let i = 0; i < 4; i++) {
        const noteKey = noteKeys.pop()
        if (!noteKey) continue

        const note = this.addVFXImage(startPos.x, startPos.y, noteKey)
          .setScale(0.4)
          .setDepth(15)
          .setAlpha(0.9)

        const travelDuration = Phaser.Math.Between(1200, 1500)
        const maxDistance = this.scene.board.cellSize * (4 + Math.random() * 2)
        const offset = (Math.random() - 0.5) * this.scene.board.cellSize * 0.8

        this.scene.tweens.add({
          targets: note,
          x: startPos.x + directionVector.x * maxDistance + (isHorizontal ? 0 : offset),
          y: startPos.y + directionVector.y * maxDistance + (isHorizontal ? offset : 0),
          alpha: 0,
          scale: 1.1,
          duration: travelDuration,
          delay: i * 100,
          ease: 'Quad.easeOut',
          onComplete: () => note.destroy()
        })
      }
    }

    if (isHorizontal) {
      createNoteWave({ x: 1, y: 0 })
      createNoteWave({ x: -1, y: 0 })
    } else {
      createNoteWave({ x: 0, y: 1 })
      createNoteWave({ x: 0, y: -1 })
    }

    const originalDepth = stripeSprite.depth
    const layerMask4 = this.disableGemLayerMask(); // TẮT MASK CỦA LAYER
    stripeSprite.setDepth(20)
    this.scene.tweens.add({
      targets: stripeSprite,
      scale: stripeSprite.scale * 1.5,
      duration: 200,
      ease: 'Quad.easeOut',
      yoyo: true,
      onComplete: () => {
        this.scene.time.delayedCall(1200, () => {
          if (stripeSprite && stripeSprite.active) {
            stripeSprite.setDepth(originalDepth);
            this.restoreGemLayerMask(layerMask4); // KHÔI PHỤC MASK CỦA LAYER
          }
        })
      }
    })
    this.scene.tweens.add({
      targets: stripeSprite,
      angle: { from: -5, to: 5 },
      duration: 150,
      yoyo: true,
      repeat: 4,
      delay: 600
    })
  }

  /**
   * [VFX MỚI] Hiệu ứng cho COMBO Stripe + Stripe (Dấu + rộng 1 ô)
   * @param {object} stripe1_tam_gem - Stripe ở "vị trí 2" (tâm)
   * @param {object} stripe2_bayvao_gem - Stripe ở "vị trí 1" (bay vào)
   * @param {Set<object>} affectedGems - Set các gem bị ảnh hưởng
   * @param {function} onComplete - Callback
   */
  playDoubleStripeEffect(stripe1_tam_gem, stripe2_bayvao_gem, affectedGems, onComplete) {
    const stripe1_tam = stripe1_tam_gem.sprite
    const stripe2_bayvao = stripe2_bayvao_gem.sprite
    if (!stripe1_tam || !stripe2_bayvao) { if (onComplete) onComplete(); return }
    const centerPos = { x: stripe1_tam.x, y: stripe1_tam.y }
    const impactDelay = 200

    // 1) Stripe 2 bay vào Stripe 1
    this.scene.tweens.add({
      targets: stripe2_bayvao,
      x: centerPos.x,
      y: centerPos.y,
      scale: stripe2_bayvao.scale * 0.5,
      alpha: 0,
      duration: impactDelay,
      ease: 'Quad.easeIn',
      onComplete: () => stripe2_bayvao.setVisible(false)
    })

    // 2) Stripe 1 phóng to (chiêng) và rung (tù và)
    const layerMask5 = this.disableGemLayerMask(); // TẮT MASK CỦA LAYER
    this.scene.tweens.add({
      targets: stripe1_tam,
      scale: stripe1_tam.scale * 4.5,
      alpha: { from: 1, to: 0.5 },
      duration: 350,
      delay: impactDelay - 50,
      ease: 'Quad.easeOut',
      onStart: () => {
        stripe1_tam.setDepth(50) // Depth cao để đè lên blocker
        this.scene.game.events.emit('screenShake', { duration: 300, intensity: 0.015 })
      },
      onComplete: () => {
        this.restoreGemLayerMask(layerMask5); // KHÔI PHỤC MASK CỦA LAYER
      }
    })

    // 3) Kích hoạt nốt nhạc theo hai hướng
    this.scene.time.delayedCall(impactDelay, () => {
      if (stripe1_tam && stripe1_tam.active) {
        this.playStripeNoteWave(stripe1_tam, true)
        this.playStripeNoteWave(stripe1_tam, false)
      }
    })

    // 4) Rung gem (KHÔNG xóa sprite - xóa sẽ do onVFXComplete xử lý)
    affectedGems.forEach(gem => {
      if (!gem || !gem.sprite || !gem.sprite.active) return
      if (gem === stripe1_tam_gem || gem === stripe2_bayvao_gem) return
      const gemSprite = gem.sprite
      const distance = Phaser.Math.Distance.Between(centerPos.x, centerPos.y, gemSprite.x, gemSprite.y)
      const effectDelay = (distance * 4) + impactDelay
      this.scene.time.delayedCall(effectDelay, () => {
        if (!gemSprite.active) return
        this.scene.tweens.add({
          targets: gemSprite,
          angle: { from: -15, to: 15 },
          duration: 100,
          yoyo: true,
          repeat: 2,
          onComplete: () => {
            if (gemSprite && gemSprite.active) gemSprite.setAngle(0);
          }
        })
      })
    })

    // 5) Hoàn tất sau khi nốt nhạc xong
    this.scene.time.delayedCall(1500 + impactDelay, onComplete)
  }

  /**
   * [VFX ĐÃ SỬA] Hiệu ứng cho COMBO Bomb + Stripe (Hiệu ứng Chiêng + Tù Và)
   * @param {object} powerupAtPos2 - Powerup ở "vị trí 2" (tâm)
   * @param {object} powerupAtPos1 - Powerup ở "vị trí 1" (bay vào)
   * @param {string} direction - Hướng nổ ('horizontal' hoặc 'vertical')
   * @param {Set<object>} affectedGems - Set các gem bị ảnh hưởng
   * @param {function} onComplete - Callback
   */
  playBombStripeComboEffect(powerupAtPos2, powerupAtPos1, direction, affectedGems, onComplete) {
    const sprite1_tam = powerupAtPos2.sprite; // Sprite ở tâm (vị trí 2)
    const sprite2_bayvao = powerupAtPos1.sprite; // Sprite bay vào (vị trí 1)
    const centerPos = { x: sprite1_tam.x, y: sprite1_tam.y };

    const flashDelay = 150; // Thời điểm bắt đầu flash
    const impactDelay = 200; // Thời điểm 2 sprite va chạm

    // 1. Sprite 2 (bay vào) bay vào Sprite 1 (tâm)
    this.scene.tweens.add({
        targets: sprite2_bayvao,
        x: centerPos.x,
        y: centerPos.y,
        scale: sprite2_bayvao.scale * 0.5,
        alpha: 0,
        duration: impactDelay, // Va chạm sau 200ms
        ease: 'Quad.easeIn',
        onComplete: () => sprite2_bayvao.setVisible(false)
    });

    // 2. TẠO VFX (Hình chữ nhật 3 ô)
    const vfxRect = this.addVFXGraphics().setDepth(10);
    const boardWidth = this.scene.board.getBoardDimensions().width;
    const boardHeight = this.scene.board.getBoardDimensions().height;
    const cellSize = this.scene.board.cellSize;

    vfxRect.fillStyle(0xffffff, 0.8);
    if (direction === 'horizontal') {
        vfxRect.fillRect(this.scene.board.offsetX, centerPos.y - cellSize * 1.5, boardWidth, cellSize * 3);
    } else {
        vfxRect.fillRect(centerPos.x - cellSize * 1.5, this.scene.board.offsetY, cellSize * 3, boardHeight);
    }
    vfxRect.setAlpha(0);

    // Animation cho VFX (flash)
    this.scene.tweens.add({
        targets: vfxRect,
        alpha: { from: 0.8, to: 0 },
        duration: 500,
        delay: flashDelay, // Bắt đầu flash sớm hơn va chạm 1 chút
        ease: 'Cubic.easeOut',
        onComplete: () => {
            vfxRect.destroy();
        }
    });

    // 3. HIỆU ỨNG MỚI: "CHIÊNG" VÀ "TÙ VÀ"
    const layerMask6 = this.disableGemLayerMask(); // TẮT MASK CỦA LAYER
    this.scene.tweens.add({
        targets: sprite1_tam,
        angle: { from: -7, to: 7 },
        duration: 100,
        yoyo: true,
        repeat: 3,
        ease: 'Sine.easeInOut',
        delay: impactDelay
    });

    this.scene.tweens.add({
        targets: sprite1_tam,
        scale: sprite1_tam.scale * 1.3,
        duration: 150,
        yoyo: true,
        repeat: 2,
        ease: 'Cubic.easeInOut',
        delay: impactDelay,
        onComplete: () => {
          this.restoreGemLayerMask(layerMask6); // KHÔI PHỤC MASK CỦA LAYER
        }
    });
    this.scene.game.events.emit('screenShake', { duration: 400, intensity: 0.012, delay: impactDelay });

    // 4. Rung ngang và mờ các gem bị ảnh hưởng
    let maxGemFadeDelay = 0;
    affectedGems.forEach(gem => {
        if (!gem || !gem.sprite || !gem.sprite.active) return;
        if (gem === powerupAtPos1 || gem === powerupAtPos2) return;
        const gemSprite = gem.sprite;
        const rungDelay = impactDelay + Math.random() * 100;
        const rungDuration = 60;
        const rungRepeats = 4;
        this.scene.tweens.add({
            targets: gemSprite,
            x: gemSprite.x + (Math.random() > 0.5 ? 4 : -4),
            duration: rungDuration,
            yoyo: true,
            repeat: rungRepeats,
            ease: 'Sine.easeInOut',
            delay: rungDelay
        });
        // Trả lại angle về 0 sau khi rung
        const resetDelay = rungDelay + (rungDuration * (rungRepeats + 1)) + 50;
        if (resetDelay > maxGemFadeDelay) maxGemFadeDelay = resetDelay;
        this.scene.time.delayedCall(resetDelay, () => {
            if (gemSprite && gemSprite.active) gemSprite.setAngle(0);
        });
    });

    // 5. Kết thúc sau khi gem cuối cùng rung xong
    const totalDuration = maxGemFadeDelay + 100;
    this.scene.time.delayedCall(totalDuration, onComplete);
  }

  /**
   * [HELPER] Kích hoạt VFX nổ 3x3 cho 1 quả bomb (không phá gem)
   */
  playSingleBombVFX(bombSprite) {
    if (!bombSprite || !bombSprite.active) return;
    const originalDepth = bombSprite.depth;
    const layerMask7 = this.disableGemLayerMask(); // TẮT MASK CỦA LAYER
    this.scene.tweens.add({
      targets: bombSprite,
      scale: bombSprite.scale * 3,
      duration: 200,
      ease: 'Quad.easeOut',
      yoyo: true,
      onStart: () => {
        bombSprite.setDepth(50); // Depth cao để đè lên blocker
        this.scene.game.events.emit('screenShake', { duration: 100, intensity: 0.005 });
      },
      onComplete: () => {
        if (bombSprite && bombSprite.active) {
          bombSprite.setDepth(originalDepth);
          this.restoreGemLayerMask(layerMask7); // KHÔI PHỤC MASK CỦA LAYER
        }
      }
    });
  }

  /**
   * Hàm chính: Combo Color Bomb + Bomb
   */
  playColorBombBombComboEffect(colorBombGem, bombGem, gemsToTransform, affectedGems, onComplete) {
    if (!colorBombGem || !colorBombGem.sprite || !bombGem || !bombGem.sprite) {
      if (onComplete) onComplete();
      return;
    }

    const colorBombSprite = colorBombGem.sprite;
    const bombSprite = bombGem.sprite;
    const centerPos = { x: colorBombSprite.x, y: colorBombSprite.y };

    // Bomb bay vào Color Bomb
    this.scene.tweens.add({
      targets: bombSprite,
      x: centerPos.x,
      y: centerPos.y,
      scale: bombSprite.scale * 0.5,
      alpha: 0,
      duration: 250,
      ease: 'Quad.easeIn',
      onComplete: () => bombSprite.setVisible(false)
    });

    // Color Bomb rung lắc
    const layerMask8 = this.disableGemLayerMask(); // TẮT MASK CỦA LAYER
    this.scene.tweens.add({
      targets: colorBombSprite,
      scale: colorBombSprite.scale * 3,
      duration: 400,
      ease: 'Quad.easeOut',
      onStart: () => {
        colorBombSprite.setDepth(50); // Depth cao để đè lên blocker
        this.scene.game.events.emit('screenShake', { duration: 300, intensity: 0.005 });
      },
      onComplete: () => {
        this.restoreGemLayerMask(layerMask8); // KHÔI PHỤC MASK CỦA LAYER
      }
    });

    // Lưu vị trí gốc
    const originalPositions = new Map();
    gemsToTransform.forEach(gem => {
      if (gem && gem.sprite) {
        originalPositions.set(gem, { x: gem.sprite.x, y: gem.sprite.y, scale: gem.sprite.scale });
      }
    });

    // Loại bỏ 2 quả combo
    gemsToTransform.delete(colorBombGem);
    gemsToTransform.delete(bombGem);

    // Hút vào
    let maxSuckDelay = 0;
    const suckDuration = 500;
    let sucked = 0;
    const total = gemsToTransform.size;
    if (total === 0) {
      // Không có gem để hút, gọi onComplete ngay
      this.scene.time.delayedCall(300, onComplete);
      return;
    }
    gemsToTransform.forEach(gem => {
      if (!gem || !gem.sprite || !gem.sprite.active) { sucked++; return; }
      const delay = Math.random() * 200 + 100;
      if (delay > maxSuckDelay) maxSuckDelay = delay;
      this.scene.tweens.add({
        targets: gem.sprite,
        x: centerPos.x,
        y: centerPos.y,
        scale: 0,
        alpha: 0.5,
        duration: suckDuration,
        delay,
        ease: 'Cubic.easeIn',
        onComplete: () => {
          sucked++;
          if (sucked === total) {
            this.startSpitBackBombs(gemsToTransform, originalPositions, affectedGems, centerPos, onComplete);
          }
        }
      });
    });
  }

  /**
   * Helper: nhả về và phát nổ đơn
   */
  startSpitBackBombs(gemsToSpit, originalPositions, affectedGems, centerPos, onComplete) {
    let maxSpitDelay = 0;
    const spitDuration = 400;
    let done = 0;
    const total = gemsToSpit.size;
    gemsToSpit.forEach(gem => {
      if (!gem || !gem.sprite) { done++; return; }
      const oldPos = originalPositions.get(gem);
      if (!oldPos) { done++; return; }
      const delay = Math.random() * 150;
      if (delay > maxSpitDelay) maxSpitDelay = delay;
      gem.sprite.setPosition(centerPos.x, centerPos.y);
      gem.sprite.setTexture('gem_bomb');
      gem.sprite.setAlpha(1);
      gem.sprite.setScale(oldPos.scale * 0.5);
      this.scene.tweens.add({
        targets: gem.sprite,
        x: oldPos.x,
        y: oldPos.y,
        scale: oldPos.scale,
        duration: spitDuration,
        delay,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          if (gem.sprite && gem.sprite.active) {
            this.playSingleBombVFX(gem.sprite);
          }
          done++;
          if (done === total) {
            // Rung tất cả gem sau một nhịp (KHÔNG xóa sprite)
            affectedGems.forEach(g => {
              if (!g || !g.sprite || !g.sprite.active) return;
              const d = 500 + Math.random() * 200;
              this.scene.tweens.add({
                targets: g.sprite,
                angle: { from: -10, to: 10 },
                duration: 80,
                delay: d,
                yoyo: true,
                repeat: 2,
                ease: 'Sine.easeInOut',
                onComplete: () => {
                  if (g.sprite && g.sprite.active) g.sprite.setAngle(0);
                }
              });
            });
            // Delay ngắn hơn vì chỉ rung, không xóa
            this.scene.time.delayedCall(900, onComplete);
          }
        }
      });
    });
  }

}
