import {ScatterplotLayer} from '@deck.gl/layers';
import GL from 'luma.gl/constants';

export default class ScatterplotLayer2D extends ScatterplotLayer {
  getShaders() {
    const opts = super.getShaders();

    // Replace 3d positions with 2d positions
    opts.vs = opts.vs
      .replace('attribute vec3 instancePositions;', 'attribute vec2 instancePositions;')
      .replace(
        /gl_Position = .*?;/,
        'gl_Position = project_to_clipspace(vec4(project_position(instancePositions) + project_scale(offset.xy), 0., 1.));'
      );

    return opts;
  }

  initializeState() {
    super.initializeState();
    const attributes = this.getAttributeManager().getAttributes();
    attributes.instancePositions.size = 2;
    // pointSizes are in uint8
    attributes.instanceRadius.type = GL.UNSIGNED_BYTE;
  }
}
