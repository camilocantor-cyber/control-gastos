from db import SessionLocal
from models import User
from passlib.context import CryptContext

# Usar un esquema más simple si bcrypt da problemas en este entorno
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

def create_admin_user():
    db = SessionLocal()
    try:
        # Limpiar si existe para asegurar el nuevo hash
        existing_user = db.query(User).filter(User.username == "camilo").first()
        if existing_user:
            db.delete(existing_user)
            db.commit()

        hashed_password = pwd_context.hash("password123")
        new_user = User(
            username="camilo",
            email="camilo@bimind.ai",
            hashed_password=hashed_password
        )
        db.add(new_user)
        db.commit()
        print("✅ Usuario 'camilo' creado exitosamente con la contraseña 'password123' (usando pbkdf2_sha256).")
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    create_admin_user()
