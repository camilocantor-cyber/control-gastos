from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Boolean
from datetime import datetime
from db import Base, engine

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)

class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    owner_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

class ModelFile(Base):
    __tablename__ = "model_files"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    filename = Column(String)
    path = Column(String)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

class Analysis(Base):
    __tablename__ = "analysis"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    type = Column(String)  # LCA, LCC, WATER, ENERGY, etc.
    status = Column(String, default="PENDING") # PENDING, PROCESSING, COMPLETED, FAILED
    result_json = Column(JSON, nullable=True)
    error_message = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

# Crear las tablas al importar los modelos
Base.metadata.create_all(bind=engine)
