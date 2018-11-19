import {CompositeLayer} from '@deck.gl/core';
import {Buffer, Texture2D, Transform} from 'luma.gl';
import GL from 'luma.gl/constants';

import {getLayerAttributes} from './utils';
import ScatterplotLayer from './scatterplot-layer-2d';
import EdgeLayer from './edge-layer';

import edgePositionsVS from './edge-positions-vertex.glsl';

const defaultProps = {
  totalNodeCount: 0,
  totalEdgeCount: 0,
  nodeUpdates: [],
  edgeUpdates: []
};

const TEXTURE_WIDTH = 256;
const scatterplotLayerAttributes = getLayerAttributes(ScatterplotLayer);
const edgeLayerAttributes = getLayerAttributes(EdgeLayer);

/* 
  LayerAttribute.allocate(numInstances) also creates a typed array as `value`, which we don't want.
  Maybe extend it into
  LayerAttribute.allocate(numInstances, {valueArray = true})
 */
function resizeBuffer(buffer, numInstances) {
  buffer.reallocate(numInstances * buffer.accessor.BYTES_PER_VERTEX);
}

/*
  Always use bufferSubData in
  LayerAttribute.updateBuffer ?
 */
function updatePartialBuffer(buffer, data, instanceOffset) {
  buffer.subData({data, offset: instanceOffset * buffer.accessor.BYTES_PER_VERTEX});
}

export default class ArrowGraphLayer extends CompositeLayer {
  initializeState() {
    const {gl} = this.context;
    this.setState({
      loadedNodeCount: 0,
      loadedEdgeCount: 0,

      // Node layer buffers
      nodeColorsBuffer: new Buffer(gl, {
        accessor: scatterplotLayerAttributes.instanceColors,
        byteLength: 1
      }),
      nodeRadiusBuffer: new Buffer(gl, {
        accessor: scatterplotLayerAttributes.instanceRadius,
        byteLength: 1
      }),
      nodePositionsBuffer: new Buffer(gl, {
        accessor: scatterplotLayerAttributes.instancePositions,
        byteLength: 1
      }),

      // Line layer buffers
      edgeSourcePositionsBuffer: new Buffer(gl, {
        accessor: edgeLayerAttributes.instanceSourcePositions,
        byteLength: 1
      }),
      edgeTargetPositionsBuffer: new Buffer(gl, {
        accessor: edgeLayerAttributes.instanceTargetPositions,
        byteLength: 1
      }),
      edgeColorsBuffer: new Buffer(gl, {
        accessor: {...edgeLayerAttributes.instanceSourceColors, size: 8},
        byteLength: 1
      }),

      // Transform feedback buffers
      nodePositionsTexture: new Texture2D(gl, {
        format: GL.RG32F,
        type: GL.FLOAT,
        width: 1,
        height: 1,
        parameters: {
          [GL.TEXTURE_MIN_FILTER]: [GL.NEAREST],
          [GL.TEXTURE_MAG_FILTER]: [GL.NEAREST]
        },
        mipmap: false
      }),
      edgeIdsBuffer: new Buffer(gl, {
        accessor: {type: GL.UNSIGNED_INT, size: 2},
        byteLength: 1
      })
    });

    this.setState({
      // Transform feedback that looks up node positions from ids
      edgePositionsTransform: new Transform(gl, {
        sourceBuffers: {
          instanceIds: this.state.edgeIdsBuffer
        },
        feedbackBuffers: {
          sourcePositions: this.state.edgeSourcePositionsBuffer,
          targetPositions: this.state.edgeTargetPositionsBuffer
        },
        vs: edgePositionsVS,
        varyings: ['sourcePositions', 'targetPositions'],
        elementCount: 1
      })
    });
  }

