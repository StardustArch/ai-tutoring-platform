from pydantic import BaseModel
from typing import List, Optional

class RushRequest(BaseModel):
    student_class: int
    subject: str = "matematica"
    subtopic: str
    recent_questions: List[str] = []
    difficulty_level: int = 3
    context_rules: str = ""
    forced_structure_override: Optional[str] = None
    ancora: Optional[str] = None  # 🆕 chave da âncora (ex: 'texto_bilhete_fatima')


class RushResponse(BaseModel):
    type: str = "multiple_choice"   # "multiple_choice" | "true_false" | "cloze"
    question: str
    options: List[str]
    correct_answer: str
    explanation: str


class ChatRequest(BaseModel):
    student_id: int
    student_class: int
    user_query: str
    mode: str = "tutor"
    history: List[dict] = []
    subject: str = "" 
    topic: str = ""
    context_rules: str = ""
    phase: str = "EXPLAIN"
    last_question: Optional[str] = None
    last_correct_answer: Optional[str] = None
    last_interaction_type: Optional[str] = None
    ancoras: list[str] = []

class ChatResponse(BaseModel):
    response_text: str