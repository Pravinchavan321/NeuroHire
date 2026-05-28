from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel
from app.agents.neurohire_agent import agent
import asyncpg, os
from pymongo import MongoClient
import traceback
from datetime import datetime

router = APIRouter()
db = MongoClient(os.getenv('MONGO_URI','mongodb://mongo:27017/neurohire'))['neurohire']

class AnalyzeReq(BaseModel):
    application_id: str
    candidate_id: str
    job_id: str
    resume_path: str
    company_id: str

async def run_analysis(req: AnalyzeReq):
    conn = await asyncpg.connect(host=os.getenv('PG_HOST'), user=os.getenv('PG_USER'), password=os.getenv('PG_PASSWORD'), database=os.getenv('PG_DB'))
    job = await conn.fetchrow('SELECT title,description,required_skills,experience_min FROM jobs WHERE id=$1', req.job_id)
    if not job:
        await conn.execute('UPDATE applications SET ai_status=$1, ai_summary=$2 WHERE id=$3', 'failed', 'Job not found for analysis', req.application_id)
        await conn.close()
        return
    
    try:
        result = await agent.ainvoke({
            'resume_path': req.resume_path, 'job_title': job['title'], 'job_description': job['description'],
            'jd_skills': list(job['required_skills'] or []), 'exp_required': job['experience_min'] or 0,
            'resume_data': {}, 'scores': {}, 'skill_overlap': {}, 'llm_summary': '', 'llm_questions': [], 'final_score': 0.0,
            'screening_result': {},
            'company_id': req.company_id, 'pg_conn': conn, 'bias_flag': False, 'bias_reason': '',
            'application_id': req.application_id, 'job_id': req.job_id, 'candidate_id': req.candidate_id
        })

        # Explicitly delete old analysis to ensure idempotency
        db.analyses.delete_one({'application_id': req.application_id})

        # Calculate Score Breakdown (L3-003)
        breakdown = {
            'tfidf_score':          float(result['scores']['skill']),
            'exp_score':            float(result['scores']['experience']),
            'overlap_pct':          float(result['skill_overlap']['overlap_pct']),
            'tfidf_weight':         0.4,
            'exp_weight':           0.3,
            'overlap_weight':       0.3,
            'tfidf_contribution':   float(result['scores']['skill'] * 0.4),
            'exp_contribution':     float(result['scores']['experience'] * 0.3),
            'overlap_contribution': float(result['skill_overlap']['overlap_pct'] * 0.3)
        }

        screening_result = result.get('screening_result', {})
        screened_at = datetime.utcnow()
        screening_result['screened_at'] = screened_at.isoformat()

        db.analyses.insert_one({
            'application_id': req.application_id, 'job_id': req.job_id, 'candidate_id': req.candidate_id,
            'scores': result['scores'], 'skill_overlap': result['skill_overlap'], 'llm_summary': result['llm_summary'],
            'llm_questions': result['llm_questions'], 'bias_flag': result['bias_flag'], 'bias_reason': result['bias_reason'],
            'score_breakdown': breakdown, 'strengths': screening_result.get('strengths', []),
            'skill_gaps': screening_result.get('missing_skills', result['skill_overlap'].get('missing', [])),
            'risk_level': screening_result.get('risk_level'), 'recommendation': screening_result.get('recommendation'),
            'screening_result': screening_result, 'created_at': screened_at
        })

        await conn.execute(
            'UPDATE applications SET ai_score=$1, ai_summary=$2, ai_status=$3, bias_flag=$4, bias_reason=$5 WHERE id=$6', 
            result['final_score'], result['llm_summary'], 'complete', result['bias_flag'], result['bias_reason'], req.application_id
        )
    except Exception as e:
        print(f"Analysis failed: {e}")
        traceback.print_exc()
        await conn.execute('UPDATE applications SET ai_status=$1, ai_summary=$2 WHERE id=$3', 'failed', str(e)[:500], req.application_id)
    finally:
        await conn.close()

@router.post('/analyze')
async def analyze(req: AnalyzeReq, bg: BackgroundTasks):
    bg.add_task(run_analysis, req)
    return {'status': 'processing'}
