const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API endpoint for weather data
app.post('/api/weather', async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    const location = await getGeocoding(latitude, longitude);

    const weatherData = await getWeatherData(latitude, longitude);
    console.log(weatherData);
    res.json({
      location,
      temperature: weatherData.temperature,
      conditions: weatherData.conditions,
      description: weatherData.description,
      icon: weatherData.icon,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// WebSocket for real-time updates
io.on('connection', (socket) => {
  console.log('Client connected');

  const weatherUpdateInterval = setInterval(async () => {
    try {
      const latitude = 28.6274644;
      const longitude = 77.006797;
      const location = await getGeocoding(latitude, longitude);
      const weatherData = await getWeatherData(latitude, longitude);
      const updatedData = {
        location,
        temperature: weatherData.temperature,
        conditions: weatherData.conditions,
        description: weatherData.description,
        icon: weatherData.icon,
      };

      io.emit('weatherUpdate', updatedData);
    } catch (error) {
      console.error('Failed to fetch weather data for real-time update');
    }
  }, 30000);

  socket.on('disconnect', () => {
    console.log('Client disconnected');
    clearInterval(weatherUpdateInterval);
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

async function getGeocoding(latitude, longitude) {
  const response = await axios.get(
    'http://api.openweathermap.org/geo/1.0/reverse',
    {
      params: {
        lat: latitude,
        lon: longitude,
        appid: process.env.OPEN_WEATHER_MAP_API_KEY,
      },
    }
  );

  return response.data[0]?.name || 'Unknown Location';
}

async function getWeatherData(latitude, longitude) {
  const response = await axios.get(
    'https://api.openweathermap.org/data/2.5/weather',
    {
      params: {
        lat: latitude,
        lon: longitude,
        appid: process.env.OPEN_WEATHER_MAP_API_KEY,
      },
    }
  );

  return {
    temperature: response.data.main.temp,
    conditions: response.data.weather[0].main,
    description: response.data.weather[0].description,
    icon: response.data.weather[0].icon,
  };
}
