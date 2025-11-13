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
            { id: 'hammer_1', icon: 'booster_hammer', price: 100, isDiscounted: false, originalPrice: 100 },
            { id: 'swap_1', icon: 'booster_swap', price: 100, isDiscounted: false, originalPrice: 100 },
            { id: 'rocket_1', icon: 'booster_rocket', price: 150, isDiscounted: false, originalPrice: 150 },
            { id: 'shuffle_1', icon: 'booster_shuffle', price: 150, isDiscounted: false, originalPrice: 150 },
            { id: 'hammer_pack_3', icon: 'booster_hammer', price: 250, isDiscounted: true, originalPrice: 300 },
            { id: 'swap_pack_3', icon: 'booster_swap', price: 250, isDiscounted: true, originalPrice: 300 },
            { id: 'rocket_pack_3', icon: 'booster_rocket', price: 400, isDiscounted: true, originalPrice: 450 },
            { id: 'shuffle_pack_3', icon: 'booster_shuffle', price: 400, isDiscounted: true, originalPrice: 450 },
            { id: 'coins_small', icon: 'coin', price: 0.99, isDiscounted: false, originalPrice: 0.99 }, // Ví dụ item IAP
            { id: 'lives_full', icon: 'heart', price: 100, isDiscounted: false, originalPrice: 100 }
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
}

// Tạo một instance duy nhất (singleton) để sử dụng trong toàn bộ game
const instance = new APIManager();
export default instance;