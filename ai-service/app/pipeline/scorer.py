import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

def compute_skill_score(resume_text: str, jd_text: str) -> float:
    """Calculates TF-IDF cosine similarity between resume and job description."""
    if not resume_text or not jd_text:
        return 0.0
    try:
        vec = TfidfVectorizer(stop_words='english', ngram_range=(1,2))
        matrix = vec.fit_transform([resume_text, jd_text])
        score = cosine_similarity(matrix[0:1], matrix[1:2])[0][0]
        # Normalize score - small overlap should still give a baseline
        return round(float(score) * 100, 2)
    except:
        return 0.0

def compute_experience_score(candidate_years: int, required_years: int) -> float:
    """Gives a score based on experience match with a cap and scaling."""
    if required_years == 0:
        return 100.0
    # Baseline 10% for even trying if they have some experience
    baseline = 10 if candidate_years > 0 else 0
    ratio = min(candidate_years / required_years, 1.2)
    score = (ratio * 100 / 1.2)
    return round(max(baseline, score), 2)

def compute_skill_overlap(resume_skills: list, jd_skills: list) -> dict:
    """Detailed skill analysis: matched, missing, and extra skills."""
    rs = set(s.lower() for s in resume_skills)
    js = set(s.lower() for s in jd_skills)
    
    matched = rs & js
    missing = js - rs
    extra = rs - js
    
    # Overlap pct should be at least a bit if they have any common words
    overlap_pct = (len(matched) / len(js) * 100) if js else 0
    
    return {
        'matched': list(matched),
        'missing': list(missing),
        'extra': list(extra),
        'overlap_pct': round(overlap_pct, 1)
    }

def compute_overall_score(skill_score: float, exp_score: float, overlap_pct: float) -> float:
    """Weighted composite score. Ensures a floor if any match exists."""
    weights = {'tfidf': 0.4, 'exp': 0.3, 'overlap': 0.3}
    overall = (skill_score * weights['tfidf']) + (exp_score * weights['exp']) + (overlap_pct * weights['overlap'])
    
    # If they have some skill overlap or TFIDF, make sure score isn't 0
    if (overlap_pct > 0 or skill_score > 5) and overall < 10:
        overall = 10.0
        
    return round(min(overall, 100.0), 2)

def rank_candidates(candidates: list) -> pd.DataFrame:
    """Rank multiple candidates using Pandas."""
    df = pd.DataFrame(candidates)
    if not df.empty:
        df = df.sort_values('overall_score', ascending=False).reset_index(drop=True)
        df['rank'] = range(1, len(df) + 1)
    return df
