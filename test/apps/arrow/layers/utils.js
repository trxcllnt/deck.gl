import GL from 'luma.gl/constants';

/* deck.gl could potentially make this as a Layer utility? */
export function getLayerAttributes(LayerClass) {
  const layer = new LayerClass({});
  try {
    layer.context = {gl: {}};
    layer._initState();
    layer.initializeState();
  } catch (error) {
    // ignore
  }
  const attributes = layer.getAttributeManager().getAttributes();

  for (const attributeName in attributes) {
    attributes[attributeName].type = attributes[attributeName].type || GL.FLOAT;
  }

  return attributes;
}
