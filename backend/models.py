import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, JSON, String, Text

from db import Base


class Template(Base):
    __tablename__ = "templates"

    id = Column(String, primary_key=True, default=lambda: uuid.uuid4().hex)
    name = Column(String, nullable=False)
    base_image_path = Column(Text, nullable=False)
    variables = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Job(Base):
    __tablename__ = "jobs"

    id = Column(String, primary_key=True, default=lambda: uuid.uuid4().hex)
    status = Column(String, default="running")
    progress = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    mapping = Column(JSON)
    rows = Column(JSON)
    results = Column(JSON)
    csv_path = Column(Text)
    template_id = Column(String)
