import {
  Box3,
  Float32BufferAttribute,
  InstancedBufferGeometry,
  InstancedInterleavedBuffer,
  InterleavedBufferAttribute,
  Sphere,
  Vector3,
  WireframeGeometry
}
from 'three';
const _box = new Box3();
const _vector = new Vector3();
class LineSegmentsGeometry extends InstancedBufferGeometry {
  static roundCapStart = (positions, uvs, r, thickness) => {
  	const capResolution = 8
	for (let step = 0; step < capResolution; step++) {
      const theta0 = Math.PI / 2 + ((step + 0) * Math.PI) / capResolution;
      const theta1 = Math.PI / 2 + ((step + 1) * Math.PI) / capResolution;
      uvs.push(-.1+0,0);
      uvs.push(-.1+r * Math.cos(theta0),r * Math.sin(theta0));
      uvs.push(-.1+r * Math.cos(theta1),r * Math.sin(theta1));
      positions.push(0, 0, 0);
      positions.push(
        r * thickness* Math.cos(theta0),
        r * thickness* Math.sin(theta0),
        0
      );
      positions.push(
        r * thickness* Math.cos(theta1),
        r * thickness* Math.sin(theta1),
        0
      );
    }
  }

  static squareCapStart = (xoff,yoff) => (positions, uvs, r, thickness) => {
  	positions.push(...[
    	xoff + -2*r, yoff + -r*thickness, 1, 
    	xoff + +2*r, yoff + -r*thickness, 1, 
    	xoff + +2*r, yoff + r*thickness, 1, 
    	xoff + -2*r, yoff + -r*thickness, 1, 
    	xoff + +2*r, yoff + r*thickness, 1, 
    	xoff + -2*r, yoff + +r*thickness, 1, 
    ])
  	uvs.push(...[
    	0+1,0+1,
    	1+1,0+1,
    	1+1,1+1,
    	0+1,0+1,
    	1+1,1+1,
    	0+1,1+1,
    ])
  }

  static roundCapEnd = (positions, uvs, r, thickness) => {
  	const capResolution = 8
    for (let step = 0; step < capResolution; step++) {
      const theta0 = (3 * Math.PI) / 2 + ((step + 0) * Math.PI) / capResolution;
      const theta1 = (3 * Math.PI) / 2 + ((step + 1) * Math.PI) / capResolution;
      uvs.push(0.1+0,0);
      uvs.push(0.1+r * Math.cos(theta0),r * Math.sin(theta0));
      uvs.push(0.1+r * Math.cos(theta1),r * Math.sin(theta1));
      positions.push(0, 0, 1);
      positions.push(
        r * thickness* Math.cos(theta0),
        r * thickness* Math.sin(theta0),
        1
      );
      positions.push(
        r * thickness* Math.cos(theta1),
        r * thickness* Math.sin(theta1),
        1
      );
    }
  }

  static arrowCapEnd = (positions, uvs, r, thickness) => {
  	positions.push(...[
    	0, -r*5*thickness, 1, 
    	20, 0, 1, 
    	20, 0, 1, 
    	0, -r*5*thickness, 1, 
    	20, 0, 1, 
    	0, +r*5*thickness, 1, 
    ])
  	uvs.push(...[
    	-0.1, -1, 
    	+0.1, 0.5, 
    	+0.1, 0.5, 
    	-0.1, -1, 
    	+0.1, 0.5, 
    	-0.1, 1, 
    ])
  }

  static arrowCapStart = (positions, uvs, r, thickness) => {
  	positions.push(...[
    	0, r*5*thickness, 0, 
    	-20, 0, 0, 
    	-20, 0, 0, 
    	0, r*5*thickness, 0, 
    	-20, 0, 0, 
    	0, -r*5*thickness, 0, 
    ])
  	uvs.push(...[
    	-0.1, -1, 
    	+0.1, 0.5, 
    	+0.1, 0.5, 
    	-0.1, -1, 
    	+0.1, 0.5, 
    	-0.1, 1, 
    ])
  }

