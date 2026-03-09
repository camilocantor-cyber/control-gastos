from db import engine, Base
from models import User, Project, ModelFile, Analysis
from passlib.context import CryptContext
from db import SessionLocal

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

def reset_and_setup():
    print("BIMind: Iniciando reseteo forzoso de base de datos...")
    
    # 1. Borrar todas las tablas existentes
    Base.metadata.drop_all(bind=engine)
    print("✅ Tablas antiguas eliminadas.")
    
    # 2. Crear las nuevas tablas con la estructura correcta
    Base.metadata.create_all(bind=engine)
    print("✅ Nuevas tablas creadas con owner_id.")
    
    # 3. Recrear el usuario camilo
    db = SessionLocal()
    try:
        hashed_password = pwd_context.hash("password123")
        new_user = User(
            username="camilo",
            email="camilo@bimind.ai",
            hashed_password=hashed_password
        )
        db.add(new_user)
        db.commit()
        print("✅ Usuario 'camilo' recreado con éxito.")
    except Exception as e:
        print(f"❌ Error al recrear usuario: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    reset_and_setup()
