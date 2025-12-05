# Anime4K Web Upscaler - Release Log

## Version 2.2.4 (2025-12-05)

### Added

- **Universal Website Support** - Extension now works on **any website**, including those using embedded players (IFrames) and Shadow DOM (e.g. strict YouTube layouts, custom web players).
- **Deep Scanning** - Improved video detection algorithm to find video elements hidden deep within the page structure.

---

## Version 2.2.3 (2025-12-05)

### Improved

- **Fullscreen Experience** - Automatically hides the toggle button and settings panel when video goes fullscreen for a distraction-free viewing experience.

---

## Version 2.2.2 (2025-12-05)

### Fixed

- **Shader Compilation Error** - Fixed a critical issue where "u_sharpen" was redefined in some shaders, causing them to fail and fallback to the basic shader.

---

## Version 2.2.1 (2025-12-05)

### Fixed

- **Toggle Pause Bug** - Fixed issue where toggling the upscaler off caused a "frozen" image. It now cleanly hides the overlay.
- **Comparison Freeze** - Fixed comparison mode freezing when toggled.

### Added

- **8K Support** - Added **8K UHD (7680x4320)** resolution option.

### Changed

- **Settings Refresh** - "Apply" button now always reloads the page to prevent any glitches and ensure a clean state.

---

## Version 2.2.0 (2025-12-05)

### Added

- **Sharpening Control** - New slider from -100% (softer) to +100% (sharper). default is 0%.
- **Render Delay Metrics** - Check "Show Render Delay" to see how long each frame takes to process (in ms).
- **Custom Resolution** - Choose "Custom Scale" to set any multiplier (e.g., 1.5x, 3.0x).
- **Instant Apply** - Changing Sharpening or Resolution no longer requires a page reload!

---

## Version 2.1.7 (2025-12-05)

### Fixed

- **Precise Geometry Matching** - Now syncs overlay size/position with video exactly
- Instead of relying on `100%` width/height (which can fail if container is different size), the upscaler now mimics the exact `offsetLeft`, `offsetTop`, `width`, and `height` of the video element
- Updates these values every frame to handle player resizing or layout changes

---

## Version 2.1.6 (2025-12-05)

### Fixed

- **Final Visibility Fix** - Set overlay Z-index to maximum
- Now using `z-index: 2147483640` inside the video container
- This forces the upscaler to be **always on top of the video**, but because it's inside the video container, it correctly stays **behind the player controls**
- Best of both worlds: Visible effects + Usable controls

---

## Version 2.1.5 (2025-12-05)

### Fixed

- **Visibility & Controls Balance** - Fine-tuned stacking order
- Increased Z-index to 10 to ensure upscaler stays above the video
- Inserted layer immediately after the video element to maintain correct hierarchy
- This solves the issue where the upscaler disappeared for some users while keeping controls accessible

---

## Version 2.1.4 (2025-12-05)

### Fixed

- **UI Overlay Fix** - Reverted "fixed positioning" change that was blocking YouTube controls
- Wrapper now sits correctly between the video and the player controls (`z-index: 1`)
- You can now use the YouTube timeline/buttons again while upscaling is active

---

## Version 2.1.3 (2025-12-05)

### Changed

- **Restored original shader algorithms** - Reverted "Extreme" strength shaders back to balanced, authentic versions for better quality
- Anime4K Fast, Real-ESRGAN, and CAS now produce cleaner, less artifact-heavy results

### Added

- **"Show Info Overlays" option** - New setting to toggle the visibility of model/resolution info labels
- You can now enjoy a clean full-screen experience without the overlay text

---

## Version 2.1.2 (2025-12-05)

### Fixed

- **Complete positioning rewrite** - Changed from relative to fixed positioning
- Wrapper now uses `position: fixed` with `z-index: 2147483646` (max - 1)
- Wrapper position syncs with video element every frame via `getBoundingClientRect`
- Appends directly to `document.body` to bypass YouTube's z-index stacking

---

## Version 2.1.1 (2025-12-05)

### Fixed

- **Canvas not covering video** - Added `position:absolute`, `background:#000` to canvas
- **WebGL clear** - Added gl.clearColor and gl.clear before drawing
- **Uniform rebinding** - Now sets texture uniform and texSize every frame

---

## Version 2.1.0 (2025-12-05)

### Added

- **Debug Mode** - New "Debug (Grayscale)" shader that converts video to grayscale
- If you see grayscale video, the shader system is working correctly
- Helps diagnose if shaders are being applied

### Changed

- Debug shader is first option in model dropdown for easy testing

---

## Version 2.0.9 (2025-12-05)

### Changed

- **Increased shader effect strength** - All shaders now have much more visible effects
- Anime4K Fast: Increased SHARP_STRENGTH to 0.5, EDGE_STRENGTH to 0.8
- Real-ESRGAN: Increased SHARP_AMOUNT to 0.7, DETAIL_BOOST to 1.5, EDGE_ENHANCE to 0.6
- CAS: Increased SHARPNESS to 1.0
- Built-in fallback shader now uses strong unsharp mask (0.8 strength)

### Added

- Detailed console logging to debug shader loading
- Logs available shaders, requested model, and shader code length

