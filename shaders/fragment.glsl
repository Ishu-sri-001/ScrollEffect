// fragment.glsl
varying vec2 vUv;

void main() {
  gl_FragColor = vec4(vUv, 1.0 - vUv.x, 1.0);
}
