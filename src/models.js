export class Vertex {
  constructor(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
}

export class Normal {
  constructor(dx, dy, dz) {
    this.dx = dx;
    this.dy = dy;
    this.dz = dz;
  }
}

export class UV {
  constructor(u, v) {
    this.u = u;
    this.v = v;
  }
}

export class FaceVertex {
  constructor({ vertexIndex, uvIndex = null, normalIndex = null, raw = "" }) {
    this.vertexIndex = vertexIndex;
    this.uvIndex = uvIndex;
    this.normalIndex = normalIndex;
    this.raw = raw;
  }
}

export class Face {
  constructor(vertices, materialName = null) {
    this.vertices = vertices;
    this.materialName = materialName;
  }
}

export class Material {
  constructor(name) {
    this.name = name;
    this.ka = null;
    this.kd = null;
    this.ks = null;
    this.ns = null;
  }
}

export class OBJModel {
  constructor() {
    this.vertices = [];
    this.normals = [];
    this.uvs = [];
    this.faces = [];
    this.mtllibs = [];
    this.materials = new Map();
    this.warnings = [];
  }

  attachMaterials(materials) {
    this.materials = materials instanceof Map ? materials : new Map();
    return this;
  }

  getMaterialForFace(face) {
    if (!face.materialName) {
      return null;
    }

    return this.materials.get(face.materialName) ?? null;
  }
}
