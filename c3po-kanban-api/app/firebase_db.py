import os
import json
import firebase_admin
from firebase_admin import credentials, firestore, auth
from dotenv import load_dotenv

load_dotenv()

cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH")
raw_cred = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")

if cred_path and os.path.exists(cred_path):
    cred = credentials.Certificate(cred_path)
elif raw_cred:
    cred = credentials.Certificate(json.loads(raw_cred))
else:
    raise RuntimeError("Credenciais do Firebase não encontradas.")

if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)

db = firestore.client()
firebase_auth = auth