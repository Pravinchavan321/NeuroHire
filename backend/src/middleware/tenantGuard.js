module.exports = function tenantGuard(req, res, next) {
  // Ensure req.user exists (set by auth middleware)
  if (!req.user || !req.user.company_id) {
    return res.status(403).json({ 
      success: false, 
      error: "Company context missing" 
    });
  }

  // Attach companyId to request object for easy access in routes
  req.companyId = req.user.company_id;
  next();
};
