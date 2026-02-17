from datetime import datetime

from pymongo import MongoClient

client = MongoClient("mongodb://127.0.0.1:27017/")
db = client["smart_irrigation"]
collection = db["soil_samples"]

sample_docs = []

# Generate synthetic soil samples covering Poor / Fair / Good
for i in range(300):
    # vary nutrients and pH
    base = i % 3
    if base == 0:
        # Good soil
        n = 40 + (i % 20)
        p = 20 + (i % 10)
        k = 150 + (i % 50)
        ph = 6.2 + ((i % 30) / 100)
        label = 'Good'
    elif base == 1:
        # Fair soil
        n = 20 + (i % 15)
        p = 8 + (i % 8)
        k = 80 + (i % 40)
        ph = 5.8 + ((i % 40) / 100)
        label = 'Fair'
    else:
        # Poor soil
        n = 5 + (i % 10)
        p = 2 + (i % 4)
        k = 30 + (i % 20)
        ph = 4.5 + ((i % 50) / 100)
        label = 'Poor'

    sample_docs.append({
        'nitrogen': float(n),
        'phosphorus': float(p),
        'potassium': float(k),
        'ph': float(round(ph, 2)),
        'label': label,
        'createdAt': datetime.utcnow()
    })

if __name__ == '__main__':
    collection.insert_many(sample_docs)
    print(f"Inserted {len(sample_docs)} synthetic soil samples into 'soil_samples'.")