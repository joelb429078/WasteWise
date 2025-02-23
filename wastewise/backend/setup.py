from setuptools import setup, find_packages

setup(
    name="wastewise-backend",
    version="1.0.0",
    packages=find_packages(),
    install_requires=[
        'flask',
        'flask-cors',
        'python-dotenv',
        'psycopg2-binary',
        'supabase-py',
        'postgrest'
    ],
)