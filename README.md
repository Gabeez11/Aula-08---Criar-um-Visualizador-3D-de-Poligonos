# Visualizador 3D de Poligonos

Etapa atual: parser de arquivos `.obj` e `.mtl`.

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

## Como testar o parser

```bash
npm test
```

Na tela inicial, carregue um arquivo `.obj` e, se houver, um ou mais arquivos
`.mtl`. A tela mostra:

- quantidade de vertices `V`
- quantidade de faces `F`
- quantidade aproximada de arestas `E`
- resultado da Formula de Euler `V - E + F`

Tambem existe o botao `Carregar exemplo`, que usa `samples/cube.obj` e
`samples/cube.mtl`.
