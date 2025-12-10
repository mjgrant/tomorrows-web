import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function BuildSummary({ user }) {
  const navigate = useNavigate();
  const [currentBuild, setCurrentBuild] = useState({});

  const partTypes = [
    { key: 'cpu', name: 'CPU' },
    { key: 'cpu-cooler', name: 'CPU Cooler' },
    { key: 'motherboard', name: 'Motherboard' },
    { key: 'memory', name: 'Memory' },
    { key: 'storage', name: 'Storage' },
    { key: 'video-card', name: 'Video Card' },
    { key: 'case', name: 'Case' },
    { key: 'power-supply', name: 'Power Supply' },
    { key: 'operating-system', name: 'Operating System' },
    { key: 'peripherals', name: 'Peripherals' },
    { key: 'expansion-cards', name: 'Expansion Cards' },
    { key: 'accessories-other', name: 'Accessories / Other' },
  ];

  useEffect(() => {
    // Load current build from localStorage
    const savedBuild = JSON.parse(localStorage.getItem('currentBuild') || '{}');
    setCurrentBuild(savedBuild);
  }, []);

  const handlePartClick = (partKey) => {
    navigate(`/parts/${partKey}`);
  };

  const removePart = (partKey) => {
    const newBuild = { ...currentBuild };
    delete newBuild[partKey];
    setCurrentBuild(newBuild);
    localStorage.setItem('currentBuild', JSON.stringify(newBuild));
  };

  const calculateTotal = () => {
    return Object.values(currentBuild).reduce((total, part) => {
      const price = parseFloat(part.price?.replace('$', '').replace(',', '')) || 0;
      return total + price;
    }, 0);
  };

  return (
    <>
      <main className="builder-page">
        <h2 className="builder-title">Build Summary</h2>

        <div className="builder-grid">
          {partTypes.map((part) => {
            const selectedPart = currentBuild[part.key];
            
            return (
              <div 
                key={part.key} 
                className={`builder-card ${selectedPart ? 'has-part' : ''} clickable-part`}
                onClick={() => handlePartClick(part.key)}
              >
                {selectedPart ? (
                  <div className="selected-part-content">
                    <div className="part-image-container">
                      <img 
                        src={selectedPart.image} 
                        alt={selectedPart.name}
                        className="part-image"
                      />
                    </div>
                    <div className="part-details">
                      <h3 className="part-name">{selectedPart.name}</h3>
                      <p className="part-price">{selectedPart.price}</p>
                    </div>
                    <button 
                      className="remove-part-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        removePart(part.key);
                      }}
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div className="empty-part-content">
                    {part.name}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="builder-summary">
          <p className="total">Total: <span>${calculateTotal().toFixed(2)}</span></p>
          <button className="checkout-btn">Check Out</button>
        </div>
      </main>

      <footer>
        <p>© 2025 PickAPart | For Academic Purposes Only</p>
      </footer>
    </>
  );
}

export default BuildSummary;