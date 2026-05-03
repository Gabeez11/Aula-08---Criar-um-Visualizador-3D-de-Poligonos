import {
  crossProduct,
  normalizeVector,
  subtractVectors,
  vectorLength,
} from "../math/vector3.js";
import { createIdentityMatrix, transformPoint, transformVector } from "../math/matrix4.js";

export const PROJECTIONS = Object.freeze({
  ISOMETRIC: "isometric",
  PERSPECTIVE: "perspective",
});

export const DISPLAY_MODES = Object.freeze({
  SOLID: "solid",
  WIREFRAME: "wireframe",
  SOLID_WIREFRAME: "solid-wireframe",
});

const DEFAULT_MATERIAL_COLOR = [0.62, 0.68, 0.76];
const BACKGROUND_COLOR = "#f8fafc";
const WIREFRAME_COLOR = "rgba(20, 24, 31, 0.82)";
const SOLID_WIREFRAME_COLOR = "rgba(8, 13, 23, 0.58)";
const LIGHT_DIRECTION = normalizeVector({ x: -0.35, y: 0.72, z: 0.9 });
const ISOMETRIC_Y_ROTATION = -Math.PI / 4;
const ISOMETRIC_X_ROTATION = Math.atan(1 / Math.sqrt(2));
const PERSPECTIVE_CAMERA_DISTANCE = 4;
const PERSPECTIVE_FOCAL_LENGTH = 4;
const FRONT_FACE_EPSILON = 1e-6;

export class CanvasRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.projection = PROJECTIONS.ISOMETRIC;
    this.displayMode = DISPLAY_MODES.SOLID;
    this.modelMatrix = createIdentityMatrix();
  }

  setModelMatrix(matrix) {
    this.modelMatrix = matrix;
  }

  getModelMatrix() {
    return this.modelMatrix;
  }

  setProjection(projection) {
    if (!Object.values(PROJECTIONS).includes(projection)) {
      throw new Error(`Projecao desconhecida: ${projection}`);
    }

    this.projection = projection;
  }

  setDisplayMode(displayMode) {
    if (!Object.values(DISPLAY_MODES).includes(displayMode)) {
      throw new Error(`Modo de renderizacao desconhecido: ${displayMode}`);
    }

    this.displayMode = displayMode;
  }

  render(mesh) {
    const { width, height } = resizeCanvasToDisplaySize(this.canvas, this.context);

    this.context.fillStyle = BACKGROUND_COLOR;
    this.context.fillRect(0, 0, width, height);

    if (!mesh || mesh.triangleCount === 0) {
      drawEmptyState(this.context, width, height);
      return;
    }

    const edgeVisibility = createSourceFaceEdgeVisibility(mesh);
    const modelMatrix = this.modelMatrix;
    const triangles = mesh.triangles
      .map((triangle) =>
        createRenderableTriangle({
          triangle,
          width,
          height,
          projection: this.projection,
          edgeVisibility,
          modelMatrix,
        }),
      )
      .filter(Boolean)
      .sort((first, second) => first.depth - second.depth);

    if (
      this.displayMode === DISPLAY_MODES.SOLID ||
      this.displayMode === DISPLAY_MODES.SOLID_WIREFRAME
    ) {
      triangles.forEach((triangle) => drawSolidTriangle(this.context, triangle));
    }

    if (
      this.displayMode === DISPLAY_MODES.WIREFRAME ||
      this.displayMode === DISPLAY_MODES.SOLID_WIREFRAME
    ) {
      const color =
        this.displayMode === DISPLAY_MODES.SOLID_WIREFRAME
          ? SOLID_WIREFRAME_COLOR
          : WIREFRAME_COLOR;

      triangles.forEach((triangle) =>
        drawTriangleEdges(this.context, triangle, color),
      );
    }
  }
}

export function transformToCameraSpace(position) {
  return rotateX(rotateY(position, ISOMETRIC_Y_ROTATION), ISOMETRIC_X_ROTATION);
}

export function projectCameraPoint(position, projection) {
  if (projection === PROJECTIONS.PERSPECTIVE) {
    const distanceFromCamera = Math.max(
      0.1,
      PERSPECTIVE_CAMERA_DISTANCE - position.z,
    );
    const perspectiveScale = PERSPECTIVE_FOCAL_LENGTH / distanceFromCamera;

    return {
      x: position.x * perspectiveScale,
      y: position.y * perspectiveScale,
      z: position.z,
    };
  }

  return {
    x: position.x,
    y: position.y,
    z: position.z,
  };
}

export function isFrontFacing(normal) {
  return normal.z > FRONT_FACE_EPSILON;
}

export function shadeMaterialColor(material, intensity) {
  const kd = Array.isArray(material?.kd) ? material.kd : DEFAULT_MATERIAL_COLOR;
  const shaded = kd.map((component) =>
    Math.round(clamp01(component) * clamp01(intensity) * 255),
  );

  return `rgb(${shaded[0]}, ${shaded[1]}, ${shaded[2]})`;
}