  /* eslint-disable max-statements */
  updateState({props, oldProps}) {
    const {nodeUpdates, edgeUpdates, totalNodeCount, totalEdgeCount} = props;
    const {
      nodeColorsBuffer,
      nodeRadiusBuffer,
      nodePositionsBuffer,
      nodePositionsTexture,
      edgePositionsTransform,
      edgeSourcePositionsBuffer,
      edgeTargetPositionsBuffer,
      edgeColorsBuffer,
      edgeIdsBuffer
    } = this.state;
    let {loadedNodeCount, loadedEdgeCount} = this.state;

    // Resize node layer buffers
    if (totalNodeCount && totalNodeCount !== oldProps.totalNodeCount) {
      resizeBuffer(nodeColorsBuffer, totalNodeCount);
      resizeBuffer(nodeRadiusBuffer, totalNodeCount);
      nodePositionsTexture.resize({
        width: TEXTURE_WIDTH,
        height: Math.ceil(totalNodeCount / TEXTURE_WIDTH)
      });
      resizeBuffer(nodePositionsBuffer, nodePositionsTexture.width * nodePositionsTexture.height);
      loadedNodeCount = 0;
    }

    // Resize edge layer buffers
    if (totalEdgeCount && totalEdgeCount !== oldProps.totalEdgeCount) {
      resizeBuffer(edgeSourcePositionsBuffer, totalEdgeCount);
      resizeBuffer(edgeTargetPositionsBuffer, totalEdgeCount);
      resizeBuffer(edgeColorsBuffer, totalEdgeCount);
      resizeBuffer(edgeIdsBuffer, totalEdgeCount);
      loadedEdgeCount = 0;
    }

    const nodesUpdated = nodeUpdates.length > 0;
    const edgesUpdated = edgeUpdates.length > 0;

    // Apply node data updates
    while (nodeUpdates.length) {
      const {length, pointColors, pointSizes, pointPositions} = nodeUpdates.shift();
      updatePartialBuffer(nodeColorsBuffer, pointColors, loadedNodeCount);
      updatePartialBuffer(nodeRadiusBuffer, pointSizes, loadedNodeCount);
      updatePartialBuffer(nodePositionsBuffer, pointPositions, loadedNodeCount);
      loadedNodeCount += length;
    }

    // Apply edge data updates
    while (edgeUpdates.length) {
      const {length, edgeColors, logicalEdges} = edgeUpdates.shift();
      updatePartialBuffer(edgeColorsBuffer, edgeColors, loadedEdgeCount);
      updatePartialBuffer(edgeIdsBuffer, logicalEdges, loadedEdgeCount);
      loadedEdgeCount += length;
    }

    if (nodesUpdated) {
      nodePositionsTexture.setImageData({data: nodePositionsBuffer});
    }

    if ((nodesUpdated || edgesUpdated) && loadedEdgeCount && loadedNodeCount) {
      // Update edge position buffers
      edgePositionsTransform.update({elementCount: loadedEdgeCount});
      edgePositionsTransform.run({
        uniforms: {loadedNodeCount, width: TEXTURE_WIDTH, nodePositions: nodePositionsTexture}
      });
    }

    // console.log(
    //   `Nodes: ${loadedNodeCount}/${totalNodeCount} Edges: ${loadedEdgeCount}/${totalEdgeCount}`
    // );
    this.setState({loadedNodeCount, loadedEdgeCount});
  }
  /* eslint-enable max-statements */

  renderLayers() {
    const {
      loadedNodeCount,
      loadedEdgeCount,
      nodeColorsBuffer,
      nodeRadiusBuffer,
      nodePositionsBuffer,
      edgeSourcePositionsBuffer,
      edgeTargetPositionsBuffer,
      edgeColorsBuffer
    } = this.state;

    return [
      loadedEdgeCount &&
        new EdgeLayer(
          this.getSubLayerProps({
            id: 'edges',
            numInstances: loadedEdgeCount,
            instanceSourcePositions: edgeSourcePositionsBuffer,
            instanceTargetPositions: edgeTargetPositionsBuffer,
            instanceSourceColors: edgeColorsBuffer,
            instanceTargetColors: edgeColorsBuffer,
            instancePickingColors: edgeColorsBuffer, // TODO
            pickable: false,
            opacity: 0.2
          })
        ),
      loadedNodeCount &&
        new ScatterplotLayer(
          this.getSubLayerProps({
            id: 'nodes',
            numInstances: loadedNodeCount,
            instanceColors: nodeColorsBuffer,
            instanceRadius: nodeRadiusBuffer,
            instancePositions: nodePositionsBuffer,
            instancePickingColors: nodeColorsBuffer, // TODO
            pickable: false,
            radiusScale: 1
          })
        )
    ];
  }
}

ArrowGraphLayer.layerName = 'ArrowGraphLayer';
ArrowGraphLayer.defaultProps = defaultProps;
