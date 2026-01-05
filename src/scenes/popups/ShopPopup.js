// src/scenes/popups/ShopPopup.js
import Phaser from 'phaser';
import APIManager from '../../managers/APIManager';
import PlayerDataManager from '../../managers/PlayerDataManager';

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
        this.purchasedItems = []; // Danh sách item đã mua
        this.coinDisplay = null; // Hiển thị số coin hiện tại
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

        // 4.1) Hiển thị số coin hiện tại (vị trí tuyệt đối giống ResourceDisplay)
        // ResourceDisplay ở (20, 20), coin icon ở (280, 30) trong container
        // => Vị trí tuyệt đối: (20 + 280, 20 + 30) = (300, 50)
        const coinIcon = this.add.image(300, 50, 'coin')
            .setScale(0.4)
            .setDepth(5)
            .setScrollFactor(0); // Ghim vào camera giống ResourceDisplay
        this.coinDisplay = this.add.text(305, 50, `${PlayerDataManager.getCoin()}`, {
            fontFamily: 'NABILA',
            fontSize: '20px',
            color: '#FFD700',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0, 0.5).setDepth(5).setScrollFactor(0);

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
        // Kiểm tra scene còn tồn tại không
        if (!this.sys || !this.sys.isActive()) {
            console.warn('ShopPopup: Scene đã bị destroy, bỏ qua loadAndRenderShop');
            return;
        }

        const { width, height } = this.scale;
        const loadingText = this.add.text(width / 2, height / 2, 'Loading Shop...', {
            fontSize: '24px',
            color: '#fff',
            fontFamily: 'NABILA'
        }).setOrigin(0.5).setDepth(10);

        // vô hiệu hóa lúc đầu
        this.updateButtons();
        try {
            this.shopData = await APIManager.getDailyShop();
            
            // Kiểm tra lại sau khi await (scene có thể đã bị đóng trong lúc chờ API)
            if (!this.sys || !this.sys.isActive()) {
                console.warn('ShopPopup: Scene đã bị destroy sau khi load API');
                return;
            }

            if (!this.shopData || !this.shopData.items) {
                throw new Error('Invalid shop data received');
            }

            // Load danh sách item đã mua
            this.purchasedItems = APIManager.getPurchasedItems();
            console.log('Purchased items:', this.purchasedItems);

            this.totalPages = Math.max(1, Math.ceil(this.shopData.items.length / this.itemsPerPage));
            this.currentPage = 0;
            this.renderPage(this.currentPage);
        } catch (error) {
            console.error('Failed to load shop:', error);
            // Kiểm tra loadingText còn tồn tại không trước khi setText
            if (loadingText && loadingText.active) {
                loadingText.setText('Error. Please try again.');
            }
            return;
        }

        // Kiểm tra loadingText còn tồn tại không trước khi destroy
        if (loadingText && loadingText.active) {
            loadingText.destroy();
        }
    }

    renderPage(pageIndex) {
        // Kiểm tra scene còn tồn tại không
        if (!this.sys || !this.sys.isActive()) {
            console.warn('ShopPopup: Scene đã bị destroy, bỏ qua renderPage');
            return;
        }

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

            // Lưu itemData vào container để sử dụng sau
            container.setData('itemData', item);

            // Kiểm tra xem item đã được mua chưa
            const isPurchased = this.purchasedItems.includes(item.id);

            const icon = this.add.image(0, 0, item.icon)
                .setOrigin(0.5)
                .setName('itemIcon'); // Đặt tên để tìm kiếm sau này
            if (item.icon === 'booster_swap') {
                icon.y += 5;
            }
            if (item.icon === 'ticket') {
                icon.setScale(1.3);
            }
            if (item.icon === 'heart_2') {
                icon.setScale(0.8);
            }

            // --- LOGIC MỚI: HIỂN THỊ SỐ LƯỢNG ---
            let quantity = 1;
            const match = item.id.match(/_(\d+)$/);
            if (match) {
                quantity = parseInt(match[1]);
            }
            let quantityText = null;
            if (quantity > 1 && item.id !== 'lives') {
                let quantityY = 30;
                if (item.icon === 'booster_swap') {
                    quantityY = 35;
                }
                quantityText = this.add.text(0, quantityY, `+${quantity}`, {
                    fontFamily: 'UTMCookies',
                    fontSize: '24px',
                    color: '#ffffff',
                    fontStyle: 'bold',
                    stroke: '#782a16',
                    strokeThickness: 4
                }).setOrigin(0.5);

            }
            // --- KẾT THÚC LOGIC MỚI ---
            
            // Nếu đã mua, thêm overlay màu xám
            if (isPurchased) {
                icon.setTint(0x666666); // Màu xám
                icon.setAlpha(0.5);
            }
            
            container.add(icon);

            if (quantityText) {
                container.add(quantityText);
                container.bringToTop(quantityText);
            }

            const priceBg = this.add.image(0, 66, 'shop_price_background')
                .setOrigin(0.5)
                .setScale(1)
                .setName('itemPriceBg'); // Đặt tên để tìm kiếm sau này
            
            // Nếu đã mua, làm mờ priceBg
            if (isPurchased) {
                priceBg.setTint(0x666666);
                priceBg.setAlpha(0.5);
            }
            
            container.add(priceBg);

            const priceText = this.add.text(5, 66, isPurchased ? 'ĐÃ MUA' : `${item.price}`, {
                fontFamily: 'NABILA',
                fontSize: isPurchased ? '18px' : '20px',
                color: isPurchased ? '#999999' : '#ffffff',
                stroke: '#000000',
                strokeThickness: 4,
                fontStyle: 'bold'
            }).setOrigin(0.5);
            container.add(priceText);

            if (item.isDiscounted && !isPurchased) {
                const badge = this.add.image(34, -30, 'shop_discount_40')
                    .setOrigin(0.5)
                    .setScale(0.4);
                container.add(badge);

                const originalText = this.add.text(5, 50, `${item.originalPrice}`, {
                    fontFamily: 'NABILA',
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

            // Chỉ thêm tương tác nếu chưa mua
            if (!isPurchased) {
                // 1. Tương tác cho Icon (chính xác theo pixel)
                icon.setInteractive({ pixelPerfect: true, useHandCursor: true });
                icon.on('pointerdown', () => {
                    console.log(`[ShopPopup] Click item id: ${item.id}, price=${item.price}`);
                    this.handleBuyItem(item);
                });
                
                // 2. Tương tác cho Nút giá (hình chữ nhật bình thường)
                priceBg.setInteractive({ useHandCursor: true });
                priceBg.on('pointerdown', () => {
                    console.log(`[ShopPopup] Click item id: ${item.id}, price=${item.price}`);
                    this.handleBuyItem(item);
                });
                
                // 3. Hiệu ứng Hover (cho cả hai)
                const hoverIn = () => {
                    this.tweens.add({ targets: container, scale: 1.05, duration: 100 });
                };
                const hoverOut = () => {
                    this.tweens.add({ targets: container, scale: 1, duration: 100 });
                };
                
                icon.on('pointerover', hoverIn);
                icon.on('pointerout', hoverOut);
                priceBg.on('pointerover', hoverIn);
                priceBg.on('pointerout', hoverOut);
            }
        });

        this.updateButtons();
    }

    updateButtons() {
        // Kiểm tra scene còn tồn tại không trước khi cập nhật
        if (!this.sys || !this.sys.isActive()) {
            console.warn('ShopPopup: Scene đã bị destroy, bỏ qua updateButtons');
            return;
        }

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
    
    async handleBuyItem(item) {
        // Kiểm tra scene còn tồn tại không
        if (!this.sys || !this.sys.isActive()) {
            console.warn('ShopPopup: Scene đã bị destroy, bỏ qua handleBuyItem');
            return;
        }

        // Disable tất cả interaction trong lúc đang xử lý
        this.setShopInteractionEnabled(false);
        
        try {
            // Gọi API mua item thông qua APIManager
            const result = await APIManager.buyItem(item.id, item.price);
            
            // Kiểm tra lại sau khi await (scene có thể đã bị đóng trong lúc chờ API)
            if (!this.sys || !this.sys.isActive()) {
                console.warn('ShopPopup: Scene đã bị destroy sau khi mua item');
                return;
            }

            if (result.success) {
                // Mua thành công
                console.log(`Đã mua ${item.id} thành công!`, result.reward);
                
                // Thêm item vào danh sách đã mua
                this.purchasedItems.push(item.id);
                
                // Cập nhật hiển thị coin
                if (this.coinDisplay) {
                    this.coinDisplay.setText(`${PlayerDataManager.getCoin()}`);
                }
                
                // Cập nhật ResourceDisplay
                this.updateResourceDisplay();
                
                // Hiển thị thông báo thành công
                this.showPurchaseSuccessMessage(item, result.reward);
                
                // Render lại trang hiện tại để cập nhật màu xám
                this.renderPage(this.currentPage);
            } else {
                // Mua thất bại
                console.log(`Không thể mua ${item.id}: ${result.message}`);
                this.showErrorMessage(result.message);
                
                // Enable lại interaction nếu thất bại
                this.setShopInteractionEnabled(true);
            }
            
        } catch (error) {
            console.error('Lỗi khi mua item:', error);
            this.showErrorMessage('Có lỗi xảy ra. Vui lòng thử lại!');
            
            // Enable lại interaction nếu có lỗi
            this.setShopInteractionEnabled(true);
        }
    }
    
    setShopInteractionEnabled(enabled) {
        // Disable/enable tất cả item trong itemsLayer
        this.itemsLayer.each((container) => {
            // Tìm icon và priceBg theo tên đã đặt
            const icon = container.getByName('itemIcon');
            const priceBg = container.getByName('itemPriceBg');
            
            if (enabled) {
                // Chỉ enable nếu item chưa được mua
                const itemData = container.getData('itemData');
                if (itemData && !this.purchasedItems.includes(itemData.id)) {
                    if (icon) icon.setInteractive({ pixelPerfect: true, useHandCursor: true });
                    if (priceBg) priceBg.setInteractive({ useHandCursor: true });
                }
            } else {
                if (icon) icon.disableInteractive();
                if (priceBg) priceBg.disableInteractive();
            }
        });
        
        // Disable/enable nút prev/next
        if (this.prevBtn) {
            if (enabled && this.currentPage > 0) {
                this.prevBtn.setInteractive();
            } else {
                this.prevBtn.disableInteractive();
            }
        }
        
        if (this.nextBtn) {
            if (enabled && this.currentPage < this.totalPages - 1) {
                this.nextBtn.setInteractive();
            } else {
                this.nextBtn.disableInteractive();
            }
        }
    }
    
    showErrorMessage(message) {
        const { width, height } = this.scale;
        const messageText = this.add.text(width / 2, height / 2, message, {
            fontFamily: 'NABILA',
            fontSize: '28px',
            color: '#ffffff',
            stroke: '#ff0000',
            strokeThickness: 6,
            align: 'center',
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(100);
        
        // Hiệu ứng scale + fade out
        this.tweens.add({
            targets: messageText,
            scale: 1.1,
            duration: 200,
            yoyo: true,
            onComplete: () => {
                this.tweens.add({
                    targets: messageText,
                    alpha: 0,
                    duration: 500,
                    delay: 1000,
                    onComplete: () => messageText.destroy()
                });
            }
        });
    }
    
    showPurchaseSuccessMessage(item, reward) {
        const { width, height } = this.scale;
        
        // Tạo text động dựa trên reward
        let rewardText = '';
        if (reward) {
            if (reward.type === 'ticket') {
                rewardText = '\n+1 Vé Quay';
            } else if (reward.type.startsWith('booster_')) {
                const boosterName = reward.type.replace('booster_', '').toUpperCase();
                rewardText = `\n+${reward.quantity} ${boosterName}`;
            } else if (reward.type === 'lives') {
                rewardText = '\n❤️ Hồi đầy Lives';
            } else if (reward.type === 'coins') {
                rewardText = `\n+${reward.quantity} Coins`;
            }
        }
        
        const messageText = this.add.text(width / 2, height / 2, `Mua thành công!${rewardText}`, {
            fontFamily: 'NABILA',
            fontSize: '28px',
            color: '#00ff00',
            stroke: '#000000',
            strokeThickness: 6,
            align: 'center',
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(100);
        
        // Hiệu ứng bounce + fade out
        this.tweens.add({
            targets: messageText,
            scale: 1.2,
            duration: 200,
            ease: 'Back.easeOut',
            yoyo: true,
            onComplete: () => {
                this.tweens.add({
                    targets: messageText,
                    alpha: 0,
                    duration: 500,
                    delay: 1500,
                    onComplete: () => messageText.destroy()
                });
            }
        });
    }
    
    updateResourceDisplay() {
        const mapScene = this.scene.get('MapScene');
        if (mapScene && mapScene.resourceDisplay) {
            mapScene.resourceDisplay.updateDisplay();
        }
    }

    close() {
        this.scene.stop();
    }
}


