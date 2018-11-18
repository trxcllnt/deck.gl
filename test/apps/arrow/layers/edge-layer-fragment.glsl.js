export default `\
#version 300 es
#define SHADER_NAME line-layer-fragment-shader

precision highp float;

in float vDiscard;
in vec4 vColor;

out vec4 fragColor;

void main(void) {
  if (vDiscard > 0.5) {
    discard;
  }
  fragColor = vColor;

  // use highlight color if this fragment belongs to the selected object.
  fragColor = picking_filterHighlightColor(fragColor);

  // use picking color if rendering to picking FBO.
  fragColor = picking_filterPickingColor(fragColor);
}
`;
