/**
 * parameters = {
 *  color: <hex>,
 *  linewidth: <float>,
 *  gapSize: <float>,
 *  resolution: <Vector2>, // to be set by renderer
 * }
 */
import {
  ShaderLib,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
  Vector2,
  Vector3,
  Texture
} from 'three';
UniformsLib.line = {
  startProjectionMul: {
    value: new Vector3(1, 1, 1)
  },
  startProjectionAdd: {
    value: new Vector3(0, 0, 0)
  },
  endProjectionMul: {
    value: new Vector3(1, 1, 1)
  },
  endProjectionAdd: {
    value: new Vector3(0, 0, 0)
  },
  linewidth: {
    value: 1
  },
  polarSourceLength: {
    value: 1
  },
  polarSkip: {
    value: 1
  },
  polarRadiusBase: {
    value: 1
  },
  polarRadiusScale: {
    value: 1
  },
  project2DStart: {
  	value: new Vector3(0.0, 0.0, 0.0),
  },
	project2DEnd: {
  	value: new Vector3(0.0, 0.0, 1.0),
	},
	project2DUp: {
  	value: new Vector3(1, 0, 0),
	},
	project2DSide: {
  	value: new Vector3(0, 1, 0),
	},
  instanceCount: {
    value: 1
  },
  alphaMap: {
  	type: 't',
  	value: new Texture(),
  },
  resolution: {
    value: new Vector2(100, 100)
  },
};
ShaderLib['line'] = {
  uniforms: UniformsUtils.merge([
    UniformsLib.common,
    UniformsLib.fog,
    UniformsLib.line
  ]),
  vertexShader: `
		#include <common>
		#include <color_pars_vertex>
		#include <fog_pars_vertex>
		#include <logdepthbuf_pars_vertex>
		#include <clipping_planes_pars_vertex>

		uniform float linewidth;
		uniform vec2 resolution;

		#ifdef LINEAR_PROJECTION
		uniform vec3 startProjectionMul;
		uniform vec3 startProjectionAdd;

		uniform vec3 endProjectionMul;
		uniform vec3 endProjectionAdd;
		#endif

		#ifdef POLAR
		uniform float polarSourceLength;
		uniform float polarSkip;
		uniform float polarRadiusBase;
		uniform float polarRadiusScale;
		#endif

		#ifdef PROJECT2D
		attribute vec2 instanceStart;
		attribute vec2 instanceEnd;

		uniform vec3 project2DStart;
		uniform vec3 project2DEnd;
		uniform vec3 project2DUp;
		uniform vec3 project2DSide;
		uniform float instanceCount;
		#else
		attribute vec3 instanceStart;
		attribute vec3 instanceEnd;
		#endif

		attribute vec3 instanceColorStart;
		attribute vec3 instanceColorEnd;

		#ifdef VARY_WIDTH
		attribute float instanceWidthStart;
		attribute float instanceWidthEnd;
		#endif

		varying vec2 vUv;

		void trimSegment(const in vec4 start, inout vec4 end) {

			// trim end segment so it terminates between the camera plane and the near plane

			// conservative estimate of the near plane
			float a = projectionMatrix[ 2 ][ 2 ]; // 3nd entry in 3th column
			float b = projectionMatrix[ 3 ][ 2 ]; // 3nd entry in 4th column
			float nearEstimate = - 0.5 * b / a;

			float alpha = (nearEstimate - start.z) / (end.z - start.z);

			end.xyz = mix(start.xyz, end.xyz, alpha);

		}

		void main() {

			#ifdef USE_COLOR

				vColor.xyz = (position.y < 0.5) ? instanceColorStart : instanceColorEnd;

			#endif

			float aspect = resolution.x / resolution.y;


			#ifdef PROJECT2D
			vec3 projBase = mix(project2DStart, project2DEnd, float(gl_InstanceID) / instanceCount);
			vec3 inStart = projBase + project2DUp * instanceStart.y + project2DSide * instanceStart.x;
			vec3 inEnd = projBase + project2DUp * instanceEnd.y + project2DSide * instanceEnd.x;
			#else
			vec3 inStart = instanceStart;
			vec3 inEnd = instanceEnd;
			#endif


			#ifdef LINEAR_PROJECTION
			inStart = inStart * startProjectionMul + startProjectionAdd;
			inEnd = inEnd * endProjectionMul + endProjectionAdd;
			#endif


			#ifdef POLAR
			if(polarSkip < 0.5) {

				float cosStart = cos(inStart.z/polarSourceLength * PI - PI/4.0);
				float sinStart = sin(inStart.z/polarSourceLength * PI - PI/4.0);

				float newXStart = polarRadiusBase*cosStart - polarRadiusBase*sinStart + (inStart.x * cosStart - inStart.x * sinStart)*polarRadiusScale;
				float newZStart = polarRadiusBase*cosStart + polarRadiusBase*sinStart + (inStart.x * sinStart + inStart.x * cosStart)*polarRadiusScale;

				inStart.x = newXStart;
				inStart.z = newZStart;
				#ifdef LINEAR_PROJECTION
				inStart.y = (inStart.y - startProjectionAdd.y) * polarRadiusScale + startProjectionAdd.y;
				#else
				inStart.y = inStart.y * polarRadiusScale;
				#endif

				float cosEnd = cos(inEnd.z/polarSourceLength * PI - PI/4.0);
				float sinEnd = sin(inEnd.z/polarSourceLength * PI - PI/4.0);

				float newXEnd = polarRadiusBase*cosEnd - polarRadiusBase*sinEnd + (inEnd.x * cosEnd - inEnd.x * sinEnd)*polarRadiusScale;
				float newZEnd = polarRadiusBase*cosEnd + polarRadiusBase*sinEnd + (inEnd.x * sinEnd + inEnd.x * cosEnd)*polarRadiusScale;

				inEnd.x = newXEnd;
				inEnd.z = newZEnd;
				#ifdef LINEAR_PROJECTION
				inEnd.y = (inEnd.y - endProjectionAdd.y) * polarRadiusScale + endProjectionAdd.y;
				#else
				inEnd.y = inEnd.y * polarRadiusScale;
				#endif
			}
			#endif


			

			vec4 start = modelViewMatrix * vec4(inStart, 1.0);
			vec4 end = modelViewMatrix * vec4(inEnd, 1.0);



			vUv = uv;

			bool perspective = (projectionMatrix[ 2 ][ 3 ] == - 1.0); // 4th entry in the 3rd column

			if (perspective) {
				if (start.z < 0.0 && end.z >= 0.0) {
					trimSegment(start, end);
				} else if (end.z < 0.0 && start.z >= 0.0) {
					trimSegment(end, start);
				}
			}

			// clip space
			vec4 clipStart = projectionMatrix * start;
			vec4 clipEnd = projectionMatrix * end;

			// ndc space
			vec3 ndcStart = clipStart.xyz / clipStart.w;
			vec3 ndcEnd = clipEnd.xyz / clipEnd.w;

			// direction
			vec2 dir = ndcEnd.xy - ndcStart.xy;

			// account for clip-space aspect ratio
			dir.x *= aspect;
			dir = normalize(dir);

			#ifdef VARY_WIDTH
			float startWidth = linewidth * instanceWidthStart;
			float endWidth = linewidth * instanceWidthEnd;
			#else
			float startWidth = linewidth;
			float endWidth = linewidth;
			#endif

			vec2 screenStart = resolution * (0.5 * clipStart.xy/clipStart.w + 0.5);
			vec2 screenEnd = resolution * (0.5 * clipEnd.xy/clipEnd.w + 0.5);
			vec2 xBasis = normalize(screenEnd - screenStart);
			vec2 yBasis = vec2(-xBasis.y, xBasis.x);

			if(inStart==inEnd) {
				yBasis = vec2(1.0,0.0);
				xBasis = vec2(0.0,-1.0);
			}

			vec2 pt0 = screenStart + startWidth * (position.y * yBasis + position.x * xBasis);
			vec2 pt1 = screenEnd + endWidth * (position.y * yBasis + position.x * xBasis);
			vec2 pt = mix(pt0, pt1, position.z);
			vec4 clipMix = mix(clipStart, clipEnd, position.z);
			vec4 clip = vec4(clipMix.w * (2.0 * pt/resolution - 1.0), clipMix.z, clipMix.w);

			gl_Position = clip;

			vec4 mvPosition = mix(start, end, position.z); // this is an approximation

			#include <logdepthbuf_vertex>
			#include <clipping_planes_vertex>
			#include <fog_vertex>

		}
		`,
  fragmentShader: `
		uniform vec3 diffuse;
		uniform float opacity;
		uniform float linewidth;

		varying float vLineDistance;

		varying vec2 vUv;

		#ifdef TEXTURED
			uniform sampler2D alphaMap;
		#endif

		#include <common>
		#include <color_pars_fragment>
		#include <fog_pars_fragment>
		#include <logdepthbuf_pars_fragment>
		#include <clipping_planes_pars_fragment>

		void main() {

			#include <clipping_planes_fragment>
			float alpha = opacity;

			#ifdef TEXTURED
				alpha = texture(alphaMap, vUv - vec2(1.0,1.0)).x;
			#else
				float a = vUv.x;
				float b = vUv.y;
				
				float len2 = a * a + b * b;

				#ifdef USE_ALPHA_TO_COVERAGE
					float dlen = fwidth(len2);
					alpha *= 1.0 - smoothstep(1.0 - dlen, 1.0 + dlen, len2);
				#else
					if (len2 > 1.0) discard;
				#endif
			#endif


			vec4 diffuseColor = vec4(diffuse, alpha);

			#include <logdepthbuf_fragment>
			#include <color_fragment>

			gl_FragColor = vec4(diffuseColor.rgb, alpha);

			#include <tonemapping_fragment>
			#include <colorspace_fragment>
			#include <fog_fragment>
			#include <premultiplied_alpha_fragment>
		}
		`
};
class LineMaterial extends ShaderMaterial {
  constructor(parameters) {
    super({
      uniforms: UniformsUtils.clone(ShaderLib['line'].uniforms),
      vertexShader: ShaderLib['line'].vertexShader,
      fragmentShader: ShaderLib['line'].fragmentShader,
      clipping: true // required for clipping support
    });
    this.type = 'LineMaterial'
    this.isLineMaterial = true;
    this.setValues(parameters);
  }
  get color() {
    return this.uniforms.diffuse.value;
  }
  set color(value) {
    this.uniforms.diffuse.value = value;
  }
  get varyWidth() {
    return 'VARY_WIDTH' in this.defines;
  }
  set varyWidth(value) {
    if (value === true) {
      this.defines.VARY_WIDTH = '';
    } else {
      delete this.defines.VARY_WIDTH;
    }
  }
  get linearProjected() {
    return 'LINEAR_PROJECTION' in this.defines;
  }
  set linearProjected(value) {
    if (value === true) {
      this.defines.LINEAR_PROJECTION = '';
    } else {
      delete this.defines.LINEAR_PROJECTION;
    }
  }
  get polar() {
    return 'POLAR' in this.defines;
  }
  set polar(value) {
    if (value === true) {
      this.defines.POLAR = '';
    } else {
      delete this.defines.POLAR;
    }
  }
  get project2d() {
    return 'PROJECT2D' in this.defines;
  }
  set project2d(value) {
    if (value === true) {
      this.defines.PROJECT2D = '';
    } else {
      delete this.defines.PROJECT2D;
    }
  }
  get polarSourceLength() {
    return this.uniforms.polarSourceLength.value;
  }
  set polarSourceLength(value) {
    if (!this.uniforms.polarSourceLength) return;
    this.uniforms.polarSourceLength.value = value;
  }
  get polarSkip() {
    return this.uniforms.polarSkip.value;
  }
  set polarSkip(value) {
    if (!this.uniforms.polarSkip) return;
    this.uniforms.polarSkip.value = value;
  }
  get polarRadiusBase() {
    return this.uniforms.polarRadiusBase.value;
  }
  set polarRadiusBase(value) {
    if (!this.uniforms.polarRadiusBase) return;
    this.uniforms.polarRadiusBase.value = value;
  }
  get polarRadiusScale() {
    return this.uniforms.polarRadiusScale.value;
  }
  set polarRadiusScale(value) {
    if (!this.uniforms.polarRadiusScale) return;
    this.uniforms.polarRadiusScale.value = value;
  }
  get textured() {
    return 'TEXTURED' in this.defines;
  }
  set textured(value) {
    if (value === true) {
      this.defines.TEXTURED = '';
    } else {
      delete this.defines.TEXTURED;
    }
  }
  get linewidth() {
    return this.uniforms.linewidth.value;
  }
  set linewidth(value) {
    if (!this.uniforms.linewidth) return;
    this.uniforms.linewidth.value = value;
  }
  set startProjectionMul(v) {
    this.uniforms.startProjectionMul.value.copy(v)
  }
  set startProjectionAdd(v) {
    this.uniforms.startProjectionAdd.value.copy(v)
  }
  set endProjectionMul(v) {
    this.uniforms.endProjectionMul.value.copy(v)
  }
  set endProjectionAdd(v) {
    this.uniforms.endProjectionAdd.value.copy(v)
  }
  get startProjectionMul() {
    return this.uniforms.startProjectionMul
  }
  get startProjectionAdd() {
    return this.uniforms.startProjectionAdd
  }
  get endProjectionMul() {
    return this.uniforms.endProjectionMul
  }
  get endProjectionAdd() {
    return this.uniforms.endProjectionAdd
  }
  get opacity() {
    return this.uniforms.opacity.value;
  }
  set opacity(value) {
    if (!this.uniforms) return;
    this.uniforms.opacity.value = value;
  }
  get alphaMap() {
    return this.uniforms.alphaMap.value;
  }
  set alphaMap(value) {
    if (!this.uniforms) return;
    this.uniforms.alphaMap.value.copy(value);
  }
  get project2DEnd() {
    return this.uniforms.project2DEnd.value;
  }
  set project2DEnd(value) {
    if (!this.uniforms) return;
    this.uniforms.project2DEnd.value.copy(value);
  }
  get project2DStart() {
    return this.uniforms.project2DStart.value;
  }
  set project2DStart(value) {
    if (!this.uniforms) return;
    this.uniforms.project2DStart.value.copy(value);
  }
  get resolution() {
    return this.uniforms.resolution.value;
  }
  set resolution(value) {
    this.uniforms.resolution.value.copy(value);
  }
  get alphaToCoverage() {
    return 'USE_ALPHA_TO_COVERAGE' in this.defines;
  }
  set alphaToCoverage(value) {
    if (!this.defines) return;
    if ((value === true) !== this.alphaToCoverage) {
      this.needsUpdate = true;
    }
    if (value === true) {
      this.defines.USE_ALPHA_TO_COVERAGE = '';
      this.extensions.derivatives = true;
    } else {
      delete this.defines.USE_ALPHA_TO_COVERAGE;
      this.extensions.derivatives = false;
    }
  }
}
export {
  LineMaterial
};