import json
import os
import re
import tempfile
from pathlib import Path

import fitz
from docx import Document as Docx
from fastapi import APIRouter, File, HTTPException, UploadFile
from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI

router = APIRouter()
MAX_FILE_SIZE = 5 * 1024 * 1024
llm = ChatGoogleGenerativeAI(model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"), temperature=0)

EMPTY_PARSE = {
    "name": "",
    "email": "",
    "phone": "",
    "location": "",
    "linkedin": "",
    "summary": "",
    "skills": [],
    "experience": [],
    "education": [],
    "total_experience_years": 0,
    "certifications": []
}

def clean_json_response(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        if lines and lines[0].startswith("```"):
            text = "\n".join(lines[1:-1])
    return text.strip()

def fallback_parse(text: str) -> dict:
    parsed = dict(EMPTY_PARSE)
    email = re.search(r'[\w.\-+]+@[\w.\-]+\.\w+', text)
    phone = re.search(r'(\+?\d[\d\s().-]{8,}\d)', text)
    linkedin = re.search(r'(https?://)?(www\.)?linkedin\.com/[^\s]+', text, re.I)
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    parsed["name"] = lines[0][:80] if lines else ""
    parsed["email"] = email.group(0) if email else ""
    parsed["phone"] = phone.group(0) if phone else ""
    parsed["linkedin"] = linkedin.group(0) if linkedin else ""
    parsed["summary"] = " ".join(text.split()[:60])
    return parsed

def extract_pdf_text(path: str) -> str:
    with fitz.open(path) as doc:
        return "\n".join(page.get_text() for page in doc)

def extract_docx_text(path: str) -> str:
    return "\n".join(paragraph.text for paragraph in Docx(path).paragraphs)

@router.post("/parse-resume")
async def parse_resume_preview(file: UploadFile = File(...)):
    docx_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    if file.content_type not in ("application/pdf", docx_type, "application/octet-stream"):
        raise HTTPException(status_code=415, detail="Only PDF and DOCX files are supported for preview parsing")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="Resume file must be 5MB or smaller")

    tmp_path = ""
    try:
        suffix = ".docx" if file.filename and file.filename.lower().endswith(".docx") else ".pdf"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        text = extract_docx_text(tmp_path) if suffix == ".docx" else extract_pdf_text(tmp_path)
        if not text.strip():
            return {**EMPTY_PARSE, "summary": "No readable text was found in this PDF."}

        prompt = ChatPromptTemplate.from_messages([
            ("system", "Extract structured resume data. Return ONLY a raw JSON object with keys: name, email, phone, location, linkedin, summary, skills, experience, education, total_experience_years, certifications. experience must be an array of objects with company, role, duration, description. education must be an array of objects with institution, degree, year. Use empty strings, empty arrays, and 0 when data is missing."),
            ("human", "Resume text:\n{text}")
        ])

        try:
            response = await (prompt | llm).ainvoke({"text": text[:12000]})
            parsed = json.loads(clean_json_response(response.content))
            if not isinstance(parsed, dict):
                parsed = {}
        except Exception:
            parsed = fallback_parse(text)

        return {**EMPTY_PARSE, **parsed}
    except HTTPException:
        raise
    except Exception as exc:
        partial = fallback_parse(content.decode(errors="ignore"))
        return {**partial, "parse_warning": str(exc)}
    finally:
        if tmp_path:
            Path(tmp_path).unlink(missing_ok=True)
