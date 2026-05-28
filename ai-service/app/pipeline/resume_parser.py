import fitz, nltk, re
import pandas as pd
from pathlib import Path
from docx import Document as Docx

# Essential downloads for NLP tasks
nltk.download('punkt', quiet=True)
nltk.download('punkt_tab', quiet=True)
nltk.download('stopwords', quiet=True)
nltk.download('wordnet', quiet=True)

from nltk.tokenize import sent_tokenize, word_tokenize
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer

class ResumeProcessor:
    def __init__(self, chunk_size=300, overlap=50):
        self.chunk_size = chunk_size
        self.overlap = overlap
        self.lemmatizer = WordNetLemmatizer()
        self.stop_words = set(stopwords.words('english'))
        self.skill_patterns = [
            'python','javascript','react','node','express','sql','mongodb','postgresql',
            'docker','kubernetes','langchain','pytorch','tensorflow','scikit','pandas',
            'numpy','fastapi','flask','django','aws','azure','gcp','git','java','golang',
            'typescript','graphql','redis','kafka','spark','hadoop','machine learning',
            'deep learning','nlp','computer vision','data science','mlops','tailwind',
            'nextjs','vue','angular','aws lambda','ec2','s3','ci/cd','jenkins','terraform'
        ]

    def extract_text(self, path: str) -> str:
        if not path or not Path(path).exists():
            return ""
        ext = path.rsplit('.', 1)[-1].lower()
        try:
            with open(path, 'rb') as f:
                header = f.read(5)
            if ext == 'pdf' or header == b'%PDF-':
                return "\n".join(p.get_text() for p in fitz.open(path))
            if ext in ('docx','doc'):
                return "\n".join(p.text for p in Docx(path).paragraphs)
            return Path(path).read_text(errors='ignore')
        except Exception:
            return ""

    def clean(self, text: str) -> str:
        if not text: return ""
        sentences = sent_tokenize(text)
        out = []
        for s in sentences:
            tokens = [self.lemmatizer.lemmatize(t.lower())
                     for t in word_tokenize(s)
                     if t.isalpha() and t.lower() not in self.stop_words]
            if len(tokens) > 2:
                out.append(' '.join(tokens))
        return ' '.join(out)

    def chunk(self, text: str, doc_id: str) -> pd.DataFrame:
        words, rows, step = text.split(), [], self.chunk_size - self.overlap
        for i in range(0, len(words), step):
            chunk = ' '.join(words[i:i+self.chunk_size])
            if len(chunk) > 30:
                rows.append({
                    'doc_id': doc_id,
                    'text': chunk,
                    'words': len(chunk.split())
                })
        return pd.DataFrame(rows)

    def extract_metadata(self, text: str) -> dict:
        text_lower = text.lower()
        skills = [s for s in self.skill_patterns if s in text_lower]
        
        # Experience Years
        exp_years = 0
        patterns = [r'(\d+)\+?\s*years?\s*of\s*experience', r'(\d+)\+?\s*yrs?\s*experience']
        for pat in patterns:
            match = re.search(pat, text_lower)
            if match:
                exp_years = int(match.group(1))
                break
        
        return {'skills': skills, 'total_years': exp_years}

    def process(self, path: str, doc_id: str):
        raw = self.extract_text(path)
        clean_txt = self.clean(raw)
        meta = self.extract_metadata(raw)
        df = self.chunk(clean_txt, doc_id)
        
        stats = {
            'chunks': len(df),
            'total_words': int(df['words'].sum()) if not df.empty else 0,
            'skills_found': len(meta['skills'])
        }
        return df, meta, stats

# Retro-compatibility wrapper
def parse_resume(file_path: str) -> dict:
    proc = ResumeProcessor()
    df, meta, stats = proc.process(file_path, "res_1")
    return {
        'raw_text': proc.extract_text(file_path),
        'clean_text': proc.clean(proc.extract_text(file_path)),
        'skills': meta['skills'],
        'total_years': meta['total_years'],
        'stats': stats
    }
