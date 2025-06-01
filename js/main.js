// Weather API configuration
const WEATHER_API_KEY = '48dfc9c0e8b6e60cbf140eae9eae6f27'; // Using the same API key as backend
const WEATHER_API_URL = 'https://api.openweathermap.org/data/2.5/weather';

// DOM Elements
const recommendationForm = document.getElementById('recommendationForm');
const manualWeatherInputs = document.getElementById('manualWeatherInputs');
const resultCard = document.getElementById('resultCard');
const cropImage = document.getElementById('cropImage');
const cropName = document.getElementById('cropName');
const cropDescription = document.getElementById('cropDescription');
const cityInput = document.getElementById('city');
const temperatureInput = document.getElementById('temperature');
const humidityInput = document.getElementById('humidity');

// Hide manual weather inputs by default
if (manualWeatherInputs) {
    manualWeatherInputs.style.display = 'none';
}

// Event Listeners
if (recommendationForm) {
    recommendationForm.addEventListener('submit', handleFormSubmit);
}

// Add event listener for city input
if (cityInput) {
    cityInput.addEventListener('change', handleCityChange);
}

// Functions
let weatherFetched = false;

async function handleCityChange(event) {
    const city = event.target.value.trim();
    if (!city) {
        manualWeatherInputs.style.display = 'none';
        temperatureInput.required = false;
        humidityInput.required = false;
        temperatureInput.disabled = true;
        humidityInput.disabled = true;
        weatherFetched = false;
        return;
    }

    try {
        const weatherData = await fetchWeatherData(city);
        if (weatherData) {
            temperatureInput.value = weatherData.temperature.toFixed(1);
            humidityInput.value = weatherData.humidity;
            manualWeatherInputs.style.display = 'none';
            temperatureInput.required = false;
            humidityInput.required = false;
            temperatureInput.disabled = true;
            humidityInput.disabled = true;
            weatherFetched = true;
        } else {
            manualWeatherInputs.style.display = 'block';
            temperatureInput.value = '';
            humidityInput.value = '';
            temperatureInput.required = true;
            humidityInput.required = true;
            temperatureInput.disabled = false;
            humidityInput.disabled = false;
            weatherFetched = false;
        }
    } catch (error) {
        console.error('Error fetching weather data:', error);
        manualWeatherInputs.style.display = 'block';
        temperatureInput.required = true;
        humidityInput.required = true;
        temperatureInput.disabled = false;
        humidityInput.disabled = false;
        weatherFetched = false;
    }
}

// Helper to show error messages on the page
function showError(message) {
    let errorDiv = document.getElementById('recommendationError');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = 'recommendationError';
        errorDiv.className = 'alert alert-danger mt-3';
        recommendationForm.parentNode.insertBefore(errorDiv, recommendationForm);
    }
    errorDiv.textContent = message;
}

async function handleFormSubmit(event) {
    event.preventDefault();

    // Remove previous error
    const prevError = document.getElementById('recommendationError');
    if (prevError) prevError.remove();

    // Show loading state
    const submitButton = event.target.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.innerHTML;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    submitButton.disabled = true;

    try {
        // Get form data
        const formData = {
            n: parseFloat(document.getElementById('nitrogen').value),
            p: parseFloat(document.getElementById('phosphorus').value),
            k: parseFloat(document.getElementById('potassium').value),
            ph: parseFloat(document.getElementById('ph').value),
            rainfall: parseFloat(document.getElementById('rainfall').value),
            city: document.getElementById('city').value,
            includeWeather: weatherFetched,
            temperature: parseFloat(document.getElementById('temperature').value),
            humidity: parseFloat(document.getElementById('humidity').value)
        };
        console.log('Submitting formData:', formData);

        const response = await fetch('http://127.0.0.1:5000/api/recommend', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        console.log('API response status:', response.status);

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            console.error('API error:', errorData);
            showError(errorData?.error || errorData?.message || `HTTP error! status: ${response.status}`);
            return;
        }

        const recommendation = await response.json();
        console.log('API recommendation:', recommendation);
        if (!recommendation || !recommendation.crop) {
            showError('Invalid recommendation data received');
            return;
        }
        displayRecommendation(recommendation);
    } catch (error) {
        console.error('JS error:', error);
        showError(`Error: ${error.message || 'Failed to get recommendation. Please try again.'}`);
    } finally {
        // Reset button state
        submitButton.innerHTML = originalButtonText;
        submitButton.disabled = false;
    }
}

async function fetchWeatherData(city) {
    try {
        const response = await fetch(`${WEATHER_API_URL}?q=${city}&appid=${WEATHER_API_KEY}&units=metric`);
        const data = await response.json();

        if (data.cod === '404') {
            return null;
        }

        return {
            temperature: data.main.temp,
            humidity: data.main.humidity
        };
    } catch (error) {
        console.error('Error fetching weather data:', error);
        return null;
    }
}

function displayRecommendation(recommendation) {
    // Remove previous error
    const prevError = document.getElementById('recommendationError');
    if (prevError) prevError.remove();

    // Show result card
    resultCard.style.display = 'block';

    // Update content
    cropName.textContent = recommendation.crop;
    
    // Try multiple image extensions
    const cropBase = `assets/images/crops/${recommendation.crop.toLowerCase()}`;
    const extensions = ['.jpg', '.jpeg', '.png'];
    let found = false;
    let idx = 0;
    function tryNextExtension() {
        if (idx >= extensions.length) {
            cropImage.src = 'assets/images/default-crop.jpg';
            cropDescription.textContent += '\n(Note: No image available for this crop.)';
            return;
        }
        const path = cropBase + extensions[idx];
        cropImage.onerror = function() {
            idx++;
            tryNextExtension();
        };
        cropImage.src = path;
    }
    tryNextExtension();

    // Create description with input values
    const description = `Based on your soil and weather conditions:\n        • Nitrogen (N): ${recommendation.n}\n        • Phosphorus (P): ${recommendation.p}\n        • Potassium (K): ${recommendation.k}\n        • pH Value: ${recommendation.ph}\n        • Rainfall: ${recommendation.rainfall} mm\n        • Temperature: ${recommendation.temperature}°C\n        • Humidity: ${recommendation.humidity}%`;
    
    cropDescription.textContent = description;

    // Scroll to result
    resultCard.scrollIntoView({ behavior: 'smooth' });

    // Trigger confetti animation
    triggerConfetti();
}

// Confetti Animation
function triggerConfetti() {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    document.body.appendChild(confetti);

    // Create confetti particles
    for (let i = 0; i < 100; i++) {
        const particle = document.createElement('div');
        particle.className = 'confetti-particle';
        particle.style.left = Math.random() * 100 + 'vw';
        particle.style.animationDuration = Math.random() * 3 + 2 + 's';
        particle.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 50%)`;
        confetti.appendChild(particle);
    }

    // Remove confetti after animation
    setTimeout(() => {
        confetti.remove();
    }, 5000);
}

// Add smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});
