import { parseMTL } from "./parsers/mtlParser.js";
import { parseOBJ } from "./parsers/objParser.js";
import { buildRenderableMesh } from "./geometry/mesh.js";
import {
  calculateBoundingBoxCenter,
  calculateBoundingBoxSize,
} from "./math/boundingBox.js";
import {
  CanvasRenderer,
  DISPLAY_MODES,
  PROJECTIONS,
} from "./rendering/renderer.js";
import { calculateTopology } from "./utils/topology.js";
import {
  createIdentityMatrix,
  createScaleMatrix,
  createRotationXMatrix,
  createRotationYMatrix,
  createRotationZMatrix,
  createTranslationMatrix,
  multiplyMatrices,
} from "./math/matrix4.js";

const ROTATION_INCREMENT = Math.PI / 18;
const SCALE_INCREMENT = 0.1;
const TRANSLATION_INCREMENT = 0.1;

const SAMPLE_MODELS = Object.freeze({
  cube: {
    label: "Cubo",
    objPath: "./samples/cube.obj",
    mtlPath: "./samples/cube.mtl",
  },
  pyramid: {
    label: "Piramide",
    objPath: "./samples/pyramid.obj",
    mtlPath: "./samples/pyramid.mtl",
  },
  octahedron: {
    label: "Octaedro",
    objPath: "./samples/octahedron.obj",
    mtlPath: "./samples/octahedron.mtl",
  },
  cylinder: {
    label: "Cilindro",
    objPath: "./samples/cylinder.obj",
    mtlPath: "./samples/cylinder.mtl",
  },
});

export const TOOLS = Object.freeze({
  NONE: "none",
  SCALE: "scale",
  ROTATION: "rotation",
  TRANSLATION: "translation",
});

const objInput = document.querySelector("#objInput");
const mtlInput = document.querySelector("#mtlInput");
const sampleSelect = document.querySelector("#sampleSelect");
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
const viewerCanvas = document.querySelector("#viewerCanvas");
const loadedModelName = document.querySelector("#loadedModelName");
const displayModeValue = document.querySelector("#displayModeValue");
const projectionValue = document.querySelector("#projectionValue");
const projectionButton = document.querySelector("#toggleProjection");
const displayModeButtons = document.querySelectorAll("[data-display-mode]");
const toolValue = document.querySelector("#toolValue");
const transformInfo = document.querySelector("#transformInfo");
const creditsInfo = document.querySelector("#creditsInfo");

const renderer = new CanvasRenderer(viewerCanvas);
let currentMesh = null;
let pendingRedraw = null;

let currentTool = TOOLS.NONE;
let currentScale = 1;
let currentRotationX = 0;
let currentRotationY = 0;
let currentRotationZ = 0;
let currentTranslationX = 0;
let currentTranslationY = 0;
let currentTranslationZ = 0;

let isMouseDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

objInput.addEventListener("change", loadSelectedFiles);
mtlInput.addEventListener("change", loadSelectedFiles);
loadSampleButton.addEventListener("click", loadSample);
projectionButton.addEventListener("click", toggleProjection);
displayModeButtons.forEach((button) => {
  button.addEventListener("click", () => setDisplayMode(button.dataset.displayMode));
});
document.addEventListener("keydown", handleKeyboardShortcut);
window.addEventListener("resize", redraw);

viewerCanvas.addEventListener("mousedown", handleMouseDown);
viewerCanvas.addEventListener("mousemove", handleMouseMove);
viewerCanvas.addEventListener("mouseup", handleMouseUp);
viewerCanvas.addEventListener("mouseleave", handleMouseUp);

updateRendererStatus();
redraw();

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
    const selectedSample =
      SAMPLE_MODELS[sampleSelect.value] ?? SAMPLE_MODELS.cube;
    const [objResponse, mtlResponse] = await Promise.all([
      fetch(selectedSample.objPath),
      fetch(selectedSample.mtlPath),
    ]);

    if (!objResponse.ok || !mtlResponse.ok) {
      throw new Error("Nao foi possivel carregar o exemplo local.");
    }

    const materials = parseMTL(await mtlResponse.text());
    const model = parseOBJ(await objResponse.text(), { materials });

    renderModelSummary(model, `${selectedSample.label} (${selectedSample.objPath})`);
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
  currentMesh = mesh;
  loadedModelName.textContent = fileName;
  message.textContent = `Arquivo carregado: ${fileName}`;
  redraw();
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
  currentMesh = null;
  loadedModelName.textContent = "Nenhum";
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
  redraw();
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

