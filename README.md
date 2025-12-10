# ⚡ NextClarity - Video Upscaler Extension

![Version](https://img.shields.io/badge/version-2.8.7-green?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)
![Status](https://img.shields.io/badge/status-Stable-4ade80?style=for-the-badge)

**Real-time video upscaling in your browser.**
Boost anime and video quality on YouTube, Bilibili, and other platforms using advanced WebGL shaders (Anime4K, FSR, Real-ESRGAN, and more).

---

## ✨ Key Features

### 🚀 Advanced Upscaling Models

Choose from **10 different algorithms** to best suit your content:

- **Anime4K Fast / HQ**: The gold standard for anime upscaling. Restores lines and reduces noise.
- **Lanczos3**: High-quality reconstruction filter with excellent frequency response. Best for general-purpose upscaling.
- **ESRGAN**: Enhanced Super-Resolution GAN with edge-aware adaptive sharpening and edge preservation.
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

### ⚡ Optimized Rendering (v2.7.0+)

- **Multi-Strategy Rendering**: Automatically selects the best rendering path based on GPU capabilities:
  - **OffscreenCanvas + WebWorker**: Offloads rendering to a separate thread for maximum main-thread performance
  - **WebGL2**: Enables advanced GPU features for improved quality and efficiency
  - **WebGL1 Fallback**: Reliable compatibility on older systems
- **Quality Presets**: Auto, Low, Medium, High — choose resolution caps based on your hardware
- **Instance Limiting**: Control maximum concurrent upscalers on a single page (1-32)
- **WebGL2 Extensions**:
  - Anisotropic Filtering: Sharper textures at acute angles
  - GPU Vendor/Renderer Detection: Optimize for specific GPU types
  - Explicit Context Cleanup: Prevents context exhaustion on multi-video pages

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
2. The extension automatically activates. You'll see a green **"✨ NextClarity ON"** button.
3. **Shortcuts**:
    - `Alt + U`: Toggle ON/OFF
    - Click Extension Icon: Open Settings Panel

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

## 🛠️ Development

### Project Structure (v2.8.2+)

The codebase has been refactored into modular components:

```
VidioUpscaler-extension/
├── src/
│   ├── config.js              # Shared configuration & constants
│   ├── content-main.js        # Content script entry point
│   ├── popup-main.js          # Popup script entry point
│   ├── worker-main.js         # Worker script entry point
│   ├── core/
│   │   └── video-processor.js # Core video processing logic
│   └── utils/
│       ├── webgl-utils.js     # WebGL helper functions
│       ├── dom-utils.js       # DOM manipulation utilities
│       ├── shader-utils.js    # Shader compilation utilities
│       └── resolution-utils.js # Resolution calculation utilities
├── Model/                      # Shader model files
├── popup.html                  # Extension popup UI
├── popup.js                    # Popup script (legacy, still works)
├── manifest.json               # Chrome extension manifest
├── package.json                # Node.js dependencies & scripts
└── build.js                    # Build script for bundling
```

### Build Commands

```bash
# Install development dependencies
npm install

# Build bundled extension to /dist
npm run build

# Watch mode - auto-rebuild on changes
npm run build:watch

# Clean dist folder
npm run clean

# Lint source files
npm run lint
```

### Development Workflow

1. **Direct Development**: Load the extension folder directly in Chrome. Changes to files are reflected after refreshing the page.

2. **Build for Distribution**: Run `npm run build` to create optimized, bundled files in `/dist`. Use this folder for production releases.

---

## 📜 Credits

- Based on the [Anime4K](https://github.com/bloc97/Anime4K) algorithm by bloc97.
- Extension implementation & shader ports by Akmal Hidayat.

---
