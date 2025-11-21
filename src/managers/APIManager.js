// src/managers/APIManager.js
import Phaser from 'phaser';
import { BOOSTER_TYPES } from '../utils/constants';

/**
 * Đây là một trình giả lập API (Mock).
 * Nó "giả vờ" là một server và sử dụng localStorage để lưu trữ
 * cửa hàng cá nhân của người chơi, tuân theo logic "lazy update".
 */
class APIManager {

    constructor() {
        console.log("Mock API Manager Initialized.");
        this.MOCK_USER_SHOP_KEY = 'mockUserShop';
        this.MOCK_PURCHASED_ITEMS_KEY = 'mockPurchasedItems';
    }

    /**
     * Giả lập độ trễ mạng.
     * @param {number} ms - Thời gian chờ (miligiây)
     */
    _simulateNetworkDelay(ms = 500) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Hàm nội bộ: Tạo ra một cửa hàng mới ngẫu nhiên.
     * Đây là logic mà "server thật" sẽ chạy.
     */
    _generateNewShopData() {
        console.warn("SERVER SIM: Generating new shop data for user...");
        
        // Danh sách tất cả vật phẩm có thể bán
        const allPossibleItems = [
            // Vật phẩm lẻ (giữ nguyên)
            { id: 'ticket', icon: 'ticket', price: 50, isDiscounted: false, originalPrice: 50 },
            { id: 'hammer_1', icon: 'booster_hammer', price: 100, isDiscounted: false, originalPrice: 100 },
            { id: 'swap_1', icon: 'booster_swap', price: 100, isDiscounted: false, originalPrice: 100 },
            { id: 'rocket_1', icon: 'booster_rocket', price: 150, isDiscounted: false, originalPrice: 150 },
            { id: 'shuffle_1', icon: 'booster_shuffle', price: 150, isDiscounted: false, originalPrice: 150 },
            
            // Các gói Pack (Đã chỉnh giá giảm 40%)
            // 300 * 0.6 = 180
            { id: 'hammer_pack_3', icon: 'booster_hammer', price: 180, isDiscounted: true, originalPrice: 300 },
            { id: 'swap_pack_3', icon: 'booster_swap', price: 180, isDiscounted: true, originalPrice: 300 },
            
            // 450 * 0.6 = 270
            { id: 'rocket_pack_3', icon: 'booster_rocket', price: 270, isDiscounted: true, originalPrice: 450 },
            { id: 'shuffle_pack_3', icon: 'booster_shuffle', price: 270, isDiscounted: true, originalPrice: 450 },
            
            // 150 * 0.6 = 90
            { id: 'ticket_pack_3', icon: 'ticket', price: 90, isDiscounted: true, originalPrice: 150 },
            
            // Item Mạng (giữ nguyên)
            { id: 'lives', icon: 'heart_2', price: 100, isDiscounted: false, originalPrice: 100 }
        ];

        // Trộn ngẫu nhiên và chọn 6-8 item
        const shuffled = [...allPossibleItems].sort(() => 0.5 - Math.random());
        const itemsForSale = shuffled.slice(0, 6); 

        // Tính thời gian hết hạn: 24 giờ kể từ bây giờ
        // (Server thật sẽ đặt là 00:00 UTC ngày mai)
        const expires_at = Date.now() + 24 * 60 * 60 * 1000; // + 24 giờ

        const newShopData = {
            expires_at: expires_at,
            items: itemsForSale
        };

        // Lưu vào localStorage (giả lập DB)
        localStorage.setItem(this.MOCK_USER_SHOP_KEY, JSON.stringify(newShopData));
        return newShopData;
    }

    /**
     * API công khai mà ShopPopup sẽ gọi.
     * Thực hiện logic "lazy update".
     * @returns {Promise<object>} Dữ liệu cửa hàng
     */
    async getDailyShop() {
        console.log("CLIENT: Requesting shop data...");
        await this._simulateNetworkDelay(300 + Math.random() * 500); // Giả lập độ trễ 0.3-0.8s

        const currentTime = Date.now();
        const storedData = localStorage.getItem(this.MOCK_USER_SHOP_KEY);

        if (storedData) {
            try {
                const shopData = JSON.parse(storedData);
                
                // KIỂM TRA: Cửa hàng có và CHƯA hết hạn
                if (shopData && shopData.expires_at && currentTime < shopData.expires_at) {
                    console.log("SERVER SIM: Returning cached shop data.");
                    return shopData;
                }
            } catch (e) {
                console.error("Failed to parse mock shop data", e);
                // Lỗi -> Xóa data cũ và tạo mới
                localStorage.removeItem(this.MOCK_USER_SHOP_KEY);
            }
        }

        // Nếu không có data, hoặc data đã hết hạn -> Tạo mới
        return this._generateNewShopData();
    }

