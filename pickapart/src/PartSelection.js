import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

function PartSelection({ user }) {
  const { partType } = useParams();
  const navigate = useNavigate();
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedParts, setSelectedParts] = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [hoveredImage, setHoveredImage] = useState(null);

  const categoryMap = {
    'cpu': 'cpu',
    'cpu-cooler': 'cpu-cooler',
    'motherboard': 'motherboard',
    'memory': 'memory',
    'storage': 'internal-hard-drive',
    'video-card': 'video-card',
    'case': 'case',
    'power-supply': 'power-supply'
  };

  const getDisplayName = (type) => {
    return type.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  // Function to generate image URL based on part name and type
  const getPartImage = (part) => {
    // For demo purposes - in real implementation, you'd use actual image URLs from the API
    const imageMap = {
      'AMD Ryzen 7 9800X3D': 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=300&h=300&fit=crop',
      'AMD Ryzen 7 7800X3D': 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=300&h=300&fit=crop',
      'NVIDIA GeForce RTX 4090': 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=300&h=300&fit=crop',
      'AMD Radeon RX 7900 XTX': 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=300&h=300&fit=crop',
      'Corsair Vengeance RGB 32GB': 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=300&h=300&fit=crop',
      // Add more image mappings as needed
    };
    
    return imageMap[part.name] || `https://via.placeholder.com/300x300/374151/FFFFFF?text=${encodeURIComponent(part.name)}`;
  };

  useEffect(() => {
    const fetchParts = async () => {
      try {
        setLoading(true);
        const category = categoryMap[partType] || partType;
        
        const response = await fetch(`http://localhost:5000/api/real-parts/${category}`);
        const data = await response.json();
        
        // Add image URLs to parts
        const partsWithImages = data.map(part => ({
          ...part,
          image: getPartImage(part)
        }));
        
        setParts(partsWithImages);
      } catch (error) {
        console.error('Error fetching parts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchParts();
  }, [partType]);

  const togglePartSelection = (partId) => {
    const newSelected = new Set(selectedParts);
    if (newSelected.has(partId)) {
      newSelected.delete(partId);
    } else {
      newSelected.add(partId);
    }
    setSelectedParts(newSelected);
  };

  const selectAll = () => {
    if (selectedParts.size === parts.length) {
      setSelectedParts(new Set());
    } else {
      setSelectedParts(new Set(parts.map(part => part.id)));
    }
  };

  const handleAddToBuild = (part) => {
    // Save to localStorage with image
    const currentBuild = JSON.parse(localStorage.getItem('currentBuild') || '{}');
    currentBuild[partType] = {
      ...part,
      type: partType,
      displayName: getDisplayName(partType)
    };
    localStorage.setItem('currentBuild', JSON.stringify(currentBuild));
    
    navigate('/builder');
  };

  if (loading) {
    return (
      <div className="part-selection-page">
        <div className="loading">Loading {getDisplayName(partType)} options...</div>
      </div>
    );
  }

  return (
    <div className="part-selection-page">
      <div className="part-selection-header">
        <button className="back-btn" onClick={() => navigate('/builder')}>
          ← Back to Builder
        </button>
        <div className="header-content">
          <h1>{parts.length} Compatible Products</h1>
          <div className="selection-actions">
            <button className="select-all-btn" onClick={selectAll}>
              {selectedParts.size === parts.length ? 'Select None' : 'Select All'}
            </button>
            <button 
              className="compare-btn" 
              disabled={selectedParts.size < 2}
            >
              Compare Selected ({selectedParts.size})
            </button>
          </div>
        </div>
      </div>

      {!user && (
        <div className="price-alert-banner">
          🔔 Log in to set price alerts and save builds
        </div>
      )}

      {/* Image Preview Overlay */}
      {hoveredImage && (
        <div className="image-preview-overlay">
          <div className="image-preview-container">
            <img src={hoveredImage} alt="Part preview" />
            <button 
              className="close-preview"
              onClick={() => setHoveredImage(null)}
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="parts-table-container">
        <table className="parts-table">
          <thead>
            <tr>
              <th className="select-col">
                <input 
                  type="checkbox"
                  checked={selectedParts.size === parts.length && parts.length > 0}
                  onChange={selectAll}
                />
              </th>
              <th>Image</th>
              <th>Name</th>
              {partType === 'cpu' && (
                <>
                  <th>Core Count</th>
                  <th>Clock Speed</th>
                  <th>Boost Clock</th>
                  <th>Architecture</th>
                  <th>TDP</th>
                  <th>Graphics</th>
                </>
              )}
              <th>Rating</th>
              <th>Price</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {parts.map(part => (
              <tr key={part.id} className={selectedParts.has(part.id) ? 'selected' : ''}>
                <td className="select-col">
                  <input
                    type="checkbox"
                    checked={selectedParts.has(part.id)}
                    onChange={() => togglePartSelection(part.id)}
                  />
                </td>
                <td className="image-col">
                  <div 
                    className="part-image-thumbnail"
                    onMouseEnter={() => setHoveredImage(part.image)}
                    onMouseLeave={() => setHoveredImage(null)}
                  >
                    <img src={part.image} alt={part.name} />
                    <span className="view-image-text">View</span>
                  </div>
                </td>
                <td className="part-name">
                  <strong>{part.name}</strong>
                  <div className="part-brand">{part.brand}</div>
                </td>
                {partType === 'cpu' && (
                  <>
                    <td>{part.coreCount || 'N/A'}</td>
                    <td>{part.clockSpeed || 'N/A'}</td>
                    <td>{part.boostClock || 'N/A'}</td>
                    <td>{part.architecture || 'N/A'}</td>
                    <td>{part.tdp || 'N/A'}</td>
                    <td>{part.graphics || 'N/A'}</td>
                  </>
                )}
                <td className="rating">
                  ⭐ {part.rating || '4.5'}
                </td>
                <td className="price">
                  <strong>{part.price}</strong>
                </td>
                <td className="action">
                  <button 
                    className="add-btn"
                    onClick={() => handleAddToBuild(part)}
                  >
                    Add
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="filters-section">
        <button 
          className="filters-toggle"
          onClick={() => setShowFilters(!showFilters)}
        >
          {showFilters ? '▲' : '▼'} Add From Filter
        </button>
        
        {showFilters && (
          <div className="filters-panel">
            <h3>Filter Options</h3>
            <div className="filter-group">
              <label>Brand:</label>
              <select>
                <option>All Brands</option>
                <option>AMD</option>
                <option>Intel</option>
                <option>NVIDIA</option>
                <option>ASUS</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Price Range:</label>
              <select>
                <option>Any Price</option>
                <option>Under $100</option>
                <option>$100 - $300</option>
                <option>$300 - $500</option>
                <option>Over $500</option>
              </select>
            </div>
            <button className="apply-filters">Apply Filters</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default PartSelection;