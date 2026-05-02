export function calculateTopology(model) {
  const edgeKeys = new Set();

  model.faces.forEach((face) => {
    const vertices = face.vertices;

    vertices.forEach((faceVertex, index) => {
      const nextFaceVertex = vertices[(index + 1) % vertices.length];
      edgeKeys.add(createEdgeKey(faceVertex.vertexIndex, nextFaceVertex.vertexIndex));
    });
  });

  const vertexCount = model.vertices.length;
  const edgeCount = edgeKeys.size;
  const faceCount = model.faces.length;
  const eulerCharacteristic = vertexCount - edgeCount + faceCount;

  return {
    vertexCount,
    edgeCount,
    faceCount,
    eulerCharacteristic,
    isEulerCharacteristicTwo: eulerCharacteristic === 2,
  };
}

function createEdgeKey(firstIndex, secondIndex) {
  const low = Math.min(firstIndex, secondIndex);
  const high = Math.max(firstIndex, secondIndex);
  return `${low}:${high}`;
}
