# backend/app/utils/db.py
import psycopg2
from postgrest import PostgrestClient
from config import Config
from contextlib import contextmanager

@contextmanager
def get_db_connection():
    conn = None
    try:
        conn = psycopg2.connect(Config.DATABASE_URL)
        yield conn
    except psycopg2.Error as e:
        print(f"Database connection error: {e}")
        raise
    finally:
        if conn is not None:
            conn.close()

supabase_client = PostgrestClient(
    base_url=f"{Config.SUPABASE_URL}/rest/v1",
    headers={
        "apikey": Config.SUPABASE_KEY,
        "Authorization": f"Bearer {Config.SUPABASE_KEY}"
    }
)

def test_connection():
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute('SELECT 1')
        return True
    except Exception as e:
        print(f"Connection test failed: {e}")
        return False