import json
import os
from typing import Literal

from fastapi import APIRouter
from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel

router = APIRouter()
llm = ChatGoogleGenerativeAI(model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"), temperature=0.3)

class InterviewQuestionReq(BaseModel):
    resume_text: str
    job_description: str
    job_title: str
    candidate_name: str
    difficulty: Literal["Junior", "Mid", "Senior"] = "Mid"

def clean_json_response(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        if lines and lines[0].startswith("```"):
            text = "\n".join(lines[1:-1])
    return text.strip()

def fallback_questions(req: InterviewQuestionReq) -> dict:
    return {
        "technical_questions": [
            {
                "question": question,
                "expected_answer_hint": "Look for role understanding, relevant tools, trade-off thinking, and practical delivery steps.",
                "difficulty": "Medium",
                "topic": req.job_title
            }
            for question in [
                f"How would you approach the main responsibilities of the {req.job_title} role?",
                "Which projects in your resume best prove your fit for this role?",
                "Walk through a difficult technical problem you solved end to end.",
                "How do you debug production issues when the root cause is unclear?",
                "How do you decide between speed of delivery and long-term maintainability?",
                "Which tools or frameworks from the job description have you used most deeply?",
                "Describe how you would measure success for your first 90 days in this role.",
                "What technical gap from this role would you need to ramp up on first?"
            ]
        ],
        "hr_questions": [
            {
                "question": question,
                "purpose": "Assess communication, ownership, motivation, and collaboration style."
            }
            for question in [
                "Tell me about a recent project you are proud of.",
                "Describe a time you received difficult feedback and what changed afterward.",
                "How do you prefer to collaborate with product, design, or business teams?",
                "What kind of work environment helps you do your best work?",
                "Why are you interested in this role right now?"
            ]
        ],
        "situational_questions": [
            {
                "question": question,
                "what_to_look_for": "Look for adaptability, communication, ownership, and decision quality."
            }
            for question in [
                "What would you do if priorities changed halfway through an important delivery?",
                "How would you handle a disagreement with a senior teammate about implementation direction?",
                "What would you do if you joined and discovered the existing system had very little documentation?"
            ]
        ],
        "red_flags_to_probe": ["Probe any resume gaps, missing required skills, or unclear ownership claims."]
    }

@router.post("/generate-interview-questions")
async def generate_interview_questions(req: InterviewQuestionReq):
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a senior technical interviewer. Return ONLY a raw JSON object with keys: technical_questions, hr_questions, situational_questions, red_flags_to_probe. Generate exactly 8 technical questions, 5 HR questions, and 3 situational questions. technical_questions items need question, expected_answer_hint, difficulty (Easy, Medium, Hard), topic. hr_questions items need question and purpose. situational_questions items need question and what_to_look_for. red_flags_to_probe must be an array of concise strings based on resume gaps, unexplained career gaps, or weak job alignment."),
        ("human", "Candidate: {candidate_name}\nRole: {job_title}\nDifficulty target: {difficulty}\nJob description:\n{job_description}\nResume content:\n{resume_text}")
    ])

    try:
        response = await (prompt | llm).ainvoke({
            "candidate_name": req.candidate_name,
            "job_title": req.job_title,
            "difficulty": req.difficulty,
            "job_description": req.job_description[:6000],
            "resume_text": req.resume_text[:9000]
        })
        parsed = json.loads(clean_json_response(response.content))
        if not isinstance(parsed, dict):
            return fallback_questions(req)
        return {**fallback_questions(req), **parsed}
    except Exception:
        return fallback_questions(req)