function toggleProjection() {
  const nextProjection =
    renderer.projection === PROJECTIONS.ISOMETRIC
      ? PROJECTIONS.PERSPECTIVE
      : PROJECTIONS.ISOMETRIC;

  renderer.setProjection(nextProjection);
  updateRendererStatus();
  redraw();
}

function setDisplayMode(displayMode) {
  renderer.setDisplayMode(displayMode);
  updateRendererStatus();
  redraw();
}

function handleKeyboardShortcut(event) {
  if (event.ctrlKey || event.metaKey || event.altKey || event.defaultPrevented) {
    return;
  }

  const key = event.key.toLowerCase();

  if (key === "p") {
    event.preventDefault();
    toggleProjection();
    return;
  }

  if (key === "m") {
    event.preventDefault();
    const modes = [DISPLAY_MODES.SOLID, DISPLAY_MODES.WIREFRAME, DISPLAY_MODES.SOLID_WIREFRAME];
    const currentIndex = modes.indexOf(renderer.displayMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setDisplayMode(modes[nextIndex]);
    return;
  }

  if (key === "s") {
    event.preventDefault();
    if (currentTool === TOOLS.SCALE) {
      setTool(TOOLS.NONE);
    } else {
      setTool(TOOLS.SCALE);
    }
    return;
  }

  if (key === "r") {
    event.preventDefault();
    if (currentTool === TOOLS.ROTATION) {
      setTool(TOOLS.NONE);
    } else {
      setTool(TOOLS.ROTATION);
    }
    return;
  }

  if (key === "t") {
    event.preventDefault();
    if (currentTool === TOOLS.TRANSLATION) {
      setTool(TOOLS.NONE);
    } else {
      setTool(TOOLS.TRANSLATION);
    }
    return;
  }

  if (key === "escape") {
    event.preventDefault();
    resetTransforms();
    return;
  }

  if (currentTool === TOOLS.SCALE) {
    if (key === "arrowup" || key === "=") {
      event.preventDefault();
      applyScale(SCALE_INCREMENT);
      return;
    }
    if (key === "arrowdown" || key === "-") {
      event.preventDefault();
      applyScale(-SCALE_INCREMENT);
      return;
    }
  }

  if (currentTool === TOOLS.ROTATION) {
    if (key === "x") {
      event.preventDefault();
      applyRotationX(ROTATION_INCREMENT);
      return;
    }
    if (key === "y") {
      event.preventDefault();
      applyRotationY(ROTATION_INCREMENT);
      return;
    }
    if (key === "z") {
      event.preventDefault();
      applyRotationZ(ROTATION_INCREMENT);
      return;
    }
  }

  if (currentTool === TOOLS.TRANSLATION) {
    if (key === "arrowleft") {
      event.preventDefault();
      applyTranslation(-TRANSLATION_INCREMENT, 0, 0);
      return;
    }
    if (key === "arrowright") {
      event.preventDefault();
      applyTranslation(TRANSLATION_INCREMENT, 0, 0);
      return;
    }
    if (key === "arrowup") {
      event.preventDefault();
      applyTranslation(0, TRANSLATION_INCREMENT, 0);
      return;
    }
    if (key === "arrowdown") {
      event.preventDefault();
      applyTranslation(0, -TRANSLATION_INCREMENT, 0);
      return;
    }
    if (key === "q") {
      event.preventDefault();
      applyTranslation(0, 0, TRANSLATION_INCREMENT);
      return;
    }
    if (key === "e") {
      event.preventDefault();
      applyTranslation(0, 0, -TRANSLATION_INCREMENT);
      return;
    }
  }
}

function updateRendererStatus() {
  displayModeValue.textContent = formatDisplayMode(renderer.displayMode);
  projectionValue.textContent = formatProjection(renderer.projection);
  projectionButton.textContent =
    renderer.projection === PROJECTIONS.ISOMETRIC
      ? "Perspectiva"
      : "Isometrica";

  toolValue.textContent = formatTool(currentTool);

  updateTransformInfo();

  displayModeButtons.forEach((button) => {
    const isActive = button.dataset.displayMode === renderer.displayMode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function formatTool(tool) {
  const labels = {
    [TOOLS.NONE]: "Nenhuma",
    [TOOLS.SCALE]: "Escala",
    [TOOLS.ROTATION]: "Rotacao",
    [TOOLS.TRANSLATION]: "Translacao",
  };
  return labels[tool] ?? tool;
}

function updateTransformInfo() {
  transformInfo.textContent = `Escala: ${currentScale.toFixed(2)} Rot: (${formatNumber(currentRotationX)}, ${formatNumber(currentRotationY)}, ${formatNumber(currentRotationZ)}) Trans: (${formatNumber(currentTranslationX)}, ${formatNumber(currentTranslationY)}, ${formatNumber(currentTranslationZ)})`;
}

function setTool(tool) {
  currentTool = tool;
  updateRendererStatus();
}

function applyScale(delta) {
  currentScale = Math.max(0.1, currentScale + delta);
  updateModelMatrix();
}

function applyRotationX(delta) {
  currentRotationX += delta;
  updateModelMatrix();
}

function applyRotationY(delta) {
  currentRotationY += delta;
  updateModelMatrix();
}

function applyRotationZ(delta) {
  currentRotationZ += delta;
  updateModelMatrix();
}

function applyTranslation(x, y, z) {
  currentTranslationX += x;
  currentTranslationY += y;
  currentTranslationZ += z;
  updateModelMatrix();
}

function updateModelMatrix() {
  const translation = createTranslationMatrix(
    currentTranslationX,
    currentTranslationY,
    currentTranslationZ,
  );
  const rotationX = createRotationXMatrix(currentRotationX);
  const rotationY = createRotationYMatrix(currentRotationY);
  const rotationZ = createRotationZMatrix(currentRotationZ);
  const scale = createScaleMatrix(currentScale);

  let modelMatrix = createIdentityMatrix();
  modelMatrix = multiplyMatrices(modelMatrix, translation);
  modelMatrix = multiplyMatrices(modelMatrix, rotationX);
  modelMatrix = multiplyMatrices(modelMatrix, rotationY);
  modelMatrix = multiplyMatrices(modelMatrix, rotationZ);
  modelMatrix = multiplyMatrices(modelMatrix, scale);

  renderer.setModelMatrix(modelMatrix);
  updateTransformInfo();
  redraw();
}

function resetTransforms() {
  currentScale = 1;
  currentRotationX = 0;
  currentRotationY = 0;
  currentRotationZ = 0;
  currentTranslationX = 0;
  currentTranslationY = 0;
  currentTranslationZ = 0;
  currentTool = TOOLS.NONE;
  updateModelMatrix();
  updateRendererStatus();
}

function handleMouseDown(event) {
  if (currentTool === TOOLS.ROTATION) {
    isMouseDragging = true;
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
  }
}

function handleMouseMove(event) {
  if (!isMouseDragging || currentTool !== TOOLS.ROTATION) {
    return;
  }

  const deltaX = event.clientX - lastMouseX;
  const deltaY = event.clientY - lastMouseY;

  applyRotationY(deltaX * 0.01);
  applyRotationX(deltaY * 0.01);

  lastMouseX = event.clientX;
  lastMouseY = event.clientY;
}

function handleMouseUp() {
  isMouseDragging = false;
}

function redraw() {
  if (pendingRedraw !== null) {
    cancelAnimationFrame(pendingRedraw);
  }

  pendingRedraw = requestAnimationFrame(() => {
    pendingRedraw = null;
    renderer.render(currentMesh);
  });
}

function formatDisplayMode(displayMode) {
  const labels = {
    [DISPLAY_MODES.SOLID]: "Solido",
    [DISPLAY_MODES.WIREFRAME]: "Wireframe",
    [DISPLAY_MODES.SOLID_WIREFRAME]: "Solido + wireframe",
  };

  return labels[displayMode] ?? displayMode;
}

function formatProjection(projection) {
  const labels = {
    [PROJECTIONS.ISOMETRIC]: "Isometrica",
    [PROJECTIONS.PERSPECTIVE]: "Perspectiva",
  };

  return labels[projection] ?? projection;
}
