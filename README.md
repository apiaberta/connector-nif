# connector-nif

Conector de NIF da API Aberta.

## Endpoints

- `GET /nif/validate/:nif`: valida um NIF português (MOD 11) e devolve o tipo.
- `GET /nif/:nif`: nome, morada e estado do IVA da entidade, obtidos no [VIES](https://ec.europa.eu/taxation_customs/vies/). Guarda o resultado em MongoDB durante 30 dias; `?refresh=true` força nova consulta. Se o VIES falhar e houver cache, devolve-a com `stale: true`; sem cache, responde 503. NIF inválido dá 400.
- `GET /nif/meta`, `GET /meta`, `GET /health`, `GET /docs`.

## Configuração

Copiar `.env.example` para `.env`:

- `PORT` (por omissão 3013)
- `MONGODB_URI` (por omissão `mongodb://localhost:27017/apiaberta-nif`)
- `CACHE_TTL_DAYS` (por omissão 30)

```
npm install
npm start
```

## Limitações

- O VIES só devolve nome e morada para NIFs com IVA ativo.
- TODO: as publicações de atos societários (publicacoes.mj.pt) têm pesquisa por NIF, mas estão protegidas por reCAPTCHA/NoBot, por isso não são recolhidas.
