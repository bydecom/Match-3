// src/managers/PlayerDataManager.js

const STORAGE_KEY_USER_ID = 'phaser_game_user_id';

const STORAGE_KEY_DATA_PREFIX = 'phaser_game_data_';

class PlayerDataManager {

    constructor() {

        this.userData = null;

        this.init();

    }



    /**

     * KHỞI TẠO:

     * - Kiểm tra Storage.

     * - Nếu chưa có ID -> Tạo ID mới -> Tạo Data mặc định -> Lưu.

     * - Nếu có ID -> Load Data lên.

     */

    init() {

        let userId = localStorage.getItem(STORAGE_KEY_USER_ID);



        if (userId) {

            console.log(`[PlayerDataManager] Found User ID: ${userId}`);

            const loadedData = this._loadDataFromStorage(userId);

            

            if (loadedData) {

                this.userData = loadedData;

                // Migration: Đảm bảo cấu trúc data luôn đủ field (tránh lỗi khi update game)

                this._ensureDataStructure();

            } else {

                console.warn("[PlayerDataManager] ID exists but data missing. Re-creating...");

                this._createNewUser(userId);

            }

        } else {

            console.log("[PlayerDataManager] New user! Creating profile...");

            const newId = this._generateUniqueId();

            localStorage.setItem(STORAGE_KEY_USER_ID, newId);

            this._createNewUser(newId);

        }

    }



    // =================================================================

    // PHẦN 1: PRIVATE METHODS (Xử lý Logic nội bộ)

    // =================================================================



    _generateUniqueId() {

        // Tạo ID là dãy số 8 chữ số từ timestamp và random để đảm bảo unique

        const timestamp = Date.now(); // Lấy phần cuối của timestamp

        const random = Math.floor(Math.random() * 10000); // 4 chữ số

        // Lấy 4 chữ số cuối của timestamp + 4 chữ số random = 8 chữ số

        const timestampSuffix = timestamp.toString().slice(-4);

        const randomStr = random.toString().padStart(4, '0');

        return timestampSuffix + randomStr;

    }



    _createNewUser(userId) {

        this.userData = {

            "userId": userId,

            "username": "Player_" + userId.slice(-4),

            "avatarId": "avatar_001",

            "createdAt": new Date().toISOString(),

            "lastLogin": new Date().toISOString(),



            // 1. Tiến trình chơi

            "progression": {

                "highestLevelUnlocked": 1,

                "levelStars": {} // { "1": 3, "2": 1 ... }

            },



            // 2. Tài nguyên

            "currency": {

                "coins": 10000,

                "lives": 100,  // Sửa thành 10 tim

                "tickets": 100 // Vé quay

            },



            // 3. Kho đồ (Boosters)

            "inventory": {

                "boosters": {

                    "hammer": 9,  // Sửa thành 2

                    "swap": 9,    // Sửa thành 2

                    "rocket": 9,  // Sửa thành 2

                    "shuffle": 9  // Sửa thành 2

                }

            },



            // 4. Cài đặt

            "settings": {

                "soundVolume": 1,

                "musicVolume": 1

            }

        };

        this._saveToStorage();

    }



    _loadDataFromStorage(userId) {

        try {

            const dataString = localStorage.getItem(STORAGE_KEY_DATA_PREFIX + userId);

            return dataString ? JSON.parse(dataString) : null;

        } catch (e) {

            console.error("Lỗi load data:", e);

            return null;

        }

    }



    /**

     * Hàm quan trọng nhất: Ghi đè JSON hiện tại xuống ổ cứng.

     * Được gọi tự động sau mỗi hành động thay đổi data.

     */

    _saveToStorage() {

        if (this.userData && this.userData.userId) {

            try {

                const dataString = JSON.stringify(this.userData);

                localStorage.setItem(STORAGE_KEY_DATA_PREFIX + this.userData.userId, dataString);

                // console.log("[Data Saved]"); // Bật lên nếu muốn debug log

            } catch (e) {

                console.error("Lỗi save data:", e);

            }

        }

    }



    /**

     * Đảm bảo các field mới thêm vào game sau này không bị undefined với user cũ

     */

