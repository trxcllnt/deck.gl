export default `\
#version 300 es

in vec2 instanceIds;

uniform sampler2D nodePositions;
uniform float loadedNodeCount;
uniform float width;

out vec3 sourcePositions;
out vec3 targetPositions;

ivec2 getTexCoord(float id) {
  float y = floor(id / width);
  float x = id - width * y;
  return ivec2(x, y);
}

vec3 getPosition(float id) {
  if (id >= loadedNodeCount) {
    return vec3(0., 0., 1.);
  }
  vec2 p = texelFetch(nodePositions, getTexCoord(id), 0).rg;
  return vec3(p, 0.);
}

void main(void) {
  sourcePositions = getPosition(instanceIds.x);
  targetPositions = getPosition(instanceIds.y);
}
`;
