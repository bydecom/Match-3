// src/managers/AudioManager.js

/**
 * AudioManager - Quản lý âm lượng cho Music và Sound Effects
 * Singleton pattern để dùng chung trong toàn bộ game
 */
class AudioManager {
    constructor() {
        if (AudioManager.instance) {
            return AudioManager.instance;
        }
        AudioManager.instance = this;

        // Đọc volume từ localStorage (hoặc dùng giá trị mặc định)
        this.musicVolume = parseFloat(localStorage.getItem('musicVolume') || '0.3'); // 0.3 = 30%
        this.soundVolume = parseFloat(localStorage.getItem('soundVolume') || '0.5'); // 0.5 = 50%
        
        // Lưu tham chiếu đến game instance
        this.game = null;
        
        console.log(`[AudioManager] Initialized - Music: ${this.musicVolume}, Sound: ${this.soundVolume}`);
    }

    /**
     * Lấy instance của AudioManager
     */
    static getInstance() {
        if (!AudioManager.instance) {
            AudioManager.instance = new AudioManager();
        }
        return AudioManager.instance;
    }
    
    /**
     * Set game instance để có thể emit event
     * @param {Phaser.Game} game 
     */
    setGame(game) {
        this.game = game;
        console.log('[AudioManager] Game instance set');
    }

    /**
     * Thiết lập âm lượng nhạc nền (Music)
     * @param {number} volume - Giá trị từ 0.0 đến 1.0
     */
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume)); // Clamp 0-1
        localStorage.setItem('musicVolume', this.musicVolume.toString());
        console.log(`[AudioManager] Music Volume set to: ${this.musicVolume}`);
        
        // Emit event để các scene khác cập nhật
        if (this.game && this.game.events) {
            this.game.events.emit('musicVolumeChanged', this.musicVolume);
        } else if (typeof window !== 'undefined' && window.game && window.game.events) {
            window.game.events.emit('musicVolumeChanged', this.musicVolume);
        } else {
            console.warn('[AudioManager] Cannot emit musicVolumeChanged: game instance not set');
        }
    }

    /**
     * Thiết lập âm lượng hiệu ứng âm thanh (Sound Effects)
     * @param {number} volume - Giá trị từ 0.0 đến 1.0
     */
    setSoundVolume(volume) {
        this.soundVolume = Math.max(0, Math.min(1, volume)); // Clamp 0-1
        localStorage.setItem('soundVolume', this.soundVolume.toString());
        console.log(`[AudioManager] Sound Volume set to: ${this.soundVolume}`);
        
        // Emit event để các scene khác cập nhật
        if (this.game && this.game.events) {
            this.game.events.emit('soundVolumeChanged', this.soundVolume);
        } else if (typeof window !== 'undefined' && window.game && window.game.events) {
            window.game.events.emit('soundVolumeChanged', this.soundVolume);
        } else {
            console.warn('[AudioManager] Cannot emit soundVolumeChanged: game instance not set');
        }
    }

    /**
     * Lấy âm lượng nhạc nền
     * @returns {number} Giá trị từ 0.0 đến 1.0
     */
    getMusicVolume() {
        return this.musicVolume;
    }

    /**
     * Lấy âm lượng hiệu ứng âm thanh
     * @returns {number} Giá trị từ 0.0 đến 1.0
     */
    getSoundVolume() {
        return this.soundVolume;
    }

    /**
     * Reset về giá trị mặc định
     */
    reset() {
        this.setMusicVolume(0.3);
        this.setSoundVolume(0.5);
    }
}

// Export singleton instance
export default AudioManager.getInstance();

