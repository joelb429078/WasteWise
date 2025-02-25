"use client";

import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const Map = ({ postcode, maxHeight = "max-h-80", width = "max-w-xl" }) => {
  const [location, setLocation] = useState(null);

  useEffect(() => {
    const fetchCoordinates = async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${postcode}`
        );
        const data = await response.json();
        if (data.length > 0) {
          setLocation({ lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) });
        }
      } catch (error) {
        console.error("Error fetching location:", error);
      }
    };
    fetchCoordinates();
  }, [postcode]);

  if (!location) return <p>Loading map...</p>;

  return (
    <MapContainer
      center={[location.lat, location.lon]}
      zoom={14}
      className={`max-w-xl max-h-80 rounded-lg shadow-md`}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <Marker position={[location.lat, location.lon]}>
        <Popup>Location: {postcode}</Popup>
      </Marker>
    </MapContainer>
  );
};

export default Map;