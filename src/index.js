import 'dotenv/config';
import Fastify from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import mongoose from 'mongoose';
import { lookupCompany } from './lookup.js';

const PORT = parseInt(process.env.PORT || '3013', 10);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/apiaberta-nif';

// Flat string types — no nested objects
const NIF_TYPES = {
  '1': 'Pessoa singular (residente)',
  '2': 'Pessoa singular (não residente)',
  '5': 'Pessoa coletiva (empresa)',
  '3': 'Entidade pública',
  '6': 'Entidade singular não residente',
  '7': 'Forças armadas / colonela',
  '8': 'Caso especial',
  '9': 'Caso especial',
};

function getNIFType(nif) {
  return NIF_TYPES[nif[0]] || 'Desconhecido';
}

function validateNIF(nif) {
  // Must be exactly 9 digits
  if (!/^\d{9}$/.test(nif)) {
    return { valid: false, reason: 'invalid_format' };
  }

  const digits = nif.split('').map(Number);
  const checkDigit = digits[8];
  const weights = [9, 8, 7, 6, 5, 4, 3, 2];

  let sum = 0;
  for (let i = 0; i < 8; i++) {
    sum += digits[i] * weights[i];
  }

  const module = sum % 11;
  let expectedCheckDigit;

  if (module < 2) {
    expectedCheckDigit = 0;
  } else {
    expectedCheckDigit = 11 - module;
  }

  if (checkDigit !== expectedCheckDigit) {
    return { valid: false, reason: 'checksum_invalid' };
  }

  return { valid: true };
}

const fastify = Fastify({ logger: false });

// ── Swagger / OpenAPI ───────────────────────────────────────────────────────
await fastify.register(swagger, {
  openapi: {
    info: {
      title: 'API Aberta - NIF Connector',
      description: 'Validação de NIF português com algoritmo MOD 11',
      version: '1.0.0',
    },
    servers: [{ url: `http://localhost:${PORT}` }],
    tags: [{ name: 'NIF', description: 'Validação de NIF português' }],
  },
});

await fastify.register(swaggerUi, {
  routePrefix: '/docs',
  uiConfig: { docExpansion: 'list' },
});

fastify.get('/swagger', async () => fastify.swagger());

// ── Routes ─────────────────────────────────────────────────────────────────
fastify.get('/nif/validate/:nif', {
  schema: {
    description: 'Valida um NIF português usando o algoritmo MOD 11',
    tags: ['NIF'],
    params: {
      type: 'object',
      properties: {
        nif: { type: 'string', description: 'Número de Identificação Fiscal (9 dígitos)' }
      },
      required: ['nif']
    },
    response: {
      200: {
        type: 'object',
        properties: {
          nif: { type: 'string' },
          valid: { type: 'boolean' },
          type: { type: 'string' },
          reason: { type: 'string' }
        }
      }
    }
  }
}, async (request, reply) => {
  const { nif } = request.params;

  if (!nif || !/^\d+$/.test(nif)) {
    return reply.send({ nif: nif || '', valid: false, reason: 'invalid_format' });
  }

  const result = validateNIF(nif);

  if (result.valid) {
    return reply.send({ nif, valid: true, type: getNIFType(nif) });
  } else {
    return reply.send({ nif, valid: false, reason: result.reason });
  }
});

fastify.get('/nif/:nif', {
  schema: {
    description: 'Informação de uma empresa por NIF (VIES, cache de 30 dias)',
    tags: ['NIF'],
    params: {
      type: 'object',
      properties: {
        nif: { type: 'string', description: 'NIF (9 dígitos, aceita prefixo PT)' }
      },
      required: ['nif']
    },
    querystring: {
      type: 'object',
      properties: { refresh: { type: 'boolean' } }
    }
  }
}, async (request, reply) => {
  const nif = String(request.params.nif).replace(/\s+/g, '').replace(/^PT/i, '');
  const result = validateNIF(nif);
  if (!result.valid) {
    return reply.code(400).send({ nif, valid: false, reason: result.reason });
  }
  const { status, body } = await lookupCompany(nif, getNIFType(nif), {
    refresh: request.query.refresh === true,
    log: fastify.log
  });
  return reply.code(status).send(body);
});

fastify.get('/health', async () => ({ status: 'ok', version: '1.0.0' }));

// ── Meta ──────────────────────────────────────────────────────────────────────
const META_RESPONSE = {
  service: 'connector-nif',
  version: '1.0.0',
  description: 'Portuguese NIF validator (MOD 11) and company lookup by NIF',
  source: 'Internal validation; company data from EU VIES (https://ec.europa.eu/taxation_customs/vies/)',
  update_freq: 'on demand, cached 30 days',
  endpoints: [
    { path: '/v1/nif/validate/:nif', description: 'Validate a Portuguese NIF' },
    { path: '/v1/nif/:nif', description: 'Company name and address by NIF (?refresh=true bypasses cache)' },
    { path: '/v1/nif/meta', description: 'Service metadata' }
  ]
};

fastify.get('/meta', async () => META_RESPONSE);
fastify.get('/nif/meta', async () => META_RESPONSE);

// ── Start ───────────────────────────────────────────────────────────────────
const start = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`API Aberta NIF connector running on port ${PORT}`);
    console.log(`Swagger docs available at http://localhost:${PORT}/docs`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
