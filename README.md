# ⚡ VidioUpscaler Extension (Anime4K Web)

![Version](https://img.shields.io/badge/version-2.2.2-green?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)
![Status](https://img.shields.io/badge/status-Stable-4ade80?style=for-the-badge)

**Real-time video upscaling in your browser.**
Boost anime and video quality on YouTube, Bilibili, and other platforms using advanced WebGL shaders (Anime4K, FSR, Real-ESRGAN, and more).

---

## ✨ Key Features

### 🚀 Advanced Upscaling Models

Choose from **8 different algorithms** to best suit your content:

- **Anime4K Fast / HQ**: The gold standard for anime upscaling. Restores lines and reduces noise.
- **AMD FSR 1.0**: FidelityFX Super Resolution for sharp, high-performance upscaling.
- **Real-ESRGAN**: Neural-network inspired details and edge enhancement.
- **CAS (Contrast Adaptive Sharpening)**: Brings out texture and details.
- **xBRZ**: Perfect for pixel art and clean edge scaling.
- **Bicubic / Debug**: Standard scalers and diagnosis tools.

### 🎛️ Complete Control (v2.2+)

- **Sharpening Slider**: Fine-tune detail from **-100% (Soft)** to **+100% (Sharp)**.
- **Custom Resolution**: Scale videos to **4K**, **8K**, or any custom multiplier (e.g. `1.5x`, `3.0x`).
- **Render Delay Metrics**: Monitor GPU performance with precise frame-time (ms) overlays.

### 🛠️ comparison Mode

- **Before/After Slider**: Draggable split-screen comparison to see the difference instantly.
- **Instant Apply**: Settings change immediately without reloading the page.

---

## 📦 Installation

1. **Clone or Download** this repository.
2. Open **Chrome** (or Edge/Brave) and go to `chrome://extensions`.
3. Enable **Developer Mode** (top right toggle).
4. Click **Load Unpacked**.
5. Select the folder containing this extension.

---

## 🎮 How to Use

1. Open any video (e.g., YouTube).
2. The extension automatically activates. You'll see a green **"✨ Anime4K ON"** button.
3. **Shortcuts**:
    - `Alt + A`: Toggle ON/OFF
    - `Alt + S`: Open Settings Panel

### Settings Panel Guide

- **Model**: Switch between upscaling algorithms.
- **Resolution**: Pick `2x`, `4K`, `8K`, or set a **Custom Scale**.
- **Sharpening**: Drag to adjust edge strength.
- **Compare Mode**: Enable checking the "Compare Mode" box.

---

## ⚡ Performance Tips

- **GPU Usage**: This extension uses your Graphics Card (WebGL). High resolutions (4K/8K) requires a decent GPU.
- **Lower Delay**: If video stutters, try the **"Anime4K Fast"** model or reduce resolution to **1080p/2x**.

---

## 📜 Credits

- Based on the [Anime4K](https://github.com/bloc97/Anime4K) algorithm by bloc97.
- Extension implementation & shader ports by Akmal Hidayat.
