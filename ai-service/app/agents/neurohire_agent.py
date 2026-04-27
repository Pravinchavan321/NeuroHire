import json
from typing import TypedDict, List
from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from app.pipeline.resume_parser import parse_resume
from app.pipeline.scorer import (
    compute_skill_score, 
    compute_experience_score, 
    compute_skill_overlap, 
    compute_overall_score
)

# Initialize Gemini 1.5 Flash
llm = ChatGoogleGenerativeAI(model='gemini-1.5-flash', temperature=0.2)

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
    final_score: float

def parse_node(state: HireState) -> HireState:
    """Parses resume text and extracts basic metadata."""
    state['resume_data'] = parse_resume(state['resume_path'])
    return state

def score_node(state: HireState) -> HireState:
    """Calculates granular match scores using ML metrics."""
    rd = state['resume_data']
    
    # Text-based similarity
    skill_score = compute_skill_score(rd['clean_text'], state['job_description'])
    
    # Experience mapping
    exp_score = compute_experience_score(rd['total_years'], state['exp_required'])
    
    # Skill set overlap
    overlap = compute_skill_overlap(rd['skills'], state['jd_skills'])
    
    # Weighted final percentage
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

def explain_node(state: HireState) -> HireState:
    """Uses Gemini to provide a narrative summary and technical interview questions."""
    rd = state['resume_data']
    gaps = state['skill_overlap']['missing']
    
    # Narrative Summary Prompt
    summary_chain = ChatPromptTemplate.from_messages([
        ("system", "You are an expert technical recruiter. Write a compelling 3-sentence summary of the candidate's fit for the role. Focus on strengths and be transparent about gaps. Use a professional, data-driven tone."),
        ("human", "Role: {job_title}\nMatch Score: {score}/100\nCandidate Skills: {skills}\nGaps: {gaps}\nExperience: {exp} years")
    ]) | llm
    
    # Question Generation Prompt
    questions_chain = ChatPromptTemplate.from_messages([
        ("system", "Generate 3 advanced technical interview questions aimed at testing the candidate's biggest skill gaps. Return ONLY a raw JSON array of strings."),
        ("human", "Role: {job_title}\nMissing Skills: {gaps}\nExisting Skills: {skills}")
    ]) | llm

    # Execute narrative generation
    summary_res = summary_chain.invoke({
        'job_title': state['job_title'],
        'score': state['final_score'],
        'skills': ', '.join(rd['skills']) or 'General',
        'gaps': ', '.join(gaps) or 'None identified',
        'exp': rd['total_years']
    })
    state['llm_summary'] = summary_res.content

    # Execute technical question generation
    try:
        q_res = questions_chain.invoke({'job_title': state['job_title'], 'gaps': gaps, 'skills': rd['skills']})
        cleaned_content = clean_json_response(q_res.content)
        state['llm_questions'] = json.loads(cleaned_content)
    except Exception as e:
        print(f"LLM Question Error: {e}")
        state['llm_questions'] = ["Could not generate specific questions for this candidate."]
        
    return state

# Node Orchestration
g = StateGraph(HireState)
g.add_node('parse', parse_node)
g.add_node('score', score_node)
g.add_node('explain', explain_node)

g.set_entry_point('parse')
g.add_edge('parse', 'score')
g.add_edge('score', 'explain')
g.add_edge('explain', END)

agent = g.compile()
