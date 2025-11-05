// src/scenes/popups/ShopPopup.js
import Phaser from 'phaser';

export class ShopPopup extends Phaser.Scene {
    constructor() {
        super({ key: 'ShopPopup' });
    }

    create() {
        const { width, height } = this.scale;

        // 1) Tạm dừng MapScene (nếu đang mở từ bản đồ)
        if (this.scene.isActive('MapScene')) this.scene.pause('MapScene');

        // 2) Overlay mờ phía sau
        this.add.rectangle(0, 0, width, height, 0x000000, 0.7)
            .setOrigin(0)
            .setInteractive()
            .setDepth(1);

        // 3) Background shop
        const bg = this.add.image(width / 2, height / 2, 'shop_background')
            .setOrigin(0.5)
            .setScale(0.4)
            .setDepth(2);

        // 4) Nút đóng (X) dùng lại pause_exit
        const closeButton = this.add.image(470, 270, 'pause_exit')
            .setOrigin(0.5)

            .setInteractive({ useHandCursor: true })
            .setDepth(5);
        closeButton.on('pointerdown', () => this.close());

        // 5) Tạo lưới item (2 hàng x 3 cột)
        // Toạ độ tương đối quanh tâm popup, có thể chỉnh sau cho khớp UI
        const cols = 3;
        const rows = 2;
        const cellSpacingX = 125;
        const cellSpacingY = 150;
        const startX = width / 2 - cellSpacingX;  // 3 cột: -1, 0, +1
        const startY = 432;           // hàng trên

        // Các icon dùng tạm thời từ booster đã có sẵn
        const icons = [
            'booster_hammer', 'booster_swap', 'booster_rocket',
            'booster_shuffle', 'booster_hammer', 'booster_rocket'
        ];
        const prices = [200, 300, 500, 250, 450, 600];
        const discounts = [false, true, false, true, false, true];

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const idx = r * cols + c;
                const x = startX + c * cellSpacingX;
                const y = startY + r * cellSpacingY;

                const container = this.add.container(x, y).setDepth(3);

                const icon = this.add.image(0, 0, icons[idx])
                    .setOrigin(0.5)
                    .setScale(0.18);
                if (icons[idx] === 'booster_swap') {
                    icon.y += 5; // dịch xuống 5px cho icon swap
                }
                container.add(icon);

                // Price background + price text (thay cho số lượng)
                const priceBg = this.add.image(0, 66, 'shop_price_background')
                    .setOrigin(0.5)
                    .setScale(1);
                container.add(priceBg);

                const priceText = this.add.text(5, 66, `${prices[idx]}`, {
                    fontFamily: 'UTMCookies',
                    fontSize: '20px',
                    color: '#ffffff',
                    stroke: '#000000',
                    strokeThickness: 4,
                    fontStyle: 'bold'
                }).setOrigin(0.5);
                container.add(priceText);

                // Badge giảm giá ở góc trên phải (nếu có)
                if (discounts[idx]) {
                    const badge = this.add.image(34, -30, 'shop_discount_40')
                        .setOrigin(0.5)
                        .setScale(0.4);
                    container.add(badge);

                    // Hiển thị giá gốc (mờ hơn) + gạch ngang, và giá sau giảm (đè lên, xéo nhẹ)
                    const originalPrice = Math.round(prices[idx] / 0.6); // 40% off => price = 60% original
                    const originalText = this.add.text(5, 50, `${originalPrice}`, {
                        fontFamily: 'UTMCookies',
                        fontSize: '16px',
                        color: '#ffffff',
                        stroke: '#000000',
                        strokeThickness: 3,
                        fontStyle: 'bold'
                    }).setOrigin(0.5).setAlpha(0.75);
                    container.add(originalText);

                    // Gạch ngang xéo một chút qua giá gốc
                    const strike = this.add.graphics();
                    strike.lineStyle(3, 0xff5555, 0.95);
                    const halfW = (originalText.width / 2) + 8;
                    strike.strokeLineShape(new Phaser.Geom.Line(-halfW, 0, halfW, 0));
                    strike.setPosition(0, originalText.y);
                    strike.setAngle(-12);
                    container.add(strike);

                    // Nhấn mạnh giá đã giảm: to hơn, màu tươi và xéo nhẹ
                    priceText.setFontSize(22);
                    priceText.setColor('#ffe066');
                    priceText.setAngle(-6);
                }

                // Tương tác mua thử nghiệm (log ra console)
                container.setSize(90, 90);
                container.setInteractive({ useHandCursor: true });
                container.on('pointerdown', () => {
                    console.log(`[ShopPopup] Click item #${idx + 1} (${icons[idx]}), price=${prices[idx]}${discounts[idx] ? ' (discount 40%)' : ''}`);
                });
            }
        }

        // Đảm bảo resume MapScene khi tắt
        this.events.on('shutdown', () => {
            if (this.scene.isPaused('MapScene')) this.scene.resume('MapScene');
        });
    }

    close() {
        this.scene.stop();
    }
}


