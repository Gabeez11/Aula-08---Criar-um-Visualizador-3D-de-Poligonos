export function createVector3(x = 0, y = 0, z = 0) {
  return { x, y, z };
}

export function cloneVector(vector) {
  return createVector3(vector.x, vector.y, vector.z);
}

export function addVectors(first, second) {
  return createVector3(
    first.x + second.x,
    first.y + second.y,
    first.z + second.z,
  );
}

export function subtractVectors(first, second) {
  return createVector3(
    first.x - second.x,
    first.y - second.y,
    first.z - second.z,
  );
}

export function scaleVector(vector, scalar) {
  return createVector3(vector.x * scalar, vector.y * scalar, vector.z * scalar);
}

export function crossProduct(first, second) {
  return createVector3(
    first.y * second.z - first.z * second.y,
    first.z * second.x - first.x * second.z,
    first.x * second.y - first.y * second.x,
  );
}

export function vectorLength(vector) {
  return Math.hypot(vector.x, vector.y, vector.z);
}

export function normalizeVector(vector) {
  const length = vectorLength(vector);

  if (length === 0) {
    return createVector3();
  }

  return scaleVector(vector, 1 / length);
}

export function vertexToVector(vertex) {
  return createVector3(vertex.x, vertex.y, vertex.z);
}

export function normalToVector(normal) {
  return createVector3(normal.dx, normal.dy, normal.dz);
}
