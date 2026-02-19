from pymongo import MongoClient
import sys

try:
    client = MongoClient("mongodb://127.0.0.1:27017/", serverSelectionTimeoutMS=2000)
    db = client["smart_irrigation"]
    count = db["crop_samples"].count_documents({})
    print(f"COUNT:{count}")
except Exception as e:
    print(f"ERROR:{e}")
