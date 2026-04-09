# API Aberta — NIF Validator Connector

Portuguese NIF (Tax Identification Number) validator using the MOD 11 algorithm.

## Algorithm

The NIF validator implements the MOD 11 algorithm used by Portuguese tax authorities:

1. Multiply each digit by a weight (2-9, from right to left)
2. Sum all products
3. Calculate modulo 11
4. Compare checksum digit

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service health check |
| GET | `/meta` | Service metadata |
| GET | `/nif/validate/:nif` | Validate a Portuguese NIF |

## NIF Types

| Prefix | Type |
|--------|------|
| 1 | Pessoa singular (residente) |
| 2 | Pessoa singular (não residente) |
| 3 | Entidade pública |
| 5 | Pessoa coletiva (empresa) |
| 6 | Entidade singular não residente |
| 7/8/9 | Caso especial / Forças armadas |

## Quick Start

```bash
npm install
npm start
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3013` | Server port |
| `NODE_ENV` | `production` | Environment |

## Example

```bash
curl https://api.apiaberta.pt/v1/nif/validate/509442013
# {"nif":"509442013","valid":true,"type":"Pessoa coletiva (empresa)"}
```

## License

MIT
