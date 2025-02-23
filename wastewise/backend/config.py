# backend/config.py
from dotenv import load_dotenv
import os

load_dotenv()

class Config:
    SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
    SUPABASE_KEY = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    DATABASE_URL = os.getenv('DATABASE_URL')
