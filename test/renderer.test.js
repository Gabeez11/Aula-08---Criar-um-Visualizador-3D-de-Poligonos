import test from "node:test";
import assert from "node:assert/strict";

import {
  isFrontFacing,
  projectCameraPoint,
  PROJECTIONS,
  shadeMaterialColor,
} from "../src/rendering/renderer.js";

test("isFrontFacing uses the camera-space normal Z sign", () => {
  assert.equal(isFrontFacing({ x: 0, y: 0, z: 1 }), true);
  assert.equal(isFrontFacing({ x: 0, y: 0, z: -1 }), false);
  assert.equal(isFrontFacing({ x: 1, y: 0, z: 0 }), false);
});

test("shadeMaterialColor multiplies Kd by light intensity", () => {
  assert.equal(
    shadeMaterialColor({ kd: [0.5, 0.25, 1] }, 0.5),
    "rgb(64, 32, 128)",
  );
});

test("perspective projection enlarges points closer to the camera", () => {
  const nearPoint = projectCameraPoint(
    { x: 1, y: 0, z: 1 },
    PROJECTIONS.PERSPECTIVE,
  );
  const farPoint = projectCameraPoint(
    { x: 1, y: 0, z: -1 },
    PROJECTIONS.PERSPECTIVE,
  );

  assert.ok(nearPoint.x > farPoint.x);
});
