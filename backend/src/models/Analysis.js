const mongoose = require('mongoose');
const AnalysisSchema = new mongoose.Schema({
  application_id: { type: String, required: true, unique: true },
  job_id:         String,
  candidate_id:   String,
  scores: {
    skill_match:      Number,
    experience_match: Number,
    overall:          Number,
  },
  skill_gaps:    [String],
  strengths:     [String],
  llm_summary:   String,
  llm_questions: [String],
  created_at: { type: Date, default: Date.now },
});
module.exports = mongoose.model('Analysis', AnalysisSchema);
