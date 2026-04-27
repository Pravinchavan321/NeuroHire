from fastapi import FastAPI
from app.routers import analyze, rank

app = FastAPI(title='NeuroHire AI Service')
app.include_router(analyze.router)
app.include_router(rank.router)

@app.get('/health')
def health(): return {'status': 'ok'}
