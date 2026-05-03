import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { buildRenderableMesh } from "../src/geometry/mesh.js";
import { parseMTL } from "../src/parsers/mtlParser.js";
import { parseOBJ } from "../src/parsers/objParser.js";

const SAMPLE_MODELS = [
  {
    name: "cube",
    objPath: "samples/cube.obj",
    mtlPath: "samples/cube.mtl",
    triangleCount: 12,
  },
  {
    name: "pyramid",
    objPath: "samples/pyramid.obj",
    mtlPath: "samples/pyramid.mtl",
    triangleCount: 6,
  },
  {
    name: "octahedron",
    objPath: "samples/octahedron.obj",
    mtlPath: "samples/octahedron.mtl",
    triangleCount: 8,
  },
  {
    name: "cylinder",
    objPath: "samples/cylinder.obj",
    mtlPath: "samples/cylinder.mtl",
    triangleCount: 28,
  },
];

test("sample models parse and build renderable meshes", () => {
  SAMPLE_MODELS.forEach((sample) => {
    const materials = parseMTL(readFileSync(sample.mtlPath, "utf8"));
    const model = parseOBJ(readFileSync(sample.objPath, "utf8"), { materials });
    const mesh = buildRenderableMesh(model);

    assert.equal(mesh.triangleCount, sample.triangleCount, sample.name);
    assert.ok(model.vertices.length > 0, sample.name);
    assert.ok(model.faces.length > 0, sample.name);
    assert.ok(model.materials.size > 0, sample.name);
  });
});
