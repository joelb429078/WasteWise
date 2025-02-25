# WasteWise - Business Waste Management System

## Project Setup Guide

### Prerequisites
- Node.js (v16 or higher)
- Python (v3.8 or higher)
- pip (Python package manager)
- Git

### Directory Structure
```
project-root/
├── backend/
│   ├── app/
│   │   ├── routes/
│   │   ├── models/
│   │   └── utils/
│   ├── .env
│   └── requirements.txt
├── src/
│   ├── app/
│   ├── components/
│   └── lib/
├── .env.local
└── package.json
```

### Initial Setup

1. Clone the repository:
```bash
git clone WasteWise
cd "wastewise"
```

2. Frontend Setup:
```bash
# Install dependencies
npm install

# Create .env.local in root directory
touch .env.local
```

3. Backend Setup:
```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On MacOS/Linux:
source venv/bin/activate

# Install dependencies
You can do this by running the setup.py as well as the run.py. 

# Create .env file
touch .env
```

### Environment Variables Setup

1. `.env.local` (in project root):


2. `backend/.env`:


### Running the Application

1. Start the backend server:
```bash
# From the backend directory with venv activated
python run.py
```

2. Start the frontend development server:
```bash
# From the project root
npm run dev
```

The application should now be running at:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

### Testing the Setup

1. Visit http://localhost:3000/auth-test
2. Click "Run Tests" to verify:
   - Database connection
   - User creation
   - Authentication
   - Data fetching

### Common Issues and Solutions

1. **Database Connection Error**:
   - Verify your database URL in `backend/.env`
   - Check if your IP is allowlisted in Supabase

2. **Auth Errors**:
   - Ensure email confirmation is disabled in Supabase
   - Verify your anon key in both `.env` files

3. **Trigger Issues**:
   - Check if the trigger is properly created
   - Verify businessID 1 exists in the Businesses table

### Development Notes

- The backend uses Flask with Python 3.8+
- The frontend uses Next.js 13+ with App Router
- Authentication is handled by Supabase
- All database operations should use RLS policies
- Use the provided test page at /auth-test to verify functionality

### Security Considerations

- Don't commit .env files
- Keep your Supabase keys secure
- Use proper password hashing
- Enable email confirmation in production
- Review RLS policies before deployment