  constructor(dims = 3, interleave = 2, capGens = [LineSegmentsGeometry.roundCapStart, LineSegmentsGeometry.roundCapEnd]) {
    super();
    this.isLineSegmentsGeometry = true;
    this.type = 'LineSegmentsGeometry';
    this.dims = dims
    this.interleave = interleave
    const r = 1;
    const thickness = 2
    const overhang = 0
    const interp = 1

    const positions = [
    	-r*overhang, -r*thickness, 0*interp, 
    	+r*overhang, -r*thickness, 1*interp, 
    	+r*overhang, +r*thickness, 1*interp, 
    	-r*overhang, -r*thickness, 0*interp, 
    	+r*overhang, +r*thickness, 1*interp, 
    	-r*overhang, +r*thickness, 0*interp, 
    ];

    const uvs = [
    	-0.1, -1, 
    	+0.1, -1, 
    	+0.1, +1, 
    	-0.1, -1, 
    	+0.1, +1, 
    	-0.1, 1, 
    ];

    for(let gen of capGens) {
    	gen(positions, uvs, r, thickness)
    }

    this.setAttribute('position', new Float32BufferAttribute(positions, 3));
    this.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  }
  applyMatrix4(matrix) {
    const start = this.attributes.instanceStart;
    const end = this.attributes.instanceEnd;
    if (start !== undefined) {
      start.applyMatrix4(matrix);
      end.applyMatrix4(matrix);
      start.needsUpdate = true;
    }
    if (this.boundingBox !== null) {
      this.computeBoundingBox();
    }
    if (this.boundingSphere !== null) {
      this.computeBoundingSphere();
    }
    return this;
  }
  setPositions(array) {
    const newLength = array.length
    if (this.prevLength) {
      if (this.prevLength > array.length) {
        array = [...array, ...Array(this.prevLength - array.length).fill(0)]
      }
    }
    this.prevLength = array.length
    this.instanceCount = newLength / (this.dims * (1+this.interleave))
    let lineSegments;
    if (array instanceof Float32Array) {
      lineSegments = array;
    } else if (Array.isArray(array)) {
      lineSegments = new Float32Array(array);
    }
    const instanceBuffer = new InstancedInterleavedBuffer(lineSegments, (1+this.interleave)*this.dims, 1); // xyz, xyz
    this.setAttribute('instanceStart', new InterleavedBufferAttribute(instanceBuffer, this.dims, 0)); // xyz
    this.setAttribute('instanceEnd', new InterleavedBufferAttribute(instanceBuffer, this.dims, this.interleave*this.dims)); // xyz
    //
    this.computeBoundingBox();
    this.computeBoundingSphere();
    return this;
  }
  setColors(array) {
    let colors;
    if (array instanceof Float32Array) {
      colors = array;
    } else if (Array.isArray(array)) {
      colors = new Float32Array(array);
    }
    const instanceColorBuffer = new InstancedInterleavedBuffer(colors, 6, 1); // rgb, rgb
    this.setAttribute('instanceColorStart', new InterleavedBufferAttribute(instanceColorBuffer, 3, 0)); // rgb
    this.setAttribute('instanceColorEnd', new InterleavedBufferAttribute(instanceColorBuffer, 3, 3)); // rgb
    return this;
  }
  setWidths(array) {
    let widths;
    if (array instanceof Float32Array) {
      widths = array;
    } else if (Array.isArray(array)) {
      widths = new Float32Array(array);
    }
    const instanceWidthBuffer = new InstancedInterleavedBuffer(widths, 2, 1);
    this.setAttribute('instanceWidthStart', new InterleavedBufferAttribute(instanceWidthBuffer, 1, 0));
    this.setAttribute('instanceWidthEnd', new InterleavedBufferAttribute(instanceWidthBuffer, 1, 1));
    return this;
  }
  fromWireframeGeometry(geometry) {
    this.setPositions(geometry.attributes.position.array);
    return this;
  }
  fromEdgesGeometry(geometry) {
    this.setPositions(geometry.attributes.position.array);
    return this;
  }
  fromMesh(mesh) {
    this.fromWireframeGeometry(new WireframeGeometry(mesh.geometry));
    // set colors, maybe
    return this;
  }
  fromLineSegments(lineSegments) {
    const geometry = lineSegments.geometry;
    this.setPositions(geometry.attributes.position.array); // assumes non-indexed
    // set colors, maybe
    return this;
  }
  computeBoundingBox() {
    if(this.dims != 3) {
      this.boundingBox = new Box3();
      return
    }
    if (this.boundingBox === null) {
      this.boundingBox = new Box3();
      return
    }
    const start = this.attributes.instanceStart;
    const end = this.attributes.instanceEnd;
    if (start !== undefined && end !== undefined) {
      this.boundingBox.setFromBufferAttribute(start);
      _box.setFromBufferAttribute(end);
      this.boundingBox.union(_box);
    }
  }
  computeBoundingSphere() {
    if(this.dims != 3) {
      this.boundingSphere = new Sphere();
      this.boundingSphere.radius = Infinity
      return
    }
    if (this.boundingSphere === null) {
      this.boundingSphere = new Sphere();
      this.boundingSphere.radius = Infinity
    }
    if (this.boundingBox === null) {
      this.computeBoundingBox();
    }
    const start = this.attributes.instanceStart;
    const end = this.attributes.instanceEnd;
    if (start !== undefined && end !== undefined) {
      const center = this.boundingSphere.center;
      this.boundingBox.getCenter(center);
      let maxRadiusSq = 0;
      for (let i = 0, il = start.count; i < il; i++) {
        _vector.fromBufferAttribute(start, i);
        maxRadiusSq = Math.max(maxRadiusSq, center.distanceToSquared(_vector));
        _vector.fromBufferAttribute(end, i);
        maxRadiusSq = Math.max(maxRadiusSq, center.distanceToSquared(_vector));
      }
      this.boundingSphere.radius = Math.sqrt(maxRadiusSq);
      if (isNaN(this.boundingSphere.radius)) {
        console.error('THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.', this);
      }
    }
  }
  toJSON() {
    // todo
  }
  applyMatrix(matrix) {
    console.warn('THREE.LineSegmentsGeometry: applyMatrix() has been renamed to applyMatrix4().');
    return this.applyMatrix4(matrix);
  }
}
export {
  LineSegmentsGeometry
};