// src/managers/PlayerDataManager.js

/**
 * Đây là một trình quản lý dữ liệu đơn giản trong bộ nhớ để demo.
 * Trong game thực tế, file này sẽ xử lý việc lưu/tải dữ liệu
 * từ localStorage hoặc từ server của bạn.
 */
class PlayerDataManager {
    constructor() {
        // Dữ liệu người chơi giả lập bạn đã cung cấp
        this.userData = {
            "userId": "user_1a2b3c4d5e",
            "username": "PlayerOne",
            "avatarId": "avatar_003",
            "lastLogin": "2024-07-22T10:30:00Z",
            "createdAt": "2024-07-01T09:00:00Z",
            
            "progression": {
                "highestLevelUnlocked": 5,
                "levelStars": {
                    "1": 3,
                    "2": 2,
                    "3": 3,
                    "4": 1
                }
            },
            
            "currency": {
                "coins": 1500,
                "gems": 50,
                "lives": 5,
                "lastLifeRefillTimestamp": 1721644200000 
            },
            
            "inventory": {
                "boosters": {
                    "hammer": 3,
                    "swap": 5,
                    "rocket": 2,
                    "shuffle": 4
                }
            },
            
            "settings": {
                "soundVolume": 0.8,
                "musicVolume": 0.6,
                "notificationsEnabled": true
            },
            
            "stats": {
                "totalScore": 125430,
                "matchesMade": 5678,
                "powerupsUsed": 345,
                "levelsWon": 4,
                "levelsLost": 2
            }
        };
    }

    /**
     * Lấy dữ liệu tiến trình của người chơi (level đã mở và số sao).
     * @returns {object} Đối tượng progression.
     */
    getProgression() {
        return this.userData.progression;
    }

    /**
     * Lấy toàn bộ dữ liệu người chơi.
     * @returns {object} Toàn bộ dữ liệu người chơi.
     */
    getUserData() {
        return this.userData;
    }

    // Ví dụ về các hàm bạn sẽ thêm sau này:
    // setLevelStars(levelId, stars) { 
    //   this.userData.progression.levelStars[levelId] = stars;
    //   this.save(); // Lưu lại thay đổi
    // }
    // save() { /* code lưu vào localStorage */ }
    // load() { /* code tải từ localStorage */ }
}

// Tạo một thực thể duy nhất (singleton) để sử dụng trong toàn bộ game
const instance = new PlayerDataManager();
export default instance;