
include("deferred_renderer/geometry_buffers.vert");

attribute vec3 position;
attribute vec3 normal;
attribute vec2 tcoords;

binding_context GraphNode {
  // object matrices
  uniform mat4 world_matrix;
}

uniform mat4 view_matrix;
uniform mat4 projection_matrix;
uniform bool geometry_pass;


void main(void) {
  if (geometry_pass) {
    gl_Position = gbuffers_main();
  }
  else {
    gl_Position = projection_matrix * view_matrix * world_matrix * vec4(position, 1.0);
  }
}
