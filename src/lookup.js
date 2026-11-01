import { Company } from './models/company.js';
import { lookupVies } from './vies.js';

const TTL_MS = parseInt(process.env.CACHE_TTL_DAYS || '30', 10) * 86400000;

function present(doc, cached, stale = false) {
    return {
        nif: doc.nif,
        type: doc.type,
        name: doc.name,
        vat_active: doc.vat_active,
        address: doc.address?.raw ? doc.address : null,
        sources: doc.sources,
        checked_at: doc.checked_at,
        cached,
        stale
    };
}

export async function lookupCompany(nif, type, { refresh = false, log } = {}) {
    const cached = await Company.findOne({ nif }).lean();
    const fresh = cached && Date.now() - new Date(cached.synced_at).getTime() < TTL_MS;
    if (fresh && !refresh) return { status: 200, body: present(cached, true) };

    let vies;
    try {
        vies = await lookupVies(nif);
    } catch (err) {
        log?.warn?.({ err, nif }, 'VIES lookup failed');
        if (cached) return { status: 200, body: present(cached, true, true) };
        return { status: 503, body: { nif, error: 'upstream_unavailable', message: 'VIES indisponível, tente mais tarde' } };
    }

    const doc = await Company.findOneAndUpdate(
        { nif },
        {
            $set: {
                type,
                vat_active: vies.vat_active,
                name: vies.name ?? cached?.name ?? null,
                address: vies.address ?? cached?.address ?? null,
                checked_at: vies.checked_at,
                synced_at: new Date()
            },
            $addToSet: { sources: 'vies' }
        },
        { upsert: true, new: true, lean: true }
    );
    return { status: 200, body: present(doc, false) };
}
