// src/scenes/popups/ShopPopup.js
import Phaser from 'phaser';
import APIManager from '../../managers/APIManager';

export class ShopPopup extends Phaser.Scene {
    constructor() {
        super({ key: 'ShopPopup' });
        this.itemsLayer = null;
        this.currentPage = 0;
        this.totalPages = 1;
        this.shopData = null;
        this.itemsPerPage = 6; // 2 hàng x 3 cột
        this.prevBtn = null;
        this.nextBtn = null;
        this.pageText = null;
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

        // 4) Nút đóng (X)
        const closeButton = this.add.image(470, 270, 'pause_exit')
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .setDepth(5);
        closeButton.on('pointerdown', () => this.close());

        // 5) Lớp chứa item để tiện xoá/vẽ lại khi đổi trang
        this.itemsLayer = this.add.container(0, 0).setDepth(3);

        // 6) Nút điều khiển prev/next + text trang
        this.prevBtn = this.add.image(208, 755, 'previous_button')
            .setOrigin(0.5)
            .setDepth(5)
            .setInteractive({ useHandCursor: true });
        this.nextBtn = this.add.image(368, 755, 'next_button')
            .setOrigin(0.5)
            .setDepth(5)
            .setInteractive({ useHandCursor: true });
        this.pageText = this.add.text(288, 755, '1/1', {
            fontFamily: 'UTMCookies',
            fontSize: '22px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4,
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(5);

        this.prevBtn.on('pointerdown', () => {
            if (this.currentPage <= 0) return;
            this.currentPage -= 1;
            this.renderPage(this.currentPage);
        });
        this.nextBtn.on('pointerdown', () => {
            if (this.currentPage >= this.totalPages - 1) return;
            this.currentPage += 1;
            this.renderPage(this.currentPage);
        });

        // 7) Gọi API để lấy data và render
        this.loadAndRenderShop();

        // Đảm bảo resume MapScene khi tắt
        this.events.on('shutdown', () => {
            if (this.scene.isPaused('MapScene')) this.scene.resume('MapScene');
        });
    }

    async loadAndRenderShop() {
        const { width, height } = this.scale;
        const loadingText = this.add.text(width / 2, height / 2, 'Loading Shop...', {
            fontSize: '24px',
            color: '#fff',
            fontFamily: 'UTMCookies'
        }).setOrigin(0.5).setDepth(10);

        // vô hiệu hóa lúc đầu
        this.updateButtons();
        try {
            this.shopData = await APIManager.getDailyShop();
            if (!this.shopData || !this.shopData.items) {
                throw new Error('Invalid shop data received');
            }

            this.totalPages = Math.max(1, Math.ceil(this.shopData.items.length / this.itemsPerPage));
            this.currentPage = 0;
            this.renderPage(this.currentPage);
        } catch (error) {
            console.error('Failed to load shop:', error);
            loadingText.setText('Error. Please try again.');
            return;
        }

        loadingText.destroy();
    }

    renderPage(pageIndex) {
        this.itemsLayer.removeAll(true);

        if (!this.shopData) {
            this.updateButtons();
            return;
        }

        const startIndex = pageIndex * this.itemsPerPage;
        const endIndex = Math.min(startIndex + this.itemsPerPage, this.shopData.items.length);
        const itemsToShow = this.shopData.items.slice(startIndex, endIndex);

        // Lưới 2x3
        const cols = 3;
        const cellSpacingX = 125;
        const cellSpacingY = 150;
        const startX = this.scale.width / 2 - cellSpacingX;
        const startY = 432;

        itemsToShow.forEach((item, localIndex) => {
            const r = Math.floor(localIndex / cols);
            const c = localIndex % cols;
            const x = startX + c * cellSpacingX;
            const y = startY + r * cellSpacingY;

            const container = this.add.container(x, y);
            this.itemsLayer.add(container);

            const icon = this.add.image(0, 0, item.icon)
                .setOrigin(0.5)
                .setScale(0.18);
            if (item.icon === 'booster_swap') {
                icon.y += 5;
            }
            container.add(icon);

            const priceBg = this.add.image(0, 66, 'shop_price_background')
                .setOrigin(0.5)
                .setScale(1);
            container.add(priceBg);

            const priceText = this.add.text(5, 66, `${item.price}` , {
                fontFamily: 'UTMCookies',
                fontSize: '20px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 4,
                fontStyle: 'bold'
            }).setOrigin(0.5);
            container.add(priceText);

            if (item.isDiscounted) {
                const badge = this.add.image(34, -30, 'shop_discount_40')
                    .setOrigin(0.5)
                    .setScale(0.4);
                container.add(badge);

                const originalText = this.add.text(5, 50, `${item.originalPrice}`, {
                    fontFamily: 'UTMCookies',
                    fontSize: '16px',
                    color: '#ffffff',
                    stroke: '#000000',
                    strokeThickness: 3,
                    fontStyle: 'bold'
                }).setOrigin(0.5).setAlpha(0.75);
                container.add(originalText);

                const strike = this.add.graphics();
                strike.lineStyle(3, 0xff5555, 0.95);
                const halfW = (originalText.width / 2) + 8;
                strike.strokeLineShape(new Phaser.Geom.Line(-halfW, 0, halfW, 0));
                strike.setPosition(0, originalText.y);
                strike.setAngle(-12);
                container.add(strike);

                priceText.setFontSize(22);
                priceText.setColor('#ffe066');
                priceText.setAngle(-6);
            }

            container.setSize(90, 90);
            container.setInteractive({ useHandCursor: true });
            container.on('pointerdown', () => {
                console.log(`[ShopPopup] Click item id: ${item.id}, price=${item.price}`);
                // TODO: APIManager.buyItem(item.id)
            });
        });

        this.updateButtons();
    }

    updateButtons() {
        const dataLoaded = !!this.shopData;
        if (this.prevBtn) {
            this.prevBtn.setAlpha(dataLoaded && this.currentPage > 0 ? 1 : 0.5)
                .setInteractive(dataLoaded && this.currentPage > 0);
        }
        if (this.nextBtn) {
            this.nextBtn.setAlpha(dataLoaded && this.currentPage < this.totalPages - 1 ? 1 : 0.5)
                .setInteractive(dataLoaded && this.currentPage < this.totalPages - 1);
        }
        if (this.pageText) {
            this.pageText.setText(dataLoaded ? `${this.currentPage + 1}/${this.totalPages}` : '-/-');
        }
    }

    close() {
        this.scene.stop();
    }
}


