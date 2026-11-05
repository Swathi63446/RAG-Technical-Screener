import json
from datetime import datetime
from app.database.db import db


class InterviewSession(db.Model):
    __tablename__ = "interview_sessions"

    id = db.Column(db.String(36), primary_key=True)
    candidate_name = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(100), nullable=False)
    status = db.Column(db.String(50), default="active")  # active | completed
    question_count = db.Column(db.Integer, default=0)
    current_difficulty = db.Column(db.String(20), default="easy")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    qa_pairs = db.relationship("InterviewQA", backref="session", lazy=True,
                               cascade="all, delete-orphan")
    resume = db.relationship("ResumeData", backref="session", uselist=False,
                             lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "candidate_name": self.candidate_name,
            "role": self.role,
            "status": self.status,
            "question_count": self.question_count,
            "current_difficulty": self.current_difficulty,
            "created_at": self.created_at.isoformat(),
        }


class InterviewQA(db.Model):
    __tablename__ = "interview_qa"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    session_id = db.Column(db.String(36), db.ForeignKey("interview_sessions.id"),
                           nullable=False)
    question = db.Column(db.Text, nullable=False)
    answer = db.Column(db.Text, nullable=True)
    retrieved_context = db.Column(db.Text, nullable=True)   # JSON list of strings
    score = db.Column(db.Float, nullable=True)
    quality = db.Column(db.String(20), nullable=True)        # weak/average/good/excellent
    difficulty = db.Column(db.String(20), default="easy")
    question_type = db.Column(db.String(50), default="conceptual")
    topic = db.Column(db.String(100), nullable=True)
    strengths = db.Column(db.Text, nullable=True)            # JSON list
    weaknesses = db.Column(db.Text, nullable=True)           # JSON list
    feedback = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "session_id": self.session_id,
            "question": self.question,
            "answer": self.answer,
            "retrieved_context": json.loads(self.retrieved_context) if self.retrieved_context else [],
            "score": self.score,
            "quality": self.quality,
            "difficulty": self.difficulty,
            "question_type": self.question_type,
            "topic": self.topic,
            "strengths": json.loads(self.strengths) if self.strengths else [],
            "weaknesses": json.loads(self.weaknesses) if self.weaknesses else [],
            "feedback": self.feedback,
            "created_at": self.created_at.isoformat(),
        }


class ResumeData(db.Model):
    __tablename__ = "resume_data"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    session_id = db.Column(db.String(36), db.ForeignKey("interview_sessions.id"),
                           nullable=False)
    raw_resume_text = db.Column(db.Text, nullable=True)
    extracted_skills = db.Column(db.Text, nullable=True)      # JSON list
    extracted_projects = db.Column(db.Text, nullable=True)    # JSON list
    extracted_experience = db.Column(db.Text, nullable=True)  # JSON list
    extracted_education = db.Column(db.Text, nullable=True)   # JSON list
    extracted_technologies = db.Column(db.Text, nullable=True) # JSON list
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "session_id": self.session_id,
            "extracted_skills": json.loads(self.extracted_skills) if self.extracted_skills else [],
            "extracted_projects": json.loads(self.extracted_projects) if self.extracted_projects else [],
            "extracted_experience": json.loads(self.extracted_experience) if self.extracted_experience else [],
            "extracted_education": json.loads(self.extracted_education) if self.extracted_education else [],
            "extracted_technologies": json.loads(self.extracted_technologies) if self.extracted_technologies else [],
            "raw_resume_text": self.raw_resume_text,
        }
