from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel
from app.agents.neurohire_agent import agent
import asyncpg, os
from pymongo import MongoClient

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
    
    result = agent.invoke({
        'resume_path': req.resume_path, 'job_title': job['title'], 'job_description': job['description'],
        'jd_skills': list(job['required_skills'] or []), 'exp_required': job['experience_min'] or 0,
        'resume_data': {}, 'scores': {}, 'skill_overlap': {}, 'llm_summary': '', 'llm_questions': [], 'final_score': 0.0
    })

    db.analyses.replace_one({'application_id': req.application_id}, {
        'application_id': req.application_id, 'job_id': req.job_id, 'candidate_id': req.candidate_id,
        'scores': result['scores'], 'skill_overlap': result['skill_overlap'], 'llm_summary': result['llm_summary'],
        'llm_questions': result['llm_questions']
    }, upsert=True)

    await conn.execute('UPDATE applications SET ai_score=$1, ai_summary=$2 WHERE id=$3', result['final_score'], result['llm_summary'], req.application_id)
    await conn.close()

@router.post('/analyze')
async def analyze(req: AnalyzeReq, bg: BackgroundTasks):
    bg.add_task(run_analysis, req)
    return {'status': 'processing'}
