export function createIdentityMatrix() {
  return [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ];
}

export function createScaleMatrix(scale) {
  return [
    scale, 0, 0, 0,
    0, scale, 0, 0,
    0, 0, scale, 0,
    0, 0, 0, 1,
  ];
}

export function createRotationXMatrix(angle) {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);

  return [
    1, 0, 0, 0,
    0, cosine, -sine, 0,
    0, sine, cosine, 0,
    0, 0, 0, 1,
  ];
}

export function createRotationYMatrix(angle) {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);

  return [
    cosine, 0, sine, 0,
    0, 1, 0, 0,
    -sine, 0, cosine, 0,
    0, 0, 0, 1,
  ];
}

export function createRotationZMatrix(angle) {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);

  return [
    cosine, -sine, 0, 0,
    sine, cosine, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ];
}

export function createTranslationMatrix(x, y, z) {
  return [
    1, 0, 0, x,
    0, 1, 0, y,
    0, 0, 1, z,
    0, 0, 0, 1,
  ];
}

export function multiplyMatrices(a, b) {
  const result = new Array(16);

  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      let sum = 0;

      for (let k = 0; k < 4; k++) {
        sum += a[row * 4 + k] * b[k * 4 + col];
      }

      result[row * 4 + col] = sum;
    }
  }

  return result;
}

export function transformPoint(matrix, point) {
  const x = point.x;
  const y = point.y;
  const z = point.z;

  return {
    x: matrix[0] * x + matrix[1] * y + matrix[2] * z + matrix[3],
    y: matrix[4] * x + matrix[5] * y + matrix[6] * z + matrix[7],
    z: matrix[8] * x + matrix[9] * y + matrix[10] * z + matrix[11],
  };
}

export function transformVector(matrix, vector) {
  const x = vector.x;
  const y = vector.y;
  const z = vector.z;

  return {
    x: matrix[0] * x + matrix[1] * y + matrix[2] * z,
    y: matrix[4] * x + matrix[5] * y + matrix[6] * z,
    z: matrix[8] * x + matrix[9] * y + matrix[10] * z,
  };
}