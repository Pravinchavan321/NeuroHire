def check_bias(score, company_avg, threshold=20):
    """
    Checks if a candidate's AI score shows potential bias or outliers
    relative to the company's historical average.
    """
    bias_flag = False
    reasons = []
    
    deviation = abs(score - company_avg)
    
    # Rule 1: High deviation from company average
    if deviation > threshold:
        bias_flag = True
        reasons.append("Score deviates significantly from company average")
    
    # Rule 2: Unusually low score in high-performing company
    if score < 40 and company_avg > 70:
        # bias_flag already True due to deviation (70-40=30 > 20)
        reasons.append("Score unusually low relative to company average")
        
    # Rule 3: Suspiciously perfect scores
    if score > 95:
        bias_flag = True
        reasons.append("Suspiciously perfect score — verify manually")
        
    return {
        "bias_flag": bias_flag,
        "bias_reason": ". ".join(reasons) if reasons else None
    }
