const mongoose = require('mongoose');
const ResumeSchema = new mongoose.Schema({
  candidate_id: { type: String, required: true, index: true },
  raw_text:     { type: String },
  parsed: {
    skills:      [String],
    experience:  [{ company: String, title: String, years: Number }],
    education:   [{ degree: String, institution: String, year: Number }],
    total_years: Number,
  },
  created_at: { type: Date, default: Date.now },
});
module.exports = mongoose.model('Resume', ResumeSchema);
