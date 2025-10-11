// src/objects/vfx/PowerupVFXManager.js

export class PowerupVFXManager {
  constructor(scene) {
    this.scene = scene;
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
    this.scene.tweens.add({
      targets: bombSprite,
      scale: bombSprite.scale * 3, // Phóng to gấp 3 lần kích thước hiện tại
      duration: 200,
      ease: 'Quad.easeOut',
      yoyo: true, // Tự động thu nhỏ lại
      onStart: () => {
        // Đặt depth cao để bomb đè lên trên các gem khác
        bombSprite.setDepth(10);
        // Rung camera một chút để tạo cảm giác mạnh
        this.scene.game.events.emit('screenShake', { duration: 100, intensity: 0.005 });
      },
      onComplete: () => {
        // Trả lại depth ban đầu
        bombSprite.setDepth(2);
        if (onComplete) onComplete(); // Gọi callback để board tiếp tục logic
      }
    });

    // 2. Làm các gem bị ảnh hưởng biến mất
    affectedGems.forEach(gem => {
      if (gem !== bombGem) { // Không áp dụng hiệu ứng này cho chính quả bomb
        this.scene.tweens.add({
          targets: gem.sprite,
          scale: 0,
          alpha: 0,
          duration: 250,
          delay: 50, // Trễ một chút so với quả bom
          ease: 'Quad.easeIn'
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
    this.scene.tweens.chain({
      targets: colorBombSprite,
      onStart: () => {
        colorBombSprite.setDepth(10);
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
          // Sau khi hút xong, trả lại depth và gọi callback cuối cùng
          colorBombSprite.setDepth(2);
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
    const pauseAfterSuck = 150; // << Giảm từ 300ms xuống 150ms để nhanh hơn

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
    this.scene.tweens.add({
      targets: selectedSprite,
      scale: selectedSprite.scale * 4.5, // Phóng to hơn một chút
      alpha: { from: 1, to: 0.5 },
      duration: 350, // << Tăng thời gian phóng to
      delay: 150,    // Tăng nhẹ delay
      ease: 'Quad.easeOut',
      onStart: () => {
        selectedSprite.setDepth(10)
        this.scene.game.events.emit('screenShake', { duration: 300, intensity: 0.015 }) // Rung mạnh và lâu hơn
      },
      onComplete: () => {
        // Tạo hiệu ứng sóng lan tỏa từ trung tâm của quả bom được chọn
        this.createExplosionWave(selectedSprite.x, selectedSprite.y, onComplete)
      }
    })

    // 3. Làm các gem bị ảnh hưởng biến mất từ từ
    affectedGems.forEach(gem => {
      if (gem !== selectedBomb && gem !== targetBomb) {
        this.scene.tweens.add({
          targets: gem.sprite,
          scale: 0,
          alpha: 0,
          duration: 400, // Giữ nguyên hoặc tăng nhẹ
          delay: 250 + Math.random() * 200, // Tăng delay để khớp với animation chậm hơn
          ease: 'Quad.easeIn'
        })
      }
    })
  }

  // << THÊM CẢ HÀM HELPER NÀY VÀO >>
  // Hàm này dùng để vẽ vòng tròn sóng nổ lan ra
  createExplosionWave(x, y, onComplete) {
    const wave = this.scene.add.circle(x, y, this.scene.board.cellSize * 0.5, 0xffffff, 0.7)
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

  // << THÊM HÀM MỚI NÀY VÀO CUỐI CLASS >>
  /**
   * Hiệu ứng cho Stripe với nốt nhạc bay đến từng gem bị ảnh hưởng.
   * @param {object} stripeGem - Đối tượng gem Stripe (tù và).
   * @param {Set<object>} affectedGems - Set các gem bị ảnh hưởng.
   * @param {function} onComplete - Callback khi hiệu ứng kết thúc.
   */
  playStripeEffect(stripeGem, affectedGems, onComplete) {
    const stripeSprite = stripeGem.sprite;
    const startPos = { x: stripeSprite.x, y: stripeSprite.y };
    const stripeRow = stripeSprite.getData('row');

    // 1. Phóng to nhẹ "tù và" để tạo điểm nhấn
    this.scene.tweens.add({
        targets: stripeSprite,
        scale: stripeSprite.scale * 1.5,
        duration: 200,
        yoyo: true,
        ease: 'Quad.easeOut'
    });

    // 2. Xác định hướng kích hoạt (ngang hay dọc)
    const isHorizontal = Array.from(affectedGems).some(g => g.sprite.getData('row') === stripeRow && g !== stripeGem);
    
    // 3. Sắp xếp các gem bị ảnh hưởng theo khoảng cách từ tâm
    const sortedGems = Array.from(affectedGems).filter(gem => gem !== stripeGem).sort((a, b) => {
        const distA = Phaser.Math.Distance.Between(stripeSprite.x, stripeSprite.y, a.sprite.x, a.sprite.y);
        const distB = Phaser.Math.Distance.Between(stripeSprite.x, stripeSprite.y, b.sprite.x, b.sprite.y);
        return distA - distB;
    });

    let maxDelay = 0;

    // 4. Tạo nốt nhạc bay đến từng gem bị ảnh hưởng
    sortedGems.forEach((gem, index) => {
        if (!gem || !gem.sprite || !gem.sprite.active) return;

        const gemSprite = gem.sprite;
        const distance = Phaser.Math.Distance.Between(startPos.x, startPos.y, gemSprite.x, gemSprite.y);
        const travelDuration = distance * 2; // Tốc độ bay của nốt nhạc
        const noteTravelDelay = index * 100; // Các nốt nhạc xuất hiện lần lượt
        
        if (noteTravelDelay > maxDelay) {
            maxDelay = noteTravelDelay;
        }

        // Tạo một nốt nhạc ngẫu nhiên tại vị trí "tù và"
        const note = this.scene.add.image(startPos.x, startPos.y, Phaser.Math.RND.pick(['note1', 'note2', 'note3', 'note4']))
            .setScale(0.5)
            .setDepth(15)
            .setAlpha(0.8);

        // Animation cho nốt nhạc bay tới viên gem
        this.scene.tweens.add({
            targets: note,
            x: gemSprite.x,
            y: gemSprite.y,
            alpha: 0,
            scale: 1.2,
            duration: travelDuration,
            delay: noteTravelDelay,
            ease: 'Quad.easeOut',
            onComplete: () => {
                note.destroy();
            }
        });

        // Tạo hiệu ứng lơ lửng cho nốt nhạc khi bay
        this.scene.tweens.add({
            targets: note,
            y: note.y + (Math.random() > 0.5 ? 15 : -15),
            duration: travelDuration / 2,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Kích hoạt hiệu ứng lắc và biến mất trên viên gem
        this.scene.time.delayedCall(noteTravelDelay + travelDuration / 2, () => {
             if (!gemSprite.active) return;
             
             // Lắc lư
             this.scene.tweens.add({
                 targets: gemSprite,
                 angle: { from: -10, to: 10 },
                 duration: 80,
                 yoyo: true,
                 repeat: 2,
             });

             // Biến mất
             this.scene.tweens.add({
                 targets: gemSprite,
                 scale: 0,
                 alpha: 0,
                 duration: 200,
                 delay: 150, // Chờ lắc xong mới biến mất
             });
        });
    });

    // 5. Gọi onComplete sau khi nốt nhạc cuối cùng đã bay được một đoạn
    this.scene.time.delayedCall(maxDelay + 400, onComplete);
  }

}
