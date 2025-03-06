# backend/config.py
from dotenv import load_dotenv
import os

load_dotenv()

# class Config:
#     SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
#     SUPABASE_KEY = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
#     DATABASE_URL = os.getenv('DATABASE_URL')

class Config:
    DATABASE_URL = "postgresql://postgres:kse4akd8vDqSpWYz@lawvohentnnnaxadgjfz.supabase.co:5432/postgres"
    SUPABASE_URL = "https://lawvohentnnnaxadgjfz.supabase.co"
    SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxhd3ZvaGVudG5ubmF4YWRnamZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk2NDI3MDksImV4cCI6MjA1NTIxODcwOX0.KXnu4bSoHzeTS0OHB3jC0PlrKX3b5PlCHOeOA0H0q8I"