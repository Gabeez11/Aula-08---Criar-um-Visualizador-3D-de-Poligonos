import test from "node:test";
import assert from "node:assert/strict";

import { parseMTL } from "../src/parsers/mtlParser.js";
import { parseOBJ } from "../src/parsers/objParser.js";
import { calculateTopology } from "../src/utils/topology.js";

test("parseOBJ reads vertices, normals, uvs, materials and face formats", () => {
  const materials = parseMTL(`
newmtl matte
Kd 0.8 0.7 0.6
Ka 0.1 0.1 0.1
Ks 0.2 0.2 0.2
Ns 10
`);

  const model = parseOBJ(
    `
# comentario inicial
mtllib sample.mtl
v 0 0 0
v 1 0 0
v 1 1 0
v 0 1 0
vt 0 0
vt 1 0
vt 1 1
vn 0 0 1
g ignored
usemtl matte
f 1 2 3
f 1//1 3//1 4//1
f 1/1/1 2/2/1 3/3/1
`,
    { materials },
  );

  assert.equal(model.vertices.length, 4);
  assert.equal(model.uvs.length, 3);
  assert.equal(model.normals.length, 1);
  assert.equal(model.faces.length, 3);
  assert.equal(model.mtllibs[0], "sample.mtl");
  assert.equal(model.faces[0].materialName, "matte");
  assert.equal(model.faces[1].vertices[0].normalIndex, 0);
  assert.equal(model.faces[2].vertices[1].uvIndex, 1);
  assert.equal(model.getMaterialForFace(model.faces[0]).kd[0], 0.8);
});

test("parseOBJ resolves negative indexes relative to current lists", () => {
  const model = parseOBJ(`
v 0 0 0
v 1 0 0
v 1 1 0
v 0 1 0
f -4 -3 -2 -1
`);

  assert.deepEqual(
    model.faces[0].vertices.map((faceVertex) => faceVertex.vertexIndex),
    [0, 1, 2, 3],
  );
});

test("parseOBJ rejects partial or decimal face indexes", () => {
  assert.throws(
    () =>
      parseOBJ(`
v 0 0 0
v 1 0 0
v 1 1 0
f 1 2 3abc
`),
    /indice de vertice/,
  );
});

test("calculateTopology returns Euler characteristic for a cube", () => {
  const model = parseOBJ(`
v -1 -1 -1
v 1 -1 -1
v 1 1 -1
v -1 1 -1
v -1 -1 1
v 1 -1 1
v 1 1 1
v -1 1 1
f 1 2 3 4
f 5 8 7 6
f 1 5 6 2
f 4 3 7 8
f 1 4 8 5
f 2 6 7 3
`);

  const topology = calculateTopology(model);

  assert.equal(topology.vertexCount, 8);
  assert.equal(topology.edgeCount, 12);
  assert.equal(topology.faceCount, 6);
  assert.equal(topology.eulerCharacteristic, 2);
  assert.equal(topology.isEulerCharacteristicTwo, true);
});
