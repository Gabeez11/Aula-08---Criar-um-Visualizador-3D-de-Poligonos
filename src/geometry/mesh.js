import {
  calculateBoundingBox,
  calculateBoundingBoxCenter,
  calculateNormalizationScale,
} from "../math/boundingBox.js";
import {
  cloneVector,
  crossProduct,
  normalizeVector,
  normalToVector,
  scaleVector,
  subtractVectors,
  vertexToVector,
} from "../math/vector3.js";

export class RenderVertex {
  constructor({
    position,
    normal,
    uv = null,
    sourceVertexIndex,
    sourceUVIndex = null,
    sourceNormalIndex = null,
    normalGenerated = false,
  }) {
    this.position = cloneVector(position);
    this.normal = cloneVector(normal);
    this.uv = uv ? { u: uv.u, v: uv.v } : null;
    this.sourceVertexIndex = sourceVertexIndex;
    this.sourceUVIndex = sourceUVIndex;
    this.sourceNormalIndex = sourceNormalIndex;
    this.normalGenerated = normalGenerated;
  }
}

export class Triangle {
  constructor({
    vertices,
    materialName = null,
    material = null,
    sourceFaceIndex = null,
    sourceVertexIndices = [],
  }) {
    if (vertices.length !== 3) {
      throw new Error("Triangle precisa de exatamente 3 vertices.");
    }

    this.vertices = vertices;
    this.materialName = materialName;
    this.material = material;
    this.sourceFaceIndex = sourceFaceIndex;
    this.sourceVertexIndices = [...sourceVertexIndices];
  }
}

export class Mesh {
  constructor({
    triangles,
    originalBoundingBox,
    boundingBox,
    center,
    scale,
    generatedNormalCount = 0,
  }) {
    this.triangles = triangles;
    this.vertices = triangles.flatMap((triangle) => triangle.vertices);
    this.originalBoundingBox = originalBoundingBox;
    this.boundingBox = boundingBox;
    this.center = cloneVector(center);
    this.scale = scale;
    this.generatedNormalCount = generatedNormalCount;
  }

  get triangleCount() {
    return this.triangles.length;
  }

  get renderVertexCount() {
    return this.vertices.length;
  }
}

export function buildRenderableMesh(model, options = {}) {
  if (!model || !Array.isArray(model.vertices) || !Array.isArray(model.faces)) {
    throw new Error("OBJModel invalido para montagem da malha.");
  }

  const targetSize = options.targetSize ?? 2;
  const originalPositions = model.vertices.map(vertexToVector);
  const originalBoundingBox = calculateBoundingBox(originalPositions);
  const center = calculateBoundingBoxCenter(originalBoundingBox);
  const scale = calculateNormalizationScale(originalBoundingBox, targetSize);
  const normalizedPositions = originalPositions.map((position) =>
    scaleVector(subtractVectors(position, center), scale),
  );
  const boundingBox = calculateBoundingBox(normalizedPositions);
  const triangles = [];
  let generatedNormalCount = 0;

  model.faces.forEach((face, sourceFaceIndex) => {
    for (let index = 1; index < face.vertices.length - 1; index += 1) {
      const faceVertices = [
        face.vertices[0],
        face.vertices[index],
        face.vertices[index + 1],
      ];
      const positions = faceVertices.map(
        (faceVertex) => normalizedPositions[faceVertex.vertexIndex],
      );
      const faceNormal = calculateFaceNormal(positions[0], positions[1], positions[2]);
      const renderVertices = faceVertices.map((faceVertex) => {
        const normalInfo = resolveNormal(model, faceVertex, faceNormal);

        if (normalInfo.generated) {
          generatedNormalCount += 1;
        }

        return new RenderVertex({
          position: normalizedPositions[faceVertex.vertexIndex],
          normal: normalInfo.normal,
          uv: faceVertex.uvIndex === null ? null : model.uvs[faceVertex.uvIndex],
          sourceVertexIndex: faceVertex.vertexIndex,
          sourceUVIndex: faceVertex.uvIndex,
          sourceNormalIndex: faceVertex.normalIndex,
          normalGenerated: normalInfo.generated,
        });
      });

      triangles.push(
        new Triangle({
          vertices: renderVertices,
          materialName: face.materialName,
          material: getMaterialForFace(model, face),
          sourceFaceIndex,
          sourceVertexIndices: faceVertices.map((faceVertex) => faceVertex.vertexIndex),
        }),
      );
    }
  });

  return new Mesh({
    triangles,
    originalBoundingBox,
    boundingBox,
    center,
    scale,
    generatedNormalCount,
  });
}

export function calculateFaceNormal(first, second, third) {
  const firstEdge = subtractVectors(second, first);
  const secondEdge = subtractVectors(third, first);
  return normalizeVector(crossProduct(firstEdge, secondEdge));
}

function resolveNormal(model, faceVertex, fallbackNormal) {
  const normal =
    faceVertex.normalIndex === null ? null : model.normals[faceVertex.normalIndex];

  if (!normal) {
    return {
      normal: fallbackNormal,
      generated: true,
    };
  }

  return {
    normal: normalizeVector(normalToVector(normal)),
    generated: false,
  };
}

function getMaterialForFace(model, face) {
  if (typeof model.getMaterialForFace === "function") {
    return model.getMaterialForFace(face);
  }

  return face.materialName && model.materials instanceof Map
    ? model.materials.get(face.materialName) ?? null
    : null;
}
