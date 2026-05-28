from fastapi import FastAPI, HTTPException
from app.routers import analyze, rank, similarity, parser, interview_questions
from app.agents.neurohire_agent import chroma_client

app = FastAPI(title='NeuroHire AI Service')
app.include_router(analyze.router)
app.include_router(rank.router)
app.include_router(similarity.router)
app.include_router(parser.router)
app.include_router(interview_questions.router)

@app.get('/health')
def health(): return {'status': 'ok'}

@app.delete("/embeddings/{candidate_id}")
async def delete_candidate_embeddings(candidate_id: str):
    """Delete all ChromaDB embeddings for a candidate (GDPR right to erasure)."""
    try:
        collection_names = ["candidate_embeddings", "resumes", "candidates", "neurohire_resumes"]
        deleted_from = []
        for col_name in collection_names:
            try:
                collection = chroma_client.get_collection(name=col_name)
                collection.delete(where={"candidate_id": candidate_id})
                deleted_from.append(col_name)
            except Exception:
                pass
        return {"success": True, "deleted_from": deleted_from, "candidate_id": candidate_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Embedding delete failed: {str(e)}")
