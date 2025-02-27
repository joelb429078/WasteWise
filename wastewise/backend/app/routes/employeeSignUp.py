# backend/app/routes/employeeSingUp.py
import os
from flask import Blueprint, request, jsonify
import hashlib
import hmac
import base64
import sys
from app.utils.db import supabase_client


bp = Blueprint('employeeSignUp', __name__)
print(__name__)

@bp.route('/employeeSignUp', methods = ["POST"])
def employeeSignUp():
    # data = request.form.to_dict()
    print("Data recieved", file=sys.stdout)
    data = request.json

    # print(data, file=sys.stdout)
    f = open("employeeSignUp.txt", "w")
    f.write(str(data))
    f.close()
    print(str(data), file=sys.stdout)

    return jsonify({"message": "Data received", "data": data})


# def employeeSignUp():

#     f = open("employeeSignUp.txt", "w")
#     f.write("Test")
#     f.close()

# employeeSignUp()