    /**
     * GIẢ LẬP BE: Người chơi nhấn nút spin, BE tính toán và trả về ID giải thưởng
     * @returns {Promise<object>} Đối tượng chứa { success: true, prizeId: "ID_GIAI_THUONG" }
     */
    async spinWheel() {
        console.log("CLIENT: Requesting wheel spin...");
        await this._simulateNetworkDelay(200 + Math.random() * 400); // Giả lập độ trễ 0.2-0.6s

        // BE logic: chọn ngẫu nhiên một giải
        // Đây là các "ID" (reward.type) mà BE có thể trả về,
        // dựa trên mảng wheelItems CỐ ĐỊNH trong SpinPopup.js
        const possiblePrizes = [
            'booster_hammer',   // Ứng với hammer_2
            'booster_shuffle',  // Ứng với shuffle_2
            'coin',             // Ứng với coin_x2
            'booster_rocket',   // Ứng với rocket_2
            'heart',            // Ứng với heart_2
            'booster_shuffle',
            'booster_rocket',
            'booster_swap'      // Ứng với swap_2
        ];

        // BE chọn ngẫu nhiên 1 giải và trả về ID
        const prizeId = Phaser.Math.RND.pick(possiblePrizes);

        console.log("SERVER SIM: Returning prize ID:", prizeId);

        // Trả về cấu trúc chuẩn mà FE sẽ dùng
        return { success: true, prizeId: prizeId };
    }

    /**
     * API nhận thưởng từ vòng quay
     * @param {string} rewardType - Loại thưởng (booster_hammer, coin, heart, etc.)
     * @param {number} quantity - Số lượng
     * @returns {Promise<object>} { success: boolean, message: string, reward: object }
     */
    async claimSpinReward(rewardType, quantity) {
        console.log(`CLIENT: Claiming spin reward ${rewardType} x${quantity}...`);
        await this._simulateNetworkDelay(100 + Math.random() * 200);

        // Import PlayerDataManager để cập nhật inventory
        const PlayerDataManager = (await import('./PlayerDataManager')).default;

        let reward = null;

        // Xử lý từng loại thưởng sử dụng các method tập trung
        if (rewardType === 'booster_hammer') {
            PlayerDataManager.updateBooster('hammer', quantity);
            reward = { type: 'booster_hammer', quantity };
        } else if (rewardType === 'booster_shuffle') {
            PlayerDataManager.updateBooster('shuffle', quantity);
            reward = { type: 'booster_shuffle', quantity };
        } else if (rewardType === 'booster_rocket') {
            PlayerDataManager.updateBooster('rocket', quantity);
            reward = { type: 'booster_rocket', quantity };
        } else if (rewardType === 'booster_swap') {
            PlayerDataManager.updateBooster('swap', quantity);
            reward = { type: 'booster_swap', quantity };
        } else if (rewardType === 'coin') {
            PlayerDataManager.updateCoins(quantity);
            reward = { type: 'coin', quantity };
        } else if (rewardType === 'heart') {
            PlayerDataManager.updateLives(quantity);
            reward = { type: 'heart', quantity };
        }

        console.log(`SERVER SIM: Spin reward claimed successfully!`, reward);
        return {
            success: true,
            message: 'Nhận thưởng thành công!',
            reward: reward
        };
    }

