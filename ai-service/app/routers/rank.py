from fastapi import APIRouter
from app.pipeline.scorer import rank_candidates
import asyncpg, os
from pymongo import MongoClient

router = APIRouter()
db = MongoClient(os.getenv('MONGO_URI','mongodb://mongo:27017/neurohire'))['neurohire']

@router.get('/rank/{job_id}')
async def rank(job_id: str):
    conn = await asyncpg.connect(host=os.getenv('PG_HOST'), user=os.getenv('PG_USER'), password=os.getenv('PG_PASSWORD'), database=os.getenv('PG_DB'))
    rows = await conn.fetch('SELECT a.id as app_id, a.ai_score, a.status, c.name, c.email FROM applications a JOIN candidates c ON a.candidate_id=c.id WHERE a.job_id=$1', job_id)
    await conn.close()

    candidates = [{'application_id': r['app_id'], 'name': r['name'], 'email': r['email'], 'overall_score': r['ai_score'], 'status': r['status'], 'analysis': db.analyses.find_one({'application_id': r['app_id']}, {'_id': 0})} for r in rows]
    
    return rank_candidates(candidates).to_dict(orient='records') if candidates else []
