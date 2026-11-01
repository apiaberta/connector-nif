const VIES_URL = 'https://ec.europa.eu/taxation_customs/vies/rest-api/ms/PT/vat';

function parseAddress(raw) {
    if (!raw || raw === '---') return null
    const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)
    const last = lines.at(-1) ?? ''
    const m = last.match(/^(\d{4}-\d{3})\s+(.+)$/)
    return {
        raw: lines.join(', '),
        street: lines[0] ?? null,
        postal_code: m ? m[1] : null,
        locality: m ? m[2] : null
    }
}

export async function lookupVies(nif, { timeoutMs = 10000 } = {}) {
    const res = await fetch(`${VIES_URL}/${nif}`, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(timeoutMs)
    })
    if (!res.ok) throw new Error(`VIES HTTP ${res.status}`)
    const data = await res.json()
    if (data.userError && !['VALID', 'INVALID'].includes(data.userError)) {
        throw new Error(`VIES error: ${data.userError}`)
    }
    return {
        vat_active: Boolean(data.isValid),
        name: data.name && data.name !== '---' ? data.name : null,
        address: parseAddress(data.address),
        checked_at: data.requestDate ? new Date(data.requestDate) : new Date()
    }
}
