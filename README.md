# Visualizador 3D de Poligonos

Etapa atual: renderizacao da malha renderizavel a partir de arquivos `.obj` e
`.mtl` ja parseados.

## Como rodar

Com PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File tools/server.ps1
```

Ou, se tiver Node.js instalado:

```bash
npm start
```

Abra `http://localhost:5173` no navegador.

## Como testar

```bash
npm test
```

Na tela inicial, carregue um arquivo `.obj` e, se houver, um ou mais arquivos
`.mtl`. A tela mostra:

- quantidade de vertices `V`
- quantidade de faces `F`
- quantidade aproximada de arestas `E`
- resultado da Formula de Euler `V - E + F`
- quantidade de triangulos gerados para a malha renderizavel
- modelo renderizado em canvas
- modo atual de exibicao
- projecao atual

Tambem existe o botao `Carregar exemplo`, que usa `samples/cube.obj` e
`samples/cube.mtl`.

## Renderizacao

A etapa 3 desenha a `Mesh` montada na etapa anterior em um canvas 2D. A
projecao inicial e isometrica; a tecla `P` alterna para perspectiva e volta para
isometrica. A tecla `W` ativa wireframe e a tecla `S` volta ao modo solido.

No modo solido, cada face usa a cor `Kd` do material MTL quando disponivel. O
renderizador aplica backface culling pela componente `Z` da normal em espaco de
camera e calcula iluminacao simples por face com uma luz direcional fixa.

## Montagem da malha

A etapa 2 usa o `OBJModel` produzido pelo parser e converte cada face em uma
lista de triangulos renderizaveis. Faces com quatro ou mais vertices sao
trianguladas por fan triangulation, mantendo o material indicado por `usemtl`.

Durante a conversao, o objeto e centralizado pela bounding box e escalado para
caber em um espaco normalizado de tamanho maximo `2`, equivalente ao intervalo
aproximado `[-1, 1]` no maior eixo. Quando o `.obj` nao traz normais em uma
face, a normal e calculada pelo produto vetorial `(V1 - V0) x (V2 - V0)` e
normalizada.
