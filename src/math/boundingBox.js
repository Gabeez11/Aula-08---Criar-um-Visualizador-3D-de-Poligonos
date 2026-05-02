import {
  addVectors,
  cloneVector,
  createVector3,
  scaleVector,
  subtractVectors,
} from "./vector3.js";

export class BoundingBox {
  constructor(min = createVector3(), max = createVector3()) {
    this.min = cloneVector(min);
    this.max = cloneVector(max);
  }
}

export function calculateBoundingBox(points) {
  if (points.length === 0) {
    return new BoundingBox();
  }

  const min = createVector3(Infinity, Infinity, Infinity);
  const max = createVector3(-Infinity, -Infinity, -Infinity);

  points.forEach((point) => {
    min.x = Math.min(min.x, point.x);
    min.y = Math.min(min.y, point.y);
    min.z = Math.min(min.z, point.z);
    max.x = Math.max(max.x, point.x);
    max.y = Math.max(max.y, point.y);
    max.z = Math.max(max.z, point.z);
  });

  return new BoundingBox(min, max);
}

export function calculateBoundingBoxSize(boundingBox) {
  return subtractVectors(boundingBox.max, boundingBox.min);
}

export function calculateBoundingBoxCenter(boundingBox) {
  return scaleVector(addVectors(boundingBox.min, boundingBox.max), 0.5);
}

export function calculateLargestDimension(boundingBox) {
  const size = calculateBoundingBoxSize(boundingBox);
  return Math.max(size.x, size.y, size.z);
}

export function calculateNormalizationScale(boundingBox, targetSize = 2) {
  const largestDimension = calculateLargestDimension(boundingBox);
  return largestDimension > 0 ? targetSize / largestDimension : 1;
}
