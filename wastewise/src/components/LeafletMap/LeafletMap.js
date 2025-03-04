// components/LeafletMap.js
import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom CSS for LeafletMap
const mapStyles = `
  .custom-marker-gold {
    filter: drop-shadow(0 0 6px rgba(255, 215, 0, 0.7));
  }
  .custom-marker-silver {
    filter: drop-shadow(0 0 6px rgba(192, 192, 192, 0.7));
  }
  .custom-marker-bronze {
    filter: drop-shadow(0 0 6px rgba(205, 127, 50, 0.7));
  }
  .custom-marker-green {
    filter: drop-shadow(0 0 5px rgba(76, 175, 80, 0.6));
  }
  .custom-marker-blue {
    filter: drop-shadow(0 0 5px rgba(33, 150, 243, 0.6));
  }
  .custom-marker-default {
    filter: drop-shadow(0 0 4px rgba(117, 117, 117, 0.5));
  }
  
  .leaflet-popup-content-wrapper {
    border-radius: 10px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    border: 1px solid rgba(76, 175, 80, 0.2);
    padding: 0;
    overflow: hidden;
  }
  
  .leaflet-popup-content {
    margin: 0;
    padding: 0;
  }
  
  .custom-popup {
    padding: 0;
  }
  
  .custom-popup-header {
    background: linear-gradient(to right, #4CAF50, #43A047);
    color: white;
    padding: 8px 12px;
    font-weight: bold;
    font-size: 14px;
    border-bottom: 1px solid #388E3C;
  }
  
  .custom-popup-content {
    padding: 10px 12px;
  }
  
  .custom-popup-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 6px;
  }
  
  .custom-popup-label {
    color: #757575;
    font-size: 12px;
  }
  
  .custom-popup-value {
    font-weight: 600;
    color: #212121;
    font-size: 13px;
  }
  
  .custom-popup-rank-1 {
    color: #FFD700;
  }
  
  .custom-popup-rank-2 {
    color: #C0C0C0;
  }
  
  .custom-popup-rank-3 {
    color: #CD7F32;
  }

  .leaflet-container {
    border-radius: 8px;
    border: 1px solid rgba(0, 0, 0, 0.1);
  }
`;

// Add custom map tile styles
const MAP_STYLES = {
  default: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  voyager: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  terrain: 'https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}{r}.png',
};

const MAP_ATTRIBUTIONS = {
  default: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  light: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attribution">CARTO</a>',
  dark: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attribution">CARTO</a>',
  voyager: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attribution">CARTO</a>',
  satellite: '&copy; <a href="https://www.esri.com/">Esri</a>',
  terrain: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. Data by <a href="http://openstreetmap.org">OpenStreetMap</a>, under <a href="http://creativecommons.org/licenses/by-sa/3.0">CC BY SA</a>',
};

// Create custom marker icons
const createCustomIcon = (rank) => {
  // Define marker color and class based on rank
  let iconUrl, iconClass;
  
  if (rank === 1) {
    iconUrl = '/images/marker-gold.png'; // You'll need to add these custom marker images to your public folder
    iconClass = 'custom-marker-gold';
  } else if (rank === 2) {
    iconUrl = '/images/marker-silver.png';
    iconClass = 'custom-marker-silver';
  } else if (rank === 3) {
    iconUrl = '/images/marker-bronze.png';
    iconClass = 'custom-marker-bronze';
  } else if (rank <= 10) {
    iconUrl = '/images/marker-green.png';
    iconClass = 'custom-marker-green';
  } else if (rank <= 20) {
    iconUrl = '/images/marker-blue.png';
    iconClass = 'custom-marker-blue';
  } else {
    iconUrl = '/images/marker-default.png';
    iconClass = 'custom-marker-default';
  }
  
  // Fallback to standard Leaflet markers if custom markers aren't available
  return new L.Icon({
    iconUrl: iconUrl || 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
    shadowAnchor: [12, 41],
    className: iconClass
  });
};

// Custom popup content
const createCustomPopupContent = (point) => {
  const getRankClass = (rank) => {
    if (rank === 1) return 'custom-popup-rank-1';
    if (rank === 2) return 'custom-popup-rank-2';
    if (rank === 3) return 'custom-popup-rank-3';
    return '';
  };

  return `
    <div class="custom-popup">
      <div class="custom-popup-header">
        ${point.name}
      </div>
      <div class="custom-popup-content">
        <div class="custom-popup-row">
          <span class="custom-popup-label">Rank</span>
          <span class="custom-popup-value ${getRankClass(point.rank)}">
            #${point.rank}
          </span>
        </div>
        <div class="custom-popup-row">
          <span class="custom-popup-label">Waste</span>
          <span class="custom-popup-value">${point.waste} kg</span>
        </div>
        ${point.change ? `
        <div class="custom-popup-row">
          <span class="custom-popup-label">Change</span>
          <span class="custom-popup-value">${point.change > 0 ? '+' : ''}${point.change}</span>
        </div>
        ` : ''}
      </div>
    </div>
  `;
};

