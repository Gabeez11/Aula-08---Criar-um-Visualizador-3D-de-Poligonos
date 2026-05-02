import test from "node:test";
import assert from "node:assert/strict";

import { buildRenderableMesh } from "../src/geometry/mesh.js";
import {
  calculateBoundingBoxCenter,
  calculateBoundingBoxSize,
} from "../src/math/boundingBox.js";
import { vectorLength } from "../src/math/vector3.js";
import { parseMTL } from "../src/parsers/mtlParser.js";
import { parseOBJ } from "../src/parsers/objParser.js";

test("buildRenderableMesh triangulates faces with fan triangulation", () => {
  const materials = parseMTL(`
newmtl red
Kd 1 0 0
`);
  const model = parseOBJ(
    `
v 0 0 0
v 1 0 0
v 1 1 0
v 0 1 0
usemtl red
f 1 2 3 4
`,
    { materials },
  );

  const mesh = buildRenderableMesh(model);

  assert.equal(mesh.triangleCount, 2);
  assert.deepEqual(
    mesh.triangles.map((triangle) => triangle.sourceVertexIndices),
    [
      [0, 1, 2],
      [0, 2, 3],
    ],
  );
  assert.equal(mesh.triangles[0].materialName, "red");
  assert.equal(mesh.triangles[0].material.kd[0], 1);
});

test("buildRenderableMesh centers the object and normalizes its scale", () => {
  const model = parseOBJ(`
v 10 -5 0
v 20 -5 0
v 20 5 0
v 10 5 0
f 1 2 3 4
`);

  const mesh = buildRenderableMesh(model);
  const finalCenter = calculateBoundingBoxCenter(mesh.boundingBox);
  const finalSize = calculateBoundingBoxSize(mesh.boundingBox);

  assertVectorClose(mesh.center, { x: 15, y: 0, z: 0 });
  assert.equal(mesh.scale, 0.2);
  assertVectorClose(finalCenter, { x: 0, y: 0, z: 0 });
  assertVectorClose(finalSize, { x: 2, y: 2, z: 0 });
});

test("buildRenderableMesh generates normalized face normals when OBJ has no normals", () => {
  const model = parseOBJ(`
v 0 0 0
v 2 0 0
v 0 3 0
f 1 2 3
`);

  const mesh = buildRenderableMesh(model);
  const normals = mesh.triangles[0].vertices.map((vertex) => vertex.normal);

  assert.equal(mesh.generatedNormalCount, 3);
  assert.equal(mesh.triangles[0].vertices.every((vertex) => vertex.normalGenerated), true);
  normals.forEach((normal) => {
    assertVectorClose(normal, { x: 0, y: 0, z: 1 });
    assert.equal(vectorLength(normal), 1);
  });
});

test("buildRenderableMesh preserves and normalizes normals from OBJ", () => {
  const model = parseOBJ(`
v 0 0 0
v 1 0 0
v 0 1 0
vn 0 0 5
f 1//1 2//1 3//1
`);

  const mesh = buildRenderableMesh(model);

  assert.equal(mesh.generatedNormalCount, 0);
  mesh.vertices.forEach((vertex) => {
    assert.equal(vertex.normalGenerated, false);
    assertVectorClose(vertex.normal, { x: 0, y: 0, z: 1 });
  });
});

function assertVectorClose(actual, expected, epsilon = 1e-9) {
  assert.ok(Math.abs(actual.x - expected.x) <= epsilon);
  assert.ok(Math.abs(actual.y - expected.y) <= epsilon);
  assert.ok(Math.abs(actual.z - expected.z) <= epsilon);
}
