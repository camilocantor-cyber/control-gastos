import requests

# Configuración
BASE_URL = "http://localhost:8000"
USERNAME = "camilo"
EMAIL = "camilo@bimind.ai"
PASSWORD = "password123"

def register_user():
    print(f"BIMind: Registrando usuario '{USERNAME}'...")
    
    url = f"{BASE_URL}/auth/register"
    params = {
        "username": USERNAME,
        "email": EMAIL,
        "password": PASSWORD
    }
    
    try:
        response = requests.post(url, params=params)
        if response.status_code == 200:
            print("✅ Usuario creado con éxito!")
            print(f"Ya puedes loguearte en: {BASE_URL}/static/login.html")
            print(f"Usuario: {USERNAME}")
            print(f"Contraseña: {PASSWORD}")
        else:
            print(f"❌ Error al registrar: {response.text}")
    except Exception as e:
        print(f"❌ Error de conexión: {e}")
        print("Asegúrate de que el servidor FastAPI esté corriendo (uvicorn main:app).")

if __name__ == "__main__":
    register_user()