function createRenderableTriangle({ triangle, width, height, projection, edgeVisibility, modelMatrix }) {
  const modelPositions = triangle.vertices.map((vertex) =>
    transformPoint(modelMatrix, vertex.position),
  );
  const cameraPositions = modelPositions.map((position) =>
    transformToCameraSpace(position),
  );
  const faceNormal = resolveFaceNormal(triangle, cameraPositions, modelMatrix);

  if (!isFrontFacing(faceNormal)) {
    return null;
  }

  const intensity = Math.max(0, dotProduct(faceNormal, LIGHT_DIRECTION));
  const points = cameraPositions
    .map((position) => projectCameraPoint(position, projection))
    .map((position) => toScreenPoint(position, width, height));

  return {
    points,
    edgeMask: getTriangleEdgeMask(triangle, edgeVisibility),
    depth:
      cameraPositions.reduce((sum, position) => sum + position.z, 0) /
      cameraPositions.length,
    color: shadeMaterialColor(triangle.material, intensity),
  };
}

function resolveFaceNormal(triangle, cameraPositions, modelMatrix) {
  const geometricNormal = calculateFaceNormal(cameraPositions);
  const sourceNormal = calculateAverageSourceNormal(triangle, modelMatrix);

  if (sourceNormal && dotProduct(geometricNormal, sourceNormal) < 0) {
    return sourceNormal;
  }

  return geometricNormal;
}

function calculateFaceNormal(cameraPositions) {
  const firstEdge = subtractVectors(cameraPositions[1], cameraPositions[0]);
  const secondEdge = subtractVectors(cameraPositions[2], cameraPositions[0]);

  return normalizeVector(crossProduct(firstEdge, secondEdge));
}

function calculateAverageSourceNormal(triangle, modelMatrix) {
  if (triangle.vertices.some((vertex) => vertex.normalGenerated || !vertex.normal)) {
    return null;
  }

  const summedNormal = triangle.vertices.reduce(
    (sum, vertex) => {
      const transformedNormal = transformVector(modelMatrix, vertex.normal);
      const cameraNormal = transformToCameraSpace(transformedNormal);

      return {
        x: sum.x + cameraNormal.x,
        y: sum.y + cameraNormal.y,
        z: sum.z + cameraNormal.z,
      };
    },
    { x: 0, y: 0, z: 0 },
  );

  if (vectorLength(summedNormal) === 0) {
    return null;
  }

  return normalizeVector(summedNormal);
}

function createSourceFaceEdgeVisibility(mesh) {
  const edgeCounts = new Map();

  mesh.triangles.forEach((triangle) => {
    getTriangleEdgeKeys(triangle).forEach((edgeKey) => {
      if (!edgeKey) {
        return;
      }

      edgeCounts.set(edgeKey, (edgeCounts.get(edgeKey) ?? 0) + 1);
    });
  });

  return edgeCounts;
}

function getTriangleEdgeMask(triangle, edgeVisibility) {
  return getTriangleEdgeKeys(triangle).map((edgeKey) => {
    if (!edgeKey) {
      return true;
    }

    return edgeVisibility.get(edgeKey) === 1;
  });
}

function getTriangleEdgeKeys(triangle) {
  if (
    triangle.sourceFaceIndex === null ||
    triangle.sourceVertexIndices.length !== 3
  ) {
    return [null, null, null];
  }

  return [0, 1, 2].map((index) => {
    const first = triangle.sourceVertexIndices[index];
    const second = triangle.sourceVertexIndices[(index + 1) % 3];
    const low = Math.min(first, second);
    const high = Math.max(first, second);

    return `${triangle.sourceFaceIndex}:${low}:${high}`;
  });
}

function toScreenPoint(position, width, height) {
  const scale = Math.min(width, height) * 0.38;

  return {
    x: width / 2 + position.x * scale,
    y: height / 2 - position.y * scale,
  };
}

function drawSolidTriangle(context, triangle) {
  drawTrianglePath(context, triangle.points);
  context.fillStyle = triangle.color;
  context.fill();
}

function drawTriangleEdges(context, triangle, color) {
  context.beginPath();

  triangle.edgeMask.forEach((visible, index) => {
    if (!visible) {
      return;
    }

    const point = triangle.points[index];
    const nextPoint = triangle.points[(index + 1) % triangle.points.length];

    context.moveTo(point.x, point.y);
    context.lineTo(nextPoint.x, nextPoint.y);
  });

  context.strokeStyle = color;
  context.lineWidth = 1.2;
  context.lineJoin = "round";
  context.stroke();
}

function drawTrianglePath(context, points) {
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  context.lineTo(points[1].x, points[1].y);
  context.lineTo(points[2].x, points[2].y);
  context.closePath();
}

function drawEmptyState(context, width, height) {
  context.fillStyle = "#6b7280";
  context.font = "15px system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("Nenhum modelo carregado", width / 2, height / 2);
}

function resizeCanvasToDisplaySize(canvas, context) {
  const pixelRatio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || canvas.width;
  const height = canvas.clientHeight || canvas.height;
  const nextWidth = Math.floor(width * pixelRatio);
  const nextHeight = Math.floor(height * pixelRatio);

  if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
    canvas.width = nextWidth;
    canvas.height = nextHeight;
  }

  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  return { width, height };
}

function rotateX(vector, angle) {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);

  return {
    x: vector.x,
    y: vector.y * cosine - vector.z * sine,
    z: vector.y * sine + vector.z * cosine,
  };
}

function rotateY(vector, angle) {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);

  return {
    x: vector.x * cosine + vector.z * sine,
    y: vector.y,
    z: -vector.x * sine + vector.z * cosine,
  };
}

function dotProduct(first, second) {
  return first.x * second.x + first.y * second.y + first.z * second.z;
}

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}
