from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Usamos SQLite para el MVP por facilidad de despliegue local
DATABASE_URL = "sqlite:///./bimind.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()
