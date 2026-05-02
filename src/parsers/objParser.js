import { Face, FaceVertex, Normal, OBJModel, UV, Vertex } from "../models.js";

const IGNORED_KEYWORDS = new Set(["g", "o", "s"]);

export function parseOBJ(text, options = {}) {
  const model = new OBJModel();
  const materialLibraries = options.materials ?? new Map();
  let currentMaterialName = null;

  if (materialLibraries instanceof Map) {
    model.attachMaterials(materialLibraries);
  }

  const lines = text.split(/\r?\n/);

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const parsedLine = stripComment(line).trim();

    if (!parsedLine) {
      return;
    }

    const [keyword, ...tokens] = parsedLine.split(/\s+/);

    if (keyword === "v") {
      model.vertices.push(readVertex(tokens, lineNumber));
      return;
    }

    if (keyword === "vn") {
      model.normals.push(readNormal(tokens, lineNumber));
      return;
    }

    if (keyword === "vt") {
      model.uvs.push(readUV(tokens, lineNumber));
      return;
    }

    if (keyword === "f") {
      model.faces.push(readFace(tokens, model, currentMaterialName, lineNumber));
      return;
    }

    if (keyword === "mtllib") {
      const libraries = tokens.filter(Boolean);
      model.mtllibs.push(...libraries);
      return;
    }

    if (keyword === "usemtl") {
      currentMaterialName = tokens.join(" ").trim() || null;
      return;
    }

    if (!IGNORED_KEYWORDS.has(keyword)) {
      model.warnings.push(`Linha ${lineNumber}: comando '${keyword}' ignorado.`);
    }
  });

  return model;
}

function readVertex(tokens, lineNumber) {
  const [x, y, z] = readNumbers(tokens, 3, lineNumber, "vertice");
  return new Vertex(x, y, z);
}

function readNormal(tokens, lineNumber) {
  const [dx, dy, dz] = readNumbers(tokens, 3, lineNumber, "normal");
  return new Normal(dx, dy, dz);
}

function readUV(tokens, lineNumber) {
  const [u, v] = readNumbers(tokens, 2, lineNumber, "uv");
  return new UV(u, v);
}

function readFace(tokens, model, materialName, lineNumber) {
  if (tokens.length < 3) {
    throw new Error(`Linha ${lineNumber}: face precisa de pelo menos 3 vertices.`);
  }

  const vertices = tokens.map((token) => parseFaceVertex(token, model, lineNumber));
  return new Face(vertices, materialName);
}

function parseFaceVertex(token, model, lineNumber) {
  const parts = token.split("/");

  if (parts.length > 3) {
    throw new Error(`Linha ${lineNumber}: face '${token}' tem formato invalido.`);
  }

  const [vertexToken, uvToken, normalToken] = parts;

  if (!vertexToken) {
    throw new Error(`Linha ${lineNumber}: face '${token}' nao tem indice de vertice.`);
  }

  return new FaceVertex({
    vertexIndex: resolveOBJIndex(vertexToken, model.vertices.length, lineNumber, "vertice"),
    uvIndex: uvToken
      ? resolveOBJIndex(uvToken, model.uvs.length, lineNumber, "uv")
      : null,
    normalIndex: normalToken
      ? resolveOBJIndex(normalToken, model.normals.length, lineNumber, "normal")
      : null,
    raw: token,
  });
}

function resolveOBJIndex(token, collectionLength, lineNumber, label) {
  const parsedIndex = Number(token);

  if (!Number.isInteger(parsedIndex) || parsedIndex === 0) {
    throw new Error(`Linha ${lineNumber}: indice de ${label} '${token}' invalido.`);
  }

  const resolvedIndex =
    parsedIndex < 0 ? collectionLength + parsedIndex : parsedIndex - 1;

  if (resolvedIndex < 0 || resolvedIndex >= collectionLength) {
    throw new Error(`Linha ${lineNumber}: indice de ${label} '${token}' fora do intervalo.`);
  }

  return resolvedIndex;
}

function readNumbers(tokens, expectedCount, lineNumber, label) {
  if (tokens.length < expectedCount) {
    throw new Error(`Linha ${lineNumber}: ${label} precisa de ${expectedCount} valores.`);
  }

  const numbers = tokens.slice(0, expectedCount).map(Number);

  if (numbers.some((value) => !Number.isFinite(value))) {
    throw new Error(`Linha ${lineNumber}: ${label} contem valor invalido.`);
  }

  return numbers;
}

function stripComment(line) {
  const commentIndex = line.indexOf("#");
  return commentIndex >= 0 ? line.slice(0, commentIndex) : line;
}
