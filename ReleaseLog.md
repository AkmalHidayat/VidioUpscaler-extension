# Anime4K Web Upscaler - Release Log

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
