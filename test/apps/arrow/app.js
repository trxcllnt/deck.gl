/* global document */
import {Deck, OrthographicView, COORDINATE_SYSTEM} from '@deck.gl/core';

import ArrowGraphLayer from './layers/arrow-graph-layer';
import {loadFromFile} from './loader';

Object.assign(document.body.style, {
  margin: 0,
  background: '#111'
});

const deck = new Deck({
  initialViewState: {
    offset: [0, 0],
    zoom: 1
  },
  // debug: true,
  views: [new OrthographicView({controller: {minZoom: 0, maxZoom: Infinity}})],
  onViewStateChange: ({viewState}) => deck.setProps({viewState})
});

let setBB = false;
let totalNodeCount = 0;
let totalEdgeCount = 0;
const nodeUpdates = [];
const edgeUpdates = [];
const DATA_URL =
  'https://raw.githubusercontent.com/uber-common/deck.gl-data/master/examples/arrow/';

loadFromFile(`${DATA_URL}/biogrid-nodes.arrow`, ({metadata, length, ...columns}) => {
  if (totalNodeCount === 0) {
    totalNodeCount = Number(metadata.get('length'));
  }

  if (deck.width > 0 && deck.height > 0 && !setBB && (setBB = true)) {
    zoomTo(JSON.parse(metadata.get('globalBoundBox')));
  }

  nodeUpdates.push({length, ...columns});
  redraw();
});

loadFromFile(`${DATA_URL}/biogrid-edges.arrow`, ({metadata, length, ...columns}) => {
  if (totalEdgeCount === 0) {
    totalEdgeCount = Number(metadata.get('length'));
  }

  edgeUpdates.push({length, ...columns});
  redraw();
});

function redraw() {
  deck.setProps({
    layers: [
      new ArrowGraphLayer({
        id: 'graph',
        coordinateSystem: COORDINATE_SYSTEM.IDENTITY,
        totalNodeCount,
        totalEdgeCount,
        nodeUpdates,
        edgeUpdates,
        version: Date.now()
      })
    ]
  });
}

function zoomTo([top, right, bottom, left]) {
  const zoom = Math.max((right - left) / deck.width, (bottom - top) / deck.height);
  deck.setProps({
    viewState: {
      offset: [(left + right) / 2 / zoom, (top + bottom) / 2 / zoom],
      zoom
    }
  });
}
