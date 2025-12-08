# Anime4K Web Upscaler - Release Log

> NOTE When making changes to this repository , must:
> - Update `ReleaseLog.md` with a changelog entry describing the change.
> - Update `manifest.json` version and any metadata as appropriate.
> - Update `README.md` where relevant (version badge, usage notes).
This note is intentionally placed at the top of the release log so downstream reviewers see the requirement.

## Version 2.8.1 (2025-12-08)

### Fixed

- **Model Change Detection** - Improved storage listener logging in content.js to properly detect and handle model changes. Fixed issue where changing model in popup might not immediately reload upscalers by adding enhanced logging and state verification.

- **Storage Load Verification** - Improved initial config loading from chrome.storage.sync to include null checks and better error handling.

### Changed

- Added comprehensive debug logging for storage operations (load, save, change detection)
- Enhanced popup save function to log successful saves to console for troubleshooting
- Storage listener now logs all changes to help identify configuration update issues

### Technical Details

- Added console logging at key points: config load, save, and change detection
- Improved null/undefined checks in storage callback handlers
- All model changes now trigger proper upscaler restart with visible console logs

---

## Version 2.8.0 (2025-12-08)

### Added

- **Lanczos3 Upscaler** - High-quality reconstruction filter with excellent frequency response. Uses 6x6 Lanczos3 kernel with optional sharpening. Best for general-purpose video upscaling with minimal artifacts and excellent edge definition.

- **ESRGAN Upscaler** - Enhanced Super-Resolution GAN-inspired shader with edge-aware adaptive sharpening. Features Sobel edge detection for content-aware quality adjustment: edges receive stronger sharpening while smooth areas remain artifact-free. Excellent for both anime and photorealistic content.

### Changed

- **Model Count**: Expanded from 8 to 10 available upscaling algorithms
- Updated popup model selector with new Lanczos3 and ESRGAN options
- Enhanced README with descriptions of new upscalers

### Technical Details

- **Lanczos3**: 6x6 convolution kernel with sinc-based windowing function, industry-standard for high-quality resampling
- **ESRGAN**: 4x4 Catmull-Rom cubic interpolation with Sobel gradient detection for adaptive filter strength
- Both new models support full configuration integration (sharpening slider, quality presets, instance limits)

---

## Version 2.7.1 (2025-12-08)

### Fixed

- **WebGL Texture Bind Error** - Fixed `INVALID_OPERATION: texParameter: no texture bound to target` error in anisotropic filtering setup. Moved texture parameter application from extension detection phase to actual texture creation, ensuring texture is bound before applying parameters.

### Changed

- Anisotropic filtering now only applies when a texture is actually created and bound, preventing premature texture operations
- Added defensive try-catch wrapper around anisotropic filter application for better error handling

---

## Version 2.7.0 (2025-12-08)

### Added

- **OffscreenCanvas/WebGL2 Rendering Optimization** - Implemented multi-strategy rendering system that automatically selects the best GPU rendering path based on browser capabilities:
  - **Worker-based OffscreenCanvas rendering**: Offloads GPU rendering to a separate WebWorker thread when both OffscreenCanvas and WebGL2 are available, keeping main thread responsive for smooth video playback
  - **WebGL2 context preference**: Automatically upgrades to WebGL2 when available for advanced GPU features
  - **WebGL1 fallback**: Reliable compatibility layer for older browsers and devices
  
- **WebGL2 Extensions & Features**:
  - **Anisotropic texture filtering** (EXT_texture_filter_anisotropic): Sharper, higher-quality textures at steep viewing angles
  - **GPU vendor/renderer detection** (WEBGL_debug_renderer_info): Logs GPU type for optimization and diagnostics
  - **Explicit texture float support detection** (OES_texture_float, OES_texture_half_float): Enables high-precision rendering on capable GPUs
  - **Instancing support check** (ANGLE_instanced_arrays): Prepares for future batch rendering optimizations

- **Worker rendering infrastructure** (`worker.js`): Complete GPU rendering pipeline running in a separate thread with dedicated shader compilation, texture management, and frame processing

### Changed

- **Manifest v2.7.0**: Added `web_accessible_resources` configuration to allow content script to spawn rendering worker
- **Console logging** now reports selected render strategy (worker-offscreen | webgl2-main | webgl1-main) and GPU vendor/renderer info when available
- **Performance**: Main thread is now free from GPU rendering when using OffscreenCanvas + WebWorker, improving UI responsiveness on high-demand pages

### Technical Details

- Worker selection logic: OffscreenCanvas + WebGL2 → WebGL2 main-thread → WebGL1 main-thread fallback
- All WebGL2 extensions are wrapped in try-catch to gracefully degrade on unsupported hardware
- OffscreenCanvas rendering falls back to main-thread WebGL if worker initialization fails
- GPU memory is explicitly released via WEBGL_lose_context extension to prevent context exhaustion

---

## Version 2.6.6 (2025-12-08)

### Fixed

- **WebGL Context Leak** - Fixed excessive WebGL context creation warning ("Oldest context will be lost") by explicitly calling `WEBGL_lose_context` extension on cleanup. Improved instance limit enforcement to reject videos before context creation when max instances reached.

### Changed

- Added debug logging for context creation/destruction to track active WebGL contexts and help diagnose context exhaustion issues.

## Version 2.6.5 (2025-12-08)

### Added

- **Validation & Accessibility** - Added in-popup validation messages (red text) for out-of-range `maxInstances` values. Added keyboard accessibility: arrow keys (up/down) to increment/decrement max instances without clicking stepper buttons.

### Changed

- Improved popup UX with live validation feedback and keyboard navigation support for better accessibility and user experience.

## Version 2.6.4 (2025-12-08)

### Added

