const requirements = [
  { name: 'DATABASE_URL', aliases: ['PG_HOST', 'PG_USER', 'PG_PASSWORD', 'PG_DB'], requireAllAliases: true },
  { name: 'MONGODB_URI', aliases: ['MONGO_URI'] },
  { name: 'GEMINI_API_KEY', aliases: ['GOOGLE_API_KEY'] },
  { name: 'JWT_SECRET' },
  { name: 'EMAIL_HOST' },
  { name: 'EMAIL_USER' },
  { name: 'EMAIL_PASS' },
  { name: 'AI_SERVICE_URL' },
  { name: 'PORT' }
];

function hasEnv(requirement) {
  if (process.env[requirement.name]) return true;
  if (!requirement.aliases) return false;
  if (requirement.requireAllAliases) return requirement.aliases.every((alias) => process.env[alias]);
  return requirement.aliases.some((alias) => process.env[alias]);
}

function validateEnv() {
  const missing = requirements.filter((requirement) => !hasEnv(requirement));
  if (missing.length > 0) {
    console.warn(`WARNING: Missing required environment variables: ${missing.map((item) => item.name).join(', ')}`);
  }
}

module.exports = validateEnv;
