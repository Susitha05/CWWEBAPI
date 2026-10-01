const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['national', 'provincial', 'district'], required: true },
  // jurisdiction narrows read scope: national users have neither field set,
  // provincial users have province set, district users have district set.
  jurisdiction: {
    province: { type: Number, ref: 'Province', default: null },
    district: { type: Number, ref: 'District', default: null }
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
