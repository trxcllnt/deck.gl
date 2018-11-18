export default `\
#version 300 es
#define SHADER_NAME line-layer-vertex-shader

in vec3 positions;
in vec3 instanceSourcePositions;
in vec3 instanceTargetPositions;
in vec4 instanceSourceColors;
in vec4 instanceTargetColors;
in vec3 instancePickingColors;

uniform float opacity;

out vec4 vColor;
out float vDiscard;

void main(void) {
  vDiscard = instanceSourcePositions.z + instanceTargetPositions.z;

  vec4 source = project_to_clipspace(vec4(project_position(instanceSourcePositions.xy), 0., 1.));
  vec4 target = project_to_clipspace(vec4(project_position(instanceTargetPositions.xy), 0., 1.));

  float segmentIndex = positions.z;
  gl_Position = mix(source, target, segmentIndex);

  // Color
  vColor = mix(instanceSourceColors, instanceTargetColors, segmentIndex);
  vColor = vec4(vColor.rgb, vColor.a * opacity) / 255.;

  // Set color to be rendered to picking fbo (also used to check for selection highlight).
  picking_setPickingColor(instancePickingColors);
}
`;
