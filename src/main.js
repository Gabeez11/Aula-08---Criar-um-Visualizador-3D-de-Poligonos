import { parseMTL } from "./parsers/mtlParser.js";
import { parseOBJ } from "./parsers/objParser.js";
import { buildRenderableMesh } from "./geometry/mesh.js";
import {
  calculateBoundingBoxCenter,
  calculateBoundingBoxSize,
} from "./math/boundingBox.js";
import { calculateTopology } from "./utils/topology.js";

const objInput = document.querySelector("#objInput");
const mtlInput = document.querySelector("#mtlInput");
const loadSampleButton = document.querySelector("#loadSample");
const message = document.querySelector("#message");
const vertexCount = document.querySelector("#vertexCount");
const faceCount = document.querySelector("#faceCount");
const edgeCount = document.querySelector("#edgeCount");
const eulerValue = document.querySelector("#eulerValue");
const triangleCount = document.querySelector("#triangleCount");
const eulerStatus = document.querySelector("#eulerStatus");
const materialInfo = document.querySelector("#materialInfo");
const mtllibInfo = document.querySelector("#mtllibInfo");
const meshInfo = document.querySelector("#meshInfo");
const warnings = document.querySelector("#warnings");

objInput.addEventListener("change", loadSelectedFiles);
mtlInput.addEventListener("change", loadSelectedFiles);
loadSampleButton.addEventListener("click", loadSample);

async function loadSelectedFiles() {
  const objFile = objInput.files?.[0];

  if (!objFile) {
    resetUI("Selecione um .obj para ver as estatisticas do modelo.");
    return;
  }

  try {
    const materials = await parseSelectedMTLFiles(mtlInput.files ?? []);
    const objText = await objFile.text();
    const model = parseOBJ(objText, { materials });

    renderModelSummary(model, objFile.name);
  } catch (error) {
    resetUI(error.message);
  }
}

async function loadSample() {
  try {
    const [objResponse, mtlResponse] = await Promise.all([
      fetch("./samples/cube.obj"),
      fetch("./samples/cube.mtl"),
    ]);

    if (!objResponse.ok || !mtlResponse.ok) {
      throw new Error("Nao foi possivel carregar o exemplo local.");
    }

    const materials = parseMTL(await mtlResponse.text());
    const model = parseOBJ(await objResponse.text(), { materials });

    renderModelSummary(model, "samples/cube.obj");
  } catch (error) {
    resetUI(`${error.message} Rode a pagina com npm start.`);
  }
}

async function parseSelectedMTLFiles(files) {
  const materials = new Map();

  for (const file of files) {
    const parsedMaterials = parseMTL(await file.text());

    parsedMaterials.forEach((material, name) => {
      materials.set(name, material);
    });
  }

  return materials;
}

function renderModelSummary(model, fileName) {
  const topology = calculateTopology(model);
  const mesh = buildRenderableMesh(model);
  const usedMaterials = new Set(
    model.faces.map((face) => face.materialName).filter(Boolean),
  );

  vertexCount.textContent = String(topology.vertexCount);
  faceCount.textContent = String(topology.faceCount);
  edgeCount.textContent = String(topology.edgeCount);
  eulerValue.textContent = String(topology.eulerCharacteristic);
  triangleCount.textContent = String(mesh.triangleCount);

  eulerStatus.textContent = topology.isEulerCharacteristicTwo
    ? "Resultado igual a 2. O modelo pode ser uma malha fechada simples."
    : "Resultado diferente de 2. Isso e esperado para modelos abertos ou nao manifold.";

  materialInfo.textContent =
    usedMaterials.size > 0
      ? `${usedMaterials.size} material(is) em uso: ${Array.from(usedMaterials).join(", ")}.`
      : "Nenhum usemtl encontrado nas faces.";

  mtllibInfo.textContent =
    model.mtllibs.length > 0
      ? model.mtllibs.join(", ")
      : "Nenhum mtllib encontrado.";

  meshInfo.textContent = formatMeshInfo(mesh);
  console.debug("Mesh debug", {
    triangleCount: mesh.triangleCount,
    renderVertexCount: mesh.renderVertexCount,
    center: mesh.center,
    scale: mesh.scale,
    boundingBox: mesh.boundingBox,
    generatedNormalCount: mesh.generatedNormalCount,
  });

  renderWarnings(model.warnings);
  message.textContent = `Arquivo carregado: ${fileName}`;
}

function renderWarnings(items) {
  warnings.replaceChildren();

  if (items.length === 0) {
    const item = document.createElement("li");
    item.textContent = "Nenhum aviso.";
    warnings.append(item);
    return;
  }

  items.forEach((warning) => {
    const item = document.createElement("li");
    item.textContent = warning;
    warnings.append(item);
  });
}

function resetUI(text) {
  vertexCount.textContent = "0";
  faceCount.textContent = "0";
  edgeCount.textContent = "0";
  eulerValue.textContent = "0";
  triangleCount.textContent = "0";
  eulerStatus.textContent = "Aguardando arquivo.";
  materialInfo.textContent = "Nenhum material carregado.";
  mtllibInfo.textContent = "Nenhum mtllib encontrado.";
  meshInfo.textContent = "Nenhuma malha montada.";
  warnings.replaceChildren();
  message.textContent = text;
}

function formatMeshInfo(mesh) {
  const finalCenter = calculateBoundingBoxCenter(mesh.boundingBox);
  const finalSize = calculateBoundingBoxSize(mesh.boundingBox);
  const normalSummary =
    mesh.generatedNormalCount > 0
      ? `${mesh.generatedNormalCount} normal(is) gerada(s).`
      : "Normais do arquivo preservadas.";

  return [
    `${mesh.triangleCount} triangulo(s) renderizavel(is).`,
    `Centro final ${formatVector(finalCenter)}.`,
    `Escala ${formatNumber(mesh.scale)}; tamanho final ${formatVector(finalSize)}.`,
    normalSummary,
  ].join(" ");
}

function formatVector(vector) {
  return `(${formatNumber(vector.x)}, ${formatNumber(vector.y)}, ${formatNumber(
    vector.z,
  )})`;
}

function formatNumber(value) {
  if (Math.abs(value) < 1e-9) {
    return "0";
  }

  return value.toFixed(3).replace(/\.?0+$/, "");
}