- **Max Instances UX** - Added stepper buttons and input validation for the `maxInstances` popup control; input is clamped to the configured min/max (1–32) and saved under `anime4k_config`.

### Changed

- Clamped `maxInstances` on save and applied immediate effect; improved popup UX to prevent invalid values and make it easier to adjust instance limits.

## Version 2.6.3 (2025-12-08)

### Added

- **Popup Controls** - Added user controls in the browser popup to select `qualityPreset` (auto/low/medium/high) and adjust `maxInstances` (concurrent upscalers). Settings are persisted to `chrome.storage.sync` under `anime4k_config`.

### Changed

- Persist popup settings under `anime4k_config` and wire the popup to support legacy flat keys; content scripts will receive structured `onChanged` updates for seamless live configuration.

## Version 2.6.2 (2025-12-08)

### Added

- **Renderer detection & safety** - Detect WebGL2 and `OffscreenCanvas` availability and add quality presets to avoid OOM on weaker devices. Added `qualityPreset` and `maxInstances` configuration options to cap output resolution and concurrent upscalers per page.

### Changed

- Enforced instance limits and applied quality caps (low/medium/high/auto) so large upscaler instances do not exhaust GPU memory on pages with many videos.

## Version 2.6.1 (2025-12-08)

### Added

- **AI Agent Instructions** - Added `AI_AGENT_INSTRUCTIONS.md` containing a mandatory checklist that automated agents must follow when modifying this repository (update `README.md`, `ReleaseLog.md`, and `manifest.json`).

### Changed

- Updated `README.md` to include the AI Agent Update Policy and added `update_instructions` metadata to `manifest.json` to point to the instruction file.

## Version 2.6.0 (2025-12-06)

### Added

- **Color Vibrance** - Added a saturation booster for more vivid colors (-100% to +100%).

## Version 2.5.1 (2025-12-06)

### Added

- **4x Native Resolution** - Added a "4x" option for high-end GPUs.
- **Performance Warning** - Added a notification when FPS drops below 15 for 5 seconds.

### Fixed

- **Custom Scale UX** - Improved "Custom" scale input to apply settings while typing (debounced) instead of only on enter/blur.

## Version 2.5.0 (2025-12-06)

### Fixed

- **Comparison UI Bug** - Fixed an issue where the resolution labels in the comparison slider would not update when the video resolution changed.
- **Metric Visibility** - Decoupled "Render Time" from "FPS Counter". You can now view render time without enabling the FPS counter.

## Version 2.4.9 (2025-12-06)

### Fixed

- **Stability Fix** - Resolved a syntax error in the content script that could prevent the extension from initializing correctly on some pages.

## Version 2.4.8 (2025-12-06)

### Changed

- **UI Update** - Removed the "Apply Settings" button. All setting changes now apply instantly.
- **Toggle Status** - You can now click the "Status: Active/Disabled" indicator in the popup to toggle the extension on/off.

## Version 2.4.7 (2025-12-06)

### Fixed

- **FSR Sharpening Strength** - Fixed an issue where the Sharpening Strength slider was ignored when using the FSR 1.0 model.

## Version 2.4.6 (2025-12-06)

### Fixed

- **Seamless Model Switching** - Changing the upscaler model or resolution now applies instantly without reloading the page.

## Version 2.4.5 (2025-12-06)

### Fixed

- **Instant Settings** - Toggles for Comparison, FPS, Render Time, and Badges now apply instantly without needing to click the "Apply" button.

## Version 2.4.4 (2025-12-06)

### Fixed

- **Settings Toggle Bug** - Fixed an issue where disabling FPS counter, Comparison Slider, or Info Badges in settings didn't actually hide them on the video. All toggles now work instantly.

## Version 2.4.3 (2025-12-06)

### Fixed

- **Fullscreen Alignment** - Fixed an issue where the upscaler overlay would not be centered correctly on videos with black bars (letterbox/pillarbox) in fullscreen mode.

## Version 2.4.2 (2025-12-06)

### Fixed

- **YouTube Compatibility** - Fixed an issue where the new CORS bypass was breaking YouTube video playback. YouTube is now whitelisted and bypasses the bypass.

## Version 2.4.1 (2025-12-06)

### Added

- **Keyboard Shortcut** - Added `Alt+U` to quickly toggle the upscaler ON/OFF.
- **Error Notifications** - Added a visible "Not Supported" toast message if the upscaler fails due to security restrictions.
- **Popup Footer** - Displaying shortcut information in the settings menu.

## Version 2.4.0 (2025-12-06)

### Added

- **Global CORS Bypass** - Implemented a "Nuclear" solution to bypass video security restrictions. The extension now forces the browser to allow video processing on almost all websites.

## Version 2.3.2 (2025-12-06)

### Fixed

- **Legacy UI Removal** - Completely removed the old in-page floating buttons that were persisting on some sites. The extension is now fully controlled via the browser popup.

## Version 2.3.1 (2025-12-06)

### Fixed

- **CORS Error Logging** - Fixed an issue where "SecurityError" was still being logged as a critical error in the console. It now correctly warns silently.

## Version 2.3.0 (2025-12-06)

### Added

- **Extension Popup UI** - Moved all settings to the extension popup! Click the extension icon to change model, resolution, and more.
- **Smart CORS Handling** - Added fallback logic for videos with cross-origin restrictions to prevent errors.
- **Improved Info Badges** - Moved status overlay to top-center with a modern, semi-transparent glass effect.

### Changed

- **Cleaner Interface** - Removed floating buttons and panels from the video player (except when "Compare Mode" is active).

---

## Version 2.2.5 (2025-12-05)

### Fixed

- **Player Controls Visibility** - Fixed issue where the upscaler overlay was covering playback controls on some websites. Now intelligently matches the video's stacking order.

---

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
