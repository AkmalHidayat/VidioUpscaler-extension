
const { injectPostProcessing } = require('./worker-logic.js');

describe('Worker Script Logic', () => {
  test('injectPostProcessing should correctly inject post-processing code into the shader', () => {
    const fragmentShader = `
      void main() {
        gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
      }
    `;
    const config = {
      vibrance: 0.5,
      deband: true,
    };
    const newShader = injectPostProcessing(fragmentShader, config);

    expect(newShader).toContain('uniform float u_vibrance;');
    expect(newShader).toContain('uniform float u_deband;');
    expect(newShader).toContain('vec3 hsv = rgb2hsv(rgb);');
  });
});