    /**
     * API mua item từ shop
     * @param {string} itemId - ID của item cần mua
     * @param {number} price - Giá của item
     * @returns {Promise<object>} { success: boolean, message: string, reward: object }
     */
    async buyItem(itemId, price) {
        console.log(`CLIENT: Requesting to buy item ${itemId} for ${price} coins...`);
        await this._simulateNetworkDelay(200 + Math.random() * 300);

        // Import PlayerDataManager để kiểm tra và trừ tiền
        const PlayerDataManager = (await import('./PlayerDataManager')).default;

        // Kiểm tra đủ coin không
        if (PlayerDataManager.getCoin() < price) {
            console.log("SERVER SIM: Not enough coins!");
            return { 
                success: false, 
                message: 'Không đủ coin để mua item này!' 
            };
        }

        // Kiểm tra xem item đã được mua chưa
        const purchasedItems = this._getPurchasedItemsFromStorage();
        if (purchasedItems.includes(itemId)) {
            console.log("SERVER SIM: Item already purchased!");
            return { 
                success: false, 
                message: 'Item này đã được mua rồi!' 
            };
        }

        // Trừ tiền sử dụng method tập trung
        const coinSuccess = PlayerDataManager.updateCoins(-price);
        if (!coinSuccess) {
            return { 
                success: false, 
                message: 'Không đủ coin để mua item này!' 
            };
        }

        // Xác định loại reward và cập nhật inventory sử dụng method tập trung
        let reward = null;
        
        if (itemId.startsWith('ticket')) {
            const quantity = itemId === 'ticket' ? 1 : this._extractQuantityFromId(itemId);
            PlayerDataManager.updateTickets(quantity);
            reward = { type: 'ticket', quantity };
        } else if (itemId.startsWith('hammer_')) {
            const quantity = this._extractQuantityFromId(itemId);
            PlayerDataManager.updateBooster('hammer', quantity);
            reward = { type: 'booster_hammer', quantity };
        } else if (itemId.startsWith('swap_')) {
            const quantity = this._extractQuantityFromId(itemId);
            PlayerDataManager.updateBooster('swap', quantity);
            reward = { type: 'booster_swap', quantity };
        } else if (itemId.startsWith('rocket_')) {
            const quantity = this._extractQuantityFromId(itemId);
            PlayerDataManager.updateBooster('rocket', quantity);
            reward = { type: 'booster_rocket', quantity };
        } else if (itemId.startsWith('shuffle_')) {
            const quantity = this._extractQuantityFromId(itemId);
            PlayerDataManager.updateBooster('shuffle', quantity);
            reward = { type: 'booster_shuffle', quantity };
        } else if (itemId === 'lives') {
            PlayerDataManager.updateLives(2);
            reward = { type: 'lives', quantity: 2 };
        }

        // Lưu item vào danh sách đã mua
        purchasedItems.push(itemId);
        this._savePurchasedItemsToStorage(purchasedItems);

        console.log(`SERVER SIM: Item ${itemId} purchased successfully!`, reward);
        return { 
            success: true, 
            message: 'Mua thành công!',
            reward: reward
        };
    }

    /**
     * Lấy danh sách item đã mua trong shop hiện tại
     * @returns {Array<string>} Mảng ID các item đã mua
     */
    getPurchasedItems() {
        return this._getPurchasedItemsFromStorage();
    }

    /**
     * Lấy danh sách item đã mua từ localStorage
     * @returns {Array<string>}
     */
    _getPurchasedItemsFromStorage() {
        const stored = localStorage.getItem(this.MOCK_PURCHASED_ITEMS_KEY);
        if (stored) {
            try {
                const data = JSON.parse(stored);
                // Kiểm tra xem danh sách có thuộc về shop hiện tại không
                const shopData = JSON.parse(localStorage.getItem(this.MOCK_USER_SHOP_KEY) || '{}');
                if (data.shopExpires === shopData.expires_at) {
                    return data.items || [];
                }
            } catch (e) {
                console.error("Failed to parse purchased items", e);
            }
        }
        return [];
    }

    /**
     * Lưu danh sách item đã mua vào localStorage
     * @param {Array<string>} items
     */
    _savePurchasedItemsToStorage(items) {
        const shopData = JSON.parse(localStorage.getItem(this.MOCK_USER_SHOP_KEY) || '{}');
        const data = {
            shopExpires: shopData.expires_at,
            items: items
        };
        localStorage.setItem(this.MOCK_PURCHASED_ITEMS_KEY, JSON.stringify(data));
    }

    /**
     * Trích xuất số lượng từ itemId (ví dụ: "hammer_pack_3" -> 3, "hammer_1" -> 1)
     * @param {string} itemId
     * @returns {number}
     */
    _extractQuantityFromId(itemId) {
        const match = itemId.match(/(\d+)$/);
        return match ? parseInt(match[1]) : 1;
    }

    /**
     * API lấy thông tin người chơi
     * @returns {Promise<object>} { userId: string, username: string, level: number }
     */
    async getUserInfo() {
        console.log("CLIENT: Requesting user info...");
        await this._simulateNetworkDelay(200 + Math.random() * 300);

        // Import PlayerDataManager để lấy thông tin user
        const PlayerDataManager = (await import('./PlayerDataManager')).default;
        const userData = PlayerDataManager.getUserData();

        if (!userData) {
            console.error("SERVER SIM: User data not found!");
            return {
                userId: 'N/A',
                username: 'Player',
                level: 1
            };
        }

        const userInfo = {
            userId: userData.userId || 'N/A',
            username: userData.username || 'Player',
            level: userData.progression?.highestLevelUnlocked || 1
        };

        console.log("SERVER SIM: Returning user info:", userInfo);
        return userInfo;
    }
}

// Tạo một instance duy nhất (singleton) để sử dụng trong toàn bộ game
const instance = new APIManager();
export default instance;