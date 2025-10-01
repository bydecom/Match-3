// src/main.js
import Phaser from 'phaser';
// Sửa lại tên file cho đúng chuẩn: MainScene.js    
import { MainScene } from './scenes/Mainscene'; 

const config = {
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: '#1b1e27',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 480,
    height: 800,
  },
  scene: [MainScene]
};

const game = new Phaser.Game(config);

// --- LOGIC FULLSCREEN ĐƠN GIẢN VÀ HIỆU QUẢ ---

// Hàm để vào fullscreen (chỉ hoạt động trên Android/Desktop)
function enterFullscreen() {
  const element = document.documentElement;
  if (element.requestFullscreen) {
    element.requestFullscreen();
  } else if (element.webkitRequestFullscreen) { // Safari
    element.webkitRequestFullscreen();
  } else if (element.msRequestFullscreen) { // IE11
    element.msRequestFullscreen();
  }
}

// Tối ưu cho iOS (không có API fullscreen thực sự)
function optimizeForIOS() {
  console.log('🍎 Tối ưu hóa cho iOS: cố gắng ẩn thanh địa chỉ...');
  // Cuộn nhẹ để trình duyệt tự động ẩn thanh địa chỉ
  window.scrollTo(0, 1);

  // Kỹ thuật hiện đại hơn để chiếm toàn bộ chiều cao có sẵn
  const setViewportHeight = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    const app = document.getElementById('app');
    if (app) {
      app.style.height = 'calc(var(--vh, 1vh) * 100)';
    }
  };
  setViewportHeight();
  window.addEventListener('resize', setViewportHeight);
}

// Hàm khởi tạo chính
function initializeFullscreen() {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  if (isIOS) {
    // Trên iOS, chúng ta không thể tự vào fullscreen, chỉ có thể tối ưu
    optimizeForIOS();
    // Có thể thêm một nút bấm "Hướng dẫn" để chỉ người dùng cách thêm vào Màn hình chính
  } else {
    // Trên Android và Desktop, chúng ta chờ người dùng tương tác lần đầu
    console.log('🎮 Sẵn sàng vào fullscreen khi người dùng tương tác...');

    // Sử dụng "pointerdown" bao gồm cả click và touch
    // { once: true } là chìa khóa: listener sẽ tự động bị gỡ bỏ sau lần chạy đầu tiên
    document.addEventListener('pointerdown', () => {
      console.log('👆 Người dùng đã tương tác! Đang yêu cầu fullscreen...');
      enterFullscreen();
    }, { once: true });
  }
}

// Chạy hàm khởi tạo sau khi game đã sẵn sàng
game.events.on('ready', () => {
  console.log('🚀 Game đã sẵn sàng!');
  initializeFullscreen();
});