---

## Version 2.0.8 (2025-12-05)

### Fixed

- **Critical: WebGL buffer binding** - Fixed vertex attribute buffer binding order
- Buffers now properly rebound before each draw call
- Added `setupAttributes()` function to ensure correct buffer state
- Added `gl.useProgram()` in render loop to ensure shader program is active

### Technical Details

- Position buffer and texture coordinate buffer were not being bound correctly
- `vertexAttribPointer` requires the correct buffer to be bound at call time
- Now rebinds buffers before every frame to ensure consistent state

---

## Version 2.0.7 (2025-12-05)

### Fixed

- **Comparison slider UI** - Complete overhaul of the comparison slider

### Improved

- Slider now has gradient glow effect for better visibility
- Larger handle (44px) with gradient background and drop shadow
- Added arrow indicators (▼ ▲) at top and bottom of slider line
- Added "Enhanced" label on left side showing upscaled resolution
- Touch support for mobile/tablet devices (touchstart, touchmove, touchend)
- Better event handling with proper preventDefault
- Labels now have drop shadows for better visibility

---

## Version 2.0.6 (2025-12-05)

### Fixed

- **Critical: anime4k_fast.js bug** - Line 32 was overwriting edge detection result, causing the shader to only do basic sharpening regardless of edge analysis

### Changed

- **Complete shader algorithm rewrite** - All 7 shaders now implement authentic algorithms with visibly different results:
  - **Anime4K Fast** - Mode A (Restore CNN Soft) with Sobel gradient, edge thinning, line reconstruction
  - **Anime4K HQ** - Mode A+A (Restore CNN Strong) with 5x5 sampling, 4-pass pipeline, bilateral filtering
  - **FSR 1.0** - EASU + RCAS with 12-tap sampling, edge-adaptive upsampling, contrast sharpening
  - **xBRZ** - Pattern-based pixel art scaler with corner/line detection, YCbCr color distance
  - **CAS** - Contrast Adaptive Sharpening with per-channel contrast, ringing prevention
  - **Bicubic** - Mitchell-Netravali kernel (B=C=1/3) with 16-tap 4x4 grid sampling
  - **Real-ESRGAN** - Neural-inspired with bilateral filtering, texture detection, adaptive detail enhancement

### Improved

- Each shader now produces distinctly different visual results
- Better edge detection and preservation across all shaders
- Reduced ringing artifacts in sharpening shaders

---

## Version 2.0.5 (2025-12-05)

### Fixed

- **Critical: Complete WebGL rewrite** - Upscaler now works properly
- **Shader variable consistency** - All shaders use `v_texCoord`, `u_texture`, `u_texSize`
- **Built-in fallback shader** - If external shaders fail, uses built-in Anime4K shader
- **Proper texture coordinate handling** - Fixed UV flipping for correct video orientation

### Changed

- Cleaner code structure with better error handling
- Improved logging for debugging
- Uses WeakMap for video tracking (better memory management)

---

## Version 2.0.4 (2025-12-05)

### Added

- **4x and 8x resolution modes** - Higher upscaling options
- **2K QHD (1440p) mode** - Mid-range resolution option
- **Auto resolution detection** - Automatically detects when video resolution changes (e.g., YouTube quality switch) and updates canvas accordingly

### Improved

- Better resolution display in label (shows actual output dimensions)
- Cleaner settings panel layout

---

## Version 2.0.3 (2025-12-05)

### Fixed

- **Critical: Shader variable mismatch** - All shaders now use consistent `vUV` variable
- **Vertex shader UV flip** - Fixed upside-down rendering
- **Simplified entire codebase** - Removed complex wrapper logic

### Changed

- Renamed shader uniform from `v_texCoord` to `vUV`
- Renamed texture uniform from `u_videoTexture` to `tex`
- Cleaner, more readable code structure

---

## Version 2.0.2 (2025-12-05)

### Fixed

- **Upscaler rendering** - Changed to GL_TRIANGLES for proper WebGL rendering
- **Comparison slider** - Slider handle now visible and draggable
- **Touch support** - Slider works on touch devices

### Improved

- Container structure for better element positioning
- Slider visual design with gradient and glow effect
- Labels positioning and styling

---

## Version 2.0.1 (2025-12-05)

### Fixed

- Comparison mode slider now visible and working
- UI elements (labels, info badges) now properly displayed
- Settings panel positioning improved

---

## Version 2.0.0 (2025-12-05)

### Fixed

- **White screen issue** - Changed from wrapper to overlay approach
- Canvas now renders correctly over video

### Changed

- Complete rewrite of video processing logic
- Canvas positioned as sibling overlay instead of wrapper
- Simplified DOM manipulation

### Added

- Modular shader architecture (Model/ folder)
- 7 upscaling models: Anime4K Fast, Anime4K HQ, FSR, xBRZ, CAS, Bicubic, Real-ESRGAN
- 4x and 8x resolution options
- FPS counter
- Performance mode
- Keyboard shortcuts (Alt+A, Alt+S)

---

## Version 1.x (Legacy)

- Initial implementation
- Basic Anime4K upscaling
- Comparison slider
- Settings panel
