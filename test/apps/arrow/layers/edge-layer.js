import {Layer} from '@deck.gl/core';
import GL from 'luma.gl/constants';
import {Model, Geometry} from 'luma.gl';

import vs from './edge-layer-vertex.glsl';
import fs from './edge-layer-fragment.glsl';

export default class EdgeLayer extends Layer {
  getShaders() {
    return {vs, fs, modules: ['picking']};
  }

  initializeState() {
    const attributeManager = this.getAttributeManager();

    attributeManager.addInstanced({
      instanceSourcePositions: {size: 3, accessor: 'getSourcePosition'},
      instanceTargetPositions: {size: 3, accessor: 'getTargetPosition'},
      instanceSourceColors: {
        size: 4,
        stride: 8,
        type: GL.UNSIGNED_BYTE,
        accessor: 'getSourceColor',
        defaultValue: [0, 0, 0, 255]
      },
      instanceTargetColors: {
        size: 4,
        stride: 8,
        offset: 4,
        type: GL.UNSIGNED_BYTE,
        accessor: 'getTargetColor',
        defaultValue: [0, 0, 0, 255]
      }
    });

    this.setState({model: this._getModel(this.context.gl)});
  }

  _getModel(gl) {
    const positions = [0, 0, 0, 0, 0, 1];

    return new Model(
      gl,
      Object.assign({}, this.getShaders(), {
        id: this.props.id,
        geometry: new Geometry({
          drawMode: GL.LINE_STRIP,
          attributes: {
            positions: new Float32Array(positions)
          }
        }),
        isInstanced: true,
        shaderCache: this.context.shaderCache
      })
    );
  }
}
