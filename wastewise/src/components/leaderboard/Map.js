"use client";

import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default icon issue
const customIcon = L.icon({
  iconUrl: "/leaflet/marker-icon.png",
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  shadowUrl: "/leaflet/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const Map = ({ postcode }) => {
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

  useEffect(() => {
    setTimeout(() => {
      window.dispatchEvent(new Event("resize")); // ✅ Forces Leaflet to adjust layout
    }, 500);
  }, []);

  if (!location) return <p>Loading map...</p>;

  return (
    <MapContainer
      center={[location.lat, location.lon]}
      zoom={14}
      style={{ height: "400px", width: "100%" }} // ✅ Ensures visibility
      className="rounded-lg shadow-md"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <Marker position={[location.lat, location.lon]} icon={customIcon}>
        <Popup>Location: {postcode}</Popup>
      </Marker>
    </MapContainer>
  );
};

export default Map;