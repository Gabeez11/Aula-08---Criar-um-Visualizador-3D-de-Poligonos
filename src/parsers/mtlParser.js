import { Material } from "../models.js";

export function parseMTL(text) {
  const materials = new Map();
  let currentMaterial = null;

  const lines = text.split(/\r?\n/);

  lines.forEach((line, index) => {
    const parsedLine = stripComment(line).trim();

    if (!parsedLine) {
      return;
    }

    const [keyword, ...tokens] = parsedLine.split(/\s+/);

    if (keyword === "newmtl") {
      const name = tokens.join(" ").trim();

      if (!name) {
        return;
      }

      currentMaterial = new Material(name);
      materials.set(name, currentMaterial);
      return;
    }

    if (!currentMaterial) {
      return;
    }

    if (keyword === "Kd") {
      currentMaterial.kd = readColor(tokens, index + 1);
      return;
    }

    if (keyword === "Ka") {
      currentMaterial.ka = readColor(tokens, index + 1);
      return;
    }

    if (keyword === "Ks") {
      currentMaterial.ks = readColor(tokens, index + 1);
      return;
    }

    if (keyword === "Ns") {
      const shininess = Number(tokens[0]);
      currentMaterial.ns = Number.isFinite(shininess) ? shininess : null;
    }
  });

  return materials;
}

function readColor(tokens, lineNumber) {
  if (tokens.length < 3) {
    throw new Error(`Linha ${lineNumber}: cor MTL precisa de 3 valores.`);
  }

  const color = tokens.slice(0, 3).map(Number);

  if (color.some((value) => !Number.isFinite(value))) {
    throw new Error(`Linha ${lineNumber}: cor MTL contem valor invalido.`);
  }

  return color;
}

function stripComment(line) {
  const commentIndex = line.indexOf("#");
  return commentIndex >= 0 ? line.slice(0, commentIndex) : line;
}
