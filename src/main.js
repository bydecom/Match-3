// src/main.js
import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { PreloaderScene } from './scenes/PreloaderScene';
// Vẫn import MainScene để sẵn sàng cho sau này
import { MainScene } from './scenes/MainScene';

// --- BƯỚC 1: ĐỊNH NGHĨA CONFIG ---
const config = {
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: '#1b1e27',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 576,
    height: 1024,
  },
  // --- THAY ĐỔI QUAN TRỌNG NHẤT Ở ĐÂY ---
  // Tạm thời chỉ cho game biết đến 2 scene này.
  // Bằng cách này, sau khi PreloaderScene xong, nó sẽ không có scene nào để tự động chuyển đến.
  scene: [BootScene, PreloaderScene] 
};

// --- BƯỚC 2: HÀM KHỞI TẠO APP VÀ GAME ---
function initializeApp() {
  const fullscreenButton = document.getElementById('fullscreen-button');

  const enterFullscreen = () => {
    const element = document.documentElement;
    if (element.requestFullscreen) {
      element.requestFullscreen();
    } else if (element.webkitRequestFullscreen) {
      element.webkitRequestFullscreen();
    }
  }

  fullscreenButton.addEventListener('click', () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (!isIOS) {
      enterFullscreen();
    }
    fullscreenButton.style.display = 'none';

    // Gán đối tượng game vừa được tạo vào một biến hằng số tên là 'game'
    const game = new Phaser.Game(config);

    // Thêm listener để xử lý lỗi mất scene khi thoát fullscreen
    // document.addEventListener('fullscreenchange', () => {
    //   setTimeout(() => {
    //     // Lấy scene đang hoạt động
    //     const currentScenes = game.scene.getScenes(true);
    //     if (currentScenes && currentScenes.length > 0) {
    //         // Khởi động lại scene đầu tiên đang hoạt động
    //         // Trong trường hợp của bạn, đó sẽ là PreloaderScene
    //         currentScenes[0].scene.restart();
    //     }
    // }, 100);
    // });

  }, { once: true });
}

// Chạy hàm khởi tạo
initializeApp();