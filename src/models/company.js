import mongoose from 'mongoose'

const companySchema = new mongoose.Schema({
    nif:        { type: String, required: true, unique: true },
    type:       String,
    vat_active: Boolean,
    name:       { type: String, default: null },
    address: {
        raw:         String,
        street:      String,
        postal_code: String,
        locality:    String
    },
    sources:    [String],
    checked_at: Date,
    first_seen: { type: Date, default: Date.now },
    synced_at:  { type: Date, default: Date.now }
}, { collection: 'companies' })

companySchema.index({ name: 'text' })

export const Company = mongoose.model('Company', companySchema)
