import json
import os
from typing import TypedDict, List, Any
import chromadb
from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_chroma import Chroma
from langchain_core.prompts import ChatPromptTemplate
from app.pipeline.resume_parser import parse_resume
from app.pipeline.bias_checker import check_bias
from app.pipeline.scorer import (
    compute_skill_score, 
    compute_experience_score, 
    compute_skill_overlap, 
    compute_overall_score
)

# Initialize Gemini components
llm = ChatGoogleGenerativeAI(model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"), temperature=0.2)
embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001")
CHROMA_HOST = os.getenv("CHROMA_HOST", "chromadb")
CHROMA_PORT = int(os.getenv("CHROMA_PORT", "8000"))
chroma_client = chromadb.HttpClient(host=CHROMA_HOST, port=CHROMA_PORT)
vectorstore = Chroma(
    collection_name="candidate_embeddings",
    embedding_function=embeddings,
    client=chroma_client
)

class HireState(TypedDict):
    resume_path: str
    job_title: str
    job_description: str
    jd_skills: List[str]
    exp_required: int
    resume_data: dict
    scores: dict
    skill_overlap: dict
    llm_summary: str
    llm_questions: List[str]
    screening_result: dict
    final_score: float
    company_id: str
    pg_conn: Any
    bias_flag: bool
    bias_reason: str
    application_id: str
    job_id: str
    candidate_id: str

async def parse_node(state: HireState) -> HireState:
    """Parses resume text and extracts basic metadata."""
    state['resume_data'] = parse_resume(state['resume_path'])
    
    # L3-004: Generate and store embedding
    vectorstore.add_texts(
        texts=[state['resume_data']['clean_text']],
        ids=[str(state['application_id'])],
        metadatas=[{
            'candidate_id': str(state['candidate_id']),
            'job_id': str(state['job_id']),
            'company_id': str(state['company_id']),
            'ai_score': 0.0
        }]
    )
    return state

async def score_node(state: HireState) -> HireState:
    """Calculates granular match scores using ML metrics."""
    rd = state['resume_data']
    skill_score = compute_skill_score(rd['clean_text'], state['job_description'])
    exp_score = compute_experience_score(rd['total_years'], state['exp_required'])
    overlap = compute_skill_overlap(rd['skills'], state['jd_skills'])
    overall = compute_overall_score(skill_score, exp_score, overlap['overlap_pct'])
    
    state['scores'] = { 'skill': skill_score, 'experience': exp_score, 'overall': overall }
    state['skill_overlap'] = overlap
    state['final_score'] = overall
    return state

def clean_json_response(text: str) -> str:
    """Strips markdown formatting from LLM JSON responses."""
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        if lines[0].startswith("```json"):
            text = "\n".join(lines[1:-1])
        else:
            text = "\n".join(lines[1:-1])
    return text.strip()

def recommendation_from_score(score: float) -> str:
    if score >= 70:
        return "Shortlist"
    if score >= 40:
        return "Review"
    return "Reject"

def risk_from_score(score: float, has_gaps: bool) -> str:
    if score < 40:
        return "High"
    if score < 70 or has_gaps:
        return "Medium"
    return "Low"

async def explain_node(state: HireState) -> HireState:
    """Uses Gemini to provide a narrative summary and technical interview questions."""
    rd = state['resume_data']
    gaps = state['skill_overlap']['missing']
    
    summary_chain = ChatPromptTemplate.from_messages([
        ("system", "You are an expert technical recruiter. Return ONLY a raw JSON object with keys: score, strengths, missing_skills, risk_level, summary, recommendation. score must be a 0-100 integer. strengths and missing_skills must be arrays of strings. risk_level must be Low, Medium, or High. recommendation must be Shortlist, Review, or Reject. summary must be a professional 2-3 sentence paragraph focused on strengths and transparent gaps."),
        ("human", "Role: {job_title}\nMatch Score: {score}/100\nCandidate Skills: {skills}\nGaps: {gaps}\nExperience: {exp} years")
    ]) | llm
    
    questions_chain = ChatPromptTemplate.from_messages([
        ("system", "You are a senior technical recruiter. Generate 5 targeted, role-specific interview questions based on the candidate's specific skills and gaps identified in their resume. For each question, assign a difficulty ('easy', 'medium', or 'hard') and specify the 'targets_skill'. Return ONLY a raw JSON array of 5 objects with keys: 'question', 'difficulty', 'targets_skill'."),
        ("human", "Role: {job_title}\nJob Description: {job_desc}\nMissing Skills: {gaps}\nExisting Skills: {skills}\nResume Content: {resume_text}")
    ]) | llm

    summary_res = await summary_chain.ainvoke({
        'job_title': state['job_title'],
        'score': state['final_score'],
        'skills': ', '.join(rd['skills']) or 'General',
        'gaps': ', '.join(gaps) or 'None identified',
        'exp': rd['total_years']
    })
    try:
        parsed_summary = json.loads(clean_json_response(summary_res.content))
    except Exception:
        parsed_summary = {'summary': summary_res.content}
    if not isinstance(parsed_summary, dict):
        parsed_summary = {'summary': str(parsed_summary)}

    score = int(round(state['final_score']))
    strengths = parsed_summary.get('strengths') if isinstance(parsed_summary.get('strengths'), list) else state['skill_overlap'].get('matched', [])
    missing_skills = parsed_summary.get('missing_skills') if isinstance(parsed_summary.get('missing_skills'), list) else gaps
    risk_level = parsed_summary.get('risk_level') if parsed_summary.get('risk_level') in ["Low", "Medium", "High"] else risk_from_score(score, bool(gaps))
    recommendation = parsed_summary.get('recommendation') if parsed_summary.get('recommendation') in ["Shortlist", "Review", "Reject"] else recommendation_from_score(score)
    summary = parsed_summary.get('summary') or f"This candidate has a {score}% match for the {state['job_title']} role. Review the listed strengths and gaps before making a hiring decision."

    state['screening_result'] = {
        'score': score,
        'strengths': strengths,
        'missing_skills': missing_skills,
        'risk_level': risk_level,
        'summary': summary,
        'recommendation': recommendation
    }
    state['llm_summary'] = summary

    try:
        q_res = await questions_chain.ainvoke({
            'job_title': state['job_title'], 
            'job_desc': state['job_description'],
            'gaps': gaps, 
            'skills': rd['skills'],
            'resume_text': rd['clean_text'][:2000] # Cap to avoid token limits
        })
        cleaned_content = clean_json_response(q_res.content)
        state['llm_questions'] = json.loads(cleaned_content)
    except Exception as e:
        print(f"LLM Question Error: {e}")
        state['llm_questions'] = [] # Store empty array if parsing fails
        
    return state

async def bias_node(state: HireState) -> HireState:
    """Checks for scoring anomalies relative to company averages."""
    conn = state['pg_conn']
    company_id = state['company_id']
    
    # Fetch company-wide average score
    company_avg = await conn.fetchval(
        'SELECT AVG(ai_score) FROM applications a JOIN jobs j ON a.job_id = j.id WHERE j.company_id = $1 AND a.ai_status = \'complete\'',
        company_id
    )
    
    # Default to 70 if no history
    avg_score = float(company_avg) if company_avg is not None else 70.0
    
    bias_result = check_bias(state['final_score'], avg_score)
    state['bias_flag'] = bias_result['bias_flag']
    state['bias_reason'] = bias_result['bias_reason']

    # Update Chroma metadata with final score
    vectorstore.add_texts(
        texts=[state['resume_data']['clean_text']],
        ids=[str(state['application_id'])],
        metadatas=[{
            'candidate_id': str(state['candidate_id']),
            'job_id': str(state['job_id']),
            'company_id': str(state['company_id']),
            'ai_score': state['final_score']
        }]
    )
    return state

# Node Orchestration
g = StateGraph(HireState)
g.add_node('parse', parse_node)
g.add_node('score', score_node)
g.add_node('explain', explain_node)
g.add_node('bias', bias_node)

g.set_entry_point('parse')
g.add_edge('parse', 'score')
g.add_edge('score', 'explain')
g.add_edge('explain', 'bias')
g.add_edge('bias', END)

agent = g.compile()
