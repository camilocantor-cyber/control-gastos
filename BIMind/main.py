from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, status, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from jose import JWTError, jwt
from passlib.context import CryptContext
import shutil
import os
from typing import List, Optional
from datetime import datetime, timedelta
from analysis import analyze_ifc
from db import SessionLocal
from models import Project, ModelFile, Analysis, User

# Configuración de Seguridad
SECRET_KEY = "BIMIND_SECRET_KEY_PROD_100" # Cambiar en producción
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

app = FastAPI(title="BIMind MVP")

# Permitir CORS para desarrollo local
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Servir archivos estáticos
app.mount("/static", StaticFiles(directory="static"), name="static")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Utilidades de Contraseña
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: SessionLocal = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    return user

# Función para procesamiento en segundo plano
def run_analysis_task(project_id: int, file_path: str, analysis_id: int):
    db = SessionLocal()
    try:
        # Actualizar a PROCESANDO
        analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
        analysis.status = "PROCESSING"
        db.commit()
        
        print(f"BIMind IA: Iniciando análisis pesado del archivo {file_path}")
        result = analyze_ifc(file_path)
        
        # Guardar resultados
        analysis.status = "COMPLETED"
        analysis.result_json = result
        db.commit()
        print(f"✅ BIMind IA: Análisis completado para ID {analysis_id}")
    except Exception as e:
        db.rollback()
        analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
        if analysis:
            analysis.status = "FAILED"
            analysis.error_message = str(e)
            db.commit()
        print(f"❌ BIMind IA: Error en análisis: {str(e)}")
    finally:
        db.close()

@app.post("/auth/register")
def register(username: str, email: str, password: str, db: SessionLocal = Depends(get_db)):
    db_user = db.query(User).filter(User.username == username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = get_password_hash(password)
    new_user = User(username=username, email=email, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"status": "User created", "id": new_user.id}

@app.post("/token")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: SessionLocal = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/health")
def health_check():
    return {"status": "ok", "timestamp": datetime.utcnow()}

@app.get("/")
async def root():
    return {"message": "BIMind API is running. Go to /static/login.html"}

@app.get("/projects")
def get_projects(current_user: User = Depends(get_current_user), db: SessionLocal = Depends(get_db)):
    return db.query(Project).filter(Project.owner_id == current_user.id).all()

@app.post("/project")
def create_project(name: str, current_user: User = Depends(get_current_user), db: SessionLocal = Depends(get_db)):
    print(f"BIMind: Creando proyecto '{name}' para usuario '{current_user.username}'")
    try:
        project = Project(name=name, owner_id=current_user.id)
        db.add(project)
        db.commit()
        db.refresh(project)
        print(f"✅ Proyecto creado: ID {project.id}")
        return project
    except Exception as e:
        db.rollback()
        print(f"❌ Error al crear proyecto: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")

@app.post("/upload/{project_id}")
async def upload_ifc(
    project_id: int, 
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...), 
    current_user: User = Depends(get_current_user), 
    db: SessionLocal = Depends(get_db)
):
    # Verificar que el proyecto pertenece al usuario
    project = db.query(Project).filter(Project.id == project_id, Project.owner_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or unauthorized")

    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    model_file = ModelFile(project_id=project_id, filename=file.filename, path=file_path)
    db.add(model_file)
    
    # Crear registro de análisis inicial
    analysis_record = Analysis(
        project_id=project_id,
        type="FULL_AI_ANALYSIS",
        status="PENDING"
    )
    db.add(analysis_record)
    db.commit()
    db.refresh(analysis_record)
    
    # Lanzar tarea en segundo plano
    background_tasks.add_task(run_analysis_task, project_id, file_path, analysis_record.id)
    
    return {"message": "Carga inicial completada. El análisis ha comenzado en segundo plano.", "analysis_id": analysis_record.id}

@app.get("/analysis/status/{project_id}")
def get_analysis_status(
    project_id: int, 
    analysis_id: Optional[int] = None,
    current_user: User = Depends(get_current_user), 
    db: SessionLocal = Depends(get_db)
):
    # Verificar acceso al proyecto
    project = db.query(Project).filter(Project.id == project_id, Project.owner_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    query = db.query(Analysis).filter(Analysis.project_id == project_id)
    if analysis_id:
        analysis = query.filter(Analysis.id == analysis_id).first()
    else:
        analysis = query.order_by(Analysis.created_at.desc()).first()
        
    if not analysis:
        return {"status": "NONE"}
    
    return {
        "status": analysis.status,
        "results": analysis.result_json,
        "error": analysis.error_message,
        "id": analysis.id
    }
@app.post("/load-sample/{project_id}")
async def load_sample(
    project_id: int, 
    filename: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user), 
    db: SessionLocal = Depends(get_db)
):
    # Verificar acceso
    project = db.query(Project).filter(Project.id == project_id, Project.owner_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Copiar el archivo de muestra a la carpeta de uploads si no existe
    source_path = os.path.join(os.getcwd(), filename)
    print(f"BIMind IA: Intentando cargar muestra desde {source_path}")
    
    if not os.path.exists(source_path):
        print(f"❌ Archivo no encontrado en: {source_path}")
        raise HTTPException(status_code=404, detail=f"Sample file {filename} not found on server at {source_path}")
        
    target_path = os.path.join(UPLOAD_DIR, filename)
    shutil.copy2(source_path, target_path)
    print(f"✅ Archivo copiado a {target_path}")
    
    # Registrar archivo
    model_file = ModelFile(project_id=project_id, filename=filename, path=target_path)
    db.add(model_file)
    
    # Crear registro de análisis
    analysis_record = Analysis(
        project_id=project_id,
        type="FULL_AI_ANALYSIS",
        status="PENDING"
    )
    db.add(analysis_record)
    db.commit()
    db.refresh(analysis_record)
    
    # Lanzar tarea
    background_tasks.add_task(run_analysis_task, project_id, target_path, analysis_record.id)
    
    return {"status": "ok", "message": "Sample loaded, analysis started", "analysis_id": analysis_record.id}

@app.post("/ai/generate/{project_id}")
async def ai_generate_modification(
    project_id: int, 
    prompt: str = "Añadir balcón",
    current_user: User = Depends(get_current_user), 
    db: SessionLocal = Depends(get_db)
):
    """
    Endpoint Placeholder para Visión 100: IA Generativa.
    Simula el proceso de modificación del IFC mediante agentes.
    """
    project = db.query(Project).filter(Project.id == project_id, Project.owner_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    return {
        "status": "Vision 100 POC",
        "message": f"IA ha recibido el prompt: '{prompt}'. Iniciando simulación de modificación en el modelo del proyecto {project_id}.",
        "eta_seconds": 45,
        "note": "Esta es una funcionalidad de la Visión 100 (BETA)."
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