    _ensureDataStructure() {

        if (!this.userData.inventory) this.userData.inventory = { boosters: {} };

        if (!this.userData.currency) this.userData.currency = { coins: 0, lives: 5, tickets: 0 };

        if (!this.userData.progression) this.userData.progression = { highestLevelUnlocked: 1, levelStars: {} };

        if (!this.userData.settings) this.userData.settings = { soundVolume: 1, musicVolume: 1 };

        // Thêm các check khác nếu game update...

    }



    // =================================================================

    // PHẦN 2: PUBLIC GETTERS (Chỉ đọc dữ liệu)

    // =================================================================



    getUserData() {

        return this.userData;

    }



    getCoin() {

        return this.userData.currency.coins || 0;

    }



    getLives() {

        return this.userData.currency.lives || 0;

    }



    getTickets() {

        return this.userData.currency.tickets || 0;

    }



    getBoosterCount(type) {

        // type: 'hammer', 'rocket', ...

        return this.userData.inventory.boosters[type] || 0;

    }



    getLevelStars(levelId) {

        return this.userData.progression.levelStars[levelId] || 0;

    }



    getHighestLevelUnlocked() {

        return this.userData.progression.highestLevelUnlocked || 1;

    }



    getProgression() {

        return this.userData.progression;

    }



    // =================================================================

    // PHẦN 3: PUBLIC ACTIONS (Thay đổi dữ liệu & Tự động Save)

    // =================================================================



    /**

     * Thay đổi số lượng Coin (cộng hoặc trừ)

     * @param {number} amount - Số lượng (dương để cộng, âm để trừ)

     * @returns {boolean} true nếu thành công, false nếu không đủ tiền

     */

    updateCoins(amount) {

        const current = this.userData.currency.coins || 0;

        if (current + amount < 0) return false; // Không đủ tiền



        this.userData.currency.coins = current + amount;

        this._saveToStorage(); // <--- TỰ ĐỘNG LƯU

        return true;

    }



    updateLives(amount) {

        this.userData.currency.lives = Math.max(0, (this.userData.currency.lives || 0) + amount);

        this._saveToStorage();

    }



    updateTickets(amount) {

        this.userData.currency.tickets = Math.max(0, (this.userData.currency.tickets || 0) + amount);

        this._saveToStorage();

    }



    /**

     * Thay đổi số lượng Booster

     * @param {string} type - 'hammer', 'swap', ...

     * @param {number} amount - Số lượng (dương/âm)

     * @returns {boolean} true nếu thành công, false nếu không đủ item

     */

    updateBooster(type, amount) {

        if (!this.userData.inventory.boosters[type]) {

            this.userData.inventory.boosters[type] = 0;

        }

        

        const current = this.userData.inventory.boosters[type];

        if (current + amount < 0) return false;



        this.userData.inventory.boosters[type] = current + amount;

        this._saveToStorage();

        return true;

    }



    /**

     * Cập nhật tiến độ khi thắng level

     */

    completeLevel(levelId, stars) {

        // Ép kiểu số để tránh lỗi String vs Number trên Host
        const numericLevelId = parseInt(levelId, 10);
        const numericStars = parseInt(stars, 10);
        const currentHighest = parseInt(this.userData.progression.highestLevelUnlocked, 10);

        console.log(`[PlayerDataManager] completeLevel called - LevelID: ${numericLevelId} (${typeof numericLevelId}), Stars: ${numericStars}`);

        // 1. Cập nhật sao (chỉ lấy kết quả cao nhất)

        const currentStars = this.userData.progression.levelStars[numericLevelId] || 0;

        if (numericStars > currentStars) {

            this.userData.progression.levelStars[numericLevelId] = numericStars;

        }



        // 2. Mở khóa level tiếp theo (CHỈ KHI ĐẠT ÍT NHẤT 1 SAO)

        if (numericStars >= 1 && numericLevelId >= currentHighest) {

            this.userData.progression.highestLevelUnlocked = numericLevelId + 1;
            console.log(`[Progression] Level ${numericLevelId + 1} đã được mở khóa!`);

        } else if (numericStars < 1) {

            console.log(`[Progression] Không đủ sao (${numericStars}) để mở khóa level tiếp theo`);

        }



        this._saveToStorage();

        console.log(`[Progression] Completed Level ${numericLevelId}. Next Unlock: ${this.userData.progression.highestLevelUnlocked}`);

    }

}



// Singleton

const instance = new PlayerDataManager();

export default instance;
