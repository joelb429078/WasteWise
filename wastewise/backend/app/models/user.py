# backend/app/models/user.py
from datetime import datetime

class User:
    def __init__(self, user_id, username, email, business_id, is_admin=False, is_owner=False):
        self.user_id = user_id
        self.username = username
        self.email = email
        self.business_id = business_id
        self.is_admin = is_admin
        self.is_owner = is_owner
        self.created_at = datetime.utcnow()

    def to_dict(self):
        return {
            'userID': self.user_id,
            'username': self.username,
            'email': self.email,
            'businessID': self.business_id,
            'admin': self.is_admin,
            'owner': self.is_owner,
            'created_at': self.created_at.isoformat()
        }

    @classmethod
    def from_db(cls, db_user):
        return cls(
            user_id=db_user['userID'],
            username=db_user['username'],
            email=db_user['email'],
            business_id=db_user['businessID'],
            is_admin=db_user['admin'],
            is_owner=db_user['owner']
        )