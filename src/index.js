import 'dotenv/config';
import Fastify from 'fastify';

const PORT = parseInt(process.env.PORT || '3013', 10);

// Type definitions based on first digit
const NIF_TYPES = {
  '1': { description: 'Pessoa singular (residente)', category: 'individual' },
  '2': { description: 'Pessoa singular (não residente)', category: 'individual' },
  '5': { description: 'Pessoa coletiva (empresa)', category: 'company' },
  '3': { description: 'Entidade pública', category: 'public_entity' },
  '6': { description: 'Entidade singular não residente', category: 'individual' },
  '7': { description: 'Forças armadas / colonela', category: 'special' },
  '8': { description: 'Caso especial', category: 'special' },
  '9': { description: 'Caso especial', category: 'special' },
};

function getNIFType(nif) {
  const firstDigit = nif[0];
  const type = NIF_TYPES[firstDigit];
  if (!type) {
    return { code: firstDigit, description: 'Desconhecido', category: 'unknown' };
  }
  return { code: firstDigit, description: type.description, category: type.category };
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

  return { valid: true, type: getNIFType(nif) };
}

const fastify = Fastify({ logger: false });

fastify.get('/nif/validate/:nif', async (request, reply) => {
  const { nif } = request.params;

  if (!nif || !/^\d+$/.test(nif)) {
    return reply.send({
      nif: nif || '',
      valid: false,
      reason: 'invalid_format'
    });
  }

  const result = validateNIF(nif);

  const response = { nif };
  if (result.valid) {
    response.valid = true;
    response.type = result.type;
  } else {
    response.valid = false;
    response.reason = result.reason;
  }

  return reply.send(response);
});

fastify.get('/health', async () => ({ status: 'ok' }));

const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`API Aberta NIF connector running on port ${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
