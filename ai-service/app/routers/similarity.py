from fastapi import APIRouter, HTTPException
from app.agents.neurohire_agent import vectorstore

router = APIRouter()

@router.get('/similarity/{application_id}')
async def get_similar_candidates(application_id: str, top_k: int = 5):
    """
    Finds candidates similar to the given application_id using vector embeddings.
    Filters results to the same company_id.
    """
    try:
        # Access the underlying Chroma collection
        # LangChain's wrapper is limited for direct ID-to-ID similarity
        client = vectorstore._client
        collection = client.get_collection("candidate_embeddings")
        
        # 1. Fetch source document metadata and embedding
        source = collection.get(
            ids=[application_id], 
            include=['embeddings', 'metadatas']
        )
        
        if not source['ids']:
            raise HTTPException(status_code=404, detail="Application not found in vector store")
            
        source_embedding = source['embeddings'][0]
        company_id = source['metadatas'][0]['company_id']
        
        # 2. Query for similar candidates within the same company
        results = collection.query(
            query_embeddings=[source_embedding],
            n_results=top_k + 5, # Fetch extra to account for filtering/self
            where={"company_id": company_id}
        )
        
        # 3. Format and filter (exclude self)
        formatted = []
        for i in range(len(results['ids'][0])):
            id_ = results['ids'][0][i]
            if id_ == application_id:
                continue
                
            formatted.append({
                "application_id": id_,
                "candidate_id":   results['metadatas'][0][i]['candidate_id'],
                "distance":       float(results['distances'][0][i])
            })
            
        return formatted[:top_k]
        
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Similarity Search Error: {e}")
        raise HTTPException(status_code=500, detail="Internal AI Service Error")
