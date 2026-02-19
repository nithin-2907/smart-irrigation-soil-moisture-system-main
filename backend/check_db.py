from pymongo import MongoClient

client = MongoClient("mongodb://127.0.0.1:27017/")
db = client["smart_irrigation"]
count = db["crop_samples"].count_documents({})
print(f"Crop Samples Count: {count}")

try:
    metrics = db["ml_metrics"].find_one(sort=[("createdAt", -1)])
    if metrics:
        print(f"Latest Metric Accuracy: {metrics.get('accuracy')}")
    else:
        print("No training metrics found.")
except Exception as e:
    print(f"Error checking metrics: {e}")