const LeafletMap = ({ 
  points = [],
  mapStyle = 'voyager',
  height = '100%',
  showCircles = true,
  highlightUserBusiness = true,
  userBusinessId = null,
  initialZoom = 2
}) => {
  const [isClient, setIsClient] = useState(false);
  const [selectedMapStyle, setSelectedMapStyle] = useState(mapStyle);
  const mapRef = useRef(null);
  
  // Fix Leaflet icon issue and add custom styles
  useEffect(() => {
    // Fix for default markers not showing in production
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    });
    
    // Add custom styles to document
    const styleElement = document.createElement('style');
    styleElement.innerHTML = mapStyles;
    document.head.appendChild(styleElement);
    
    setIsClient(true);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);
  
  // Function to fit map bounds to all points
  const fitBoundsToPoints = () => {
    if (mapRef.current && points.length > 0) {
      const map = mapRef.current;
      
      // Create bounds from all points
      const bounds = L.latLngBounds(points.map(p => p.position));
      
      // Fit map to bounds with padding
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  };
  
  // Effect to fit bounds when points change
  useEffect(() => {
    if (isClient && points.length > 0) {
      // Small delay to ensure map is fully loaded
      setTimeout(fitBoundsToPoints, 100);
    }
  }, [isClient, points]);
  
  // Calculate map center based on points
  const getMapCenter = () => {
    if (!points || points.length === 0) {
      return [20, 0]; // Default: Center of the world
    }
    
    // Calculate average of all coordinates
    const sumLat = points.reduce((sum, point) => sum + point.position[0], 0);
    const sumLng = points.reduce((sum, point) => sum + point.position[1], 0);
    
    return [sumLat / points.length, sumLng / points.length];
  };
  
  // Get tile style and attribution
  const getTileUrl = () => MAP_STYLES[selectedMapStyle] || MAP_STYLES.default;
  const getTileAttribution = () => MAP_ATTRIBUTIONS[selectedMapStyle] || MAP_ATTRIBUTIONS.default;
  
  // Only render the map on the client
  if (!isClient) {
    return (
      <div className="h-full w-full bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-gray-500">Loading map...</div>
      </div>
    );
  }
  
  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={getMapCenter()}
        zoom={initialZoom}
        style={{ height, width: '100%' }}
        scrollWheelZoom={true}
        zoomControl={false}
        whenCreated={mapInstance => {
          mapRef.current = mapInstance;
        }}
      >
        <TileLayer
          attribution={getTileAttribution()}
          url={getTileUrl()}
        />
        
        <ZoomControl position="bottomright" />
        
        {/* Map Style Selector */}
        <div className="leaflet-top leaflet-right">
          <div className="leaflet-control leaflet-bar bg-white shadow-md rounded-md overflow-hidden p-1 m-2">
            <select 
              className="text-xs py-1 px-2 bg-transparent border-none focus:outline-none"
              value={selectedMapStyle}
              onChange={(e) => setSelectedMapStyle(e.target.value)}
            >
              <option value="voyager">Default</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="satellite">Satellite</option>
              <option value="terrain">Terrain</option>
            </select>
          </div>
        </div>
        
        {/* Render points with circles */}
        {points.map((point) => (
          <React.Fragment key={point.id}>
            <Marker
              position={point.position}
              icon={createCustomIcon(point.rank)}
            >
              <Popup>
                <div dangerouslySetInnerHTML={{ 
                  __html: createCustomPopupContent(point) 
                }} />
              </Popup>
            </Marker>
            
            {/* Optional circles around markers */}
            {showCircles && (
              <Circle
                center={point.position}
                radius={point.rank <= 3 ? 80000 : point.rank <= 10 ? 60000 : 40000}
                pathOptions={{
                  color: point.rank === 1 ? '#FFD700' : 
                         point.rank === 2 ? '#C0C0C0' : 
                         point.rank === 3 ? '#CD7F32' : 
                         point.rank <= 10 ? '#4CAF50' : 
                         '#2196F3',
                  fillColor: point.rank === 1 ? '#FFD700' : 
                            point.rank === 2 ? '#C0C0C0' : 
                            point.rank === 3 ? '#CD7F32' : 
                            point.rank <= 10 ? '#4CAF50' : 
                            '#2196F3',
                  fillOpacity: highlightUserBusiness && point.id === userBusinessId ? 0.4 : 0.2,
                  weight: highlightUserBusiness && point.id === userBusinessId ? 3 : 1
                }}
              />
            )}
          </React.Fragment>
        ))}
      </MapContainer>
    </div>
  );
};

export default LeafletMap;