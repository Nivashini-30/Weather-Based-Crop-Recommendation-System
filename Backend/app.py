from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import numpy as np
import requests
import os

app = Flask(__name__)
CORS(app)

# Load model and scaler
BASE_DIR = os.path.dirname(__file__)
model_path = os.path.join(BASE_DIR, "model.pkl")
model = pickle.load(open(model_path, "rb"))

scaler_path = os.path.join(BASE_DIR, "minmaxscaler.pkl")
scaler = pickle.load(open(scaler_path, "rb"))

API_KEY = "48dfc9c0e8b6e60cbf140eae9eae6f27"

def get_weather(city):
    url = f"http://api.openweathermap.org/data/2.5/weather?q={city}&appid={API_KEY}&units=metric"
    res = requests.get(url)
    data = res.json()
    if data["cod"] != 200:
        return None, None
    return data["main"]["temp"], data["main"]["humidity"]

crop_dict = {
    1: "Rice", 2: "Maize", 3: "Jute", 4: "Cotton", 5: "Coconut",
    6: "Papaya", 7: "Orange", 8: "Apple", 9: "Muskmelon", 10: "Watermelon",
    11: "Grapes", 12: "Mango", 13: "Banana", 14: "Pomegranate", 15: "Lentil",
    16: "Blackgram", 17: "Mungbean", 18: "Mothbeans", 19: "Pigeonpeas",
    20: "Kidneybeans", 21: "Chickpea", 22: "Coffee"
}

@app.route("/")
def home():
    return "🌾 Crop Recommendation Backend is running!"

@app.route("/api/recommend", methods=["POST"])
def recommend():
    try:
        data = request.json

        n = data["n"]
        p = data["p"]
        k = data["k"]
        ph = data["ph"]
        rainfall = float(data["rainfall"])
        city = data.get("city", None)
        temperature = data.get("temperature", None)
        humidity = data.get("humidity", None)

        # If temperature or humidity is missing or empty, try to fetch from city
        if (temperature is None or humidity is None or temperature == "" or humidity == "") and city:
            temp, hum = get_weather(city)
            if temp is not None and hum is not None:
                temperature = temp
                humidity = hum
            else:
                return jsonify({"error": "Weather data unavailable and not provided manually."}), 400
        else:
            temperature = float(temperature)
            humidity = float(humidity)

        features = np.array([[n, p, k, temperature, humidity, ph, rainfall]])
        transformed = scaler.transform(features)
        prediction = model.predict(transformed)[0]
        crop_name = crop_dict.get(prediction, "Unknown")

        return jsonify({
            "crop": crop_name,
            "n": n,
            "p": p,
            "k": k,
            "ph": ph,
            "rainfall": rainfall,
            "temperature": temperature,
            "humidity": humidity
        })

    except Exception as e:
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500

if __name__ == "__main__":
    print("✅ Starting Flask app...")
    app.run(debug=True, port=5000)
