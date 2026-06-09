import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import PlantPreview from '../components/PlantPreview';
import './Garden.css';

function Garden() {
  const [garden, setGarden] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGarden();
  }, []);

  const fetchGarden = async () => {
    try {
      const response = await api.get('/garden');
      setGarden(response.data);
    } catch (error) {
      console.error('Error fetching garden:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="garden-loading">Preparing the garden archive...</div>;
  }

  if (!garden) {
    return null;
  }

  return (
    <div className="garden-page">
      <div className="garden-width">
        <div className="garden-header">
          <div>
            <span className="garden-kicker">Collected growth</span>
            <h1>Your Garden</h1>
            <p className="garden-subtitle">
              Every fully grown plant is archived here, and each one unlocks rarer species for future rituals.
            </p>
          </div>
          <div className="garden-metrics">
            <div className="garden-metric-card">
              <span>Fully grown plants</span>
              <strong>{garden.plants_fully_grown}</strong>
            </div>
            <div className="garden-metric-card">
              <span>Unlocked species</span>
              <strong>{garden.unlocked_catalog.filter((plant) => plant.unlocked).length}</strong>
            </div>
          </div>
        </div>

        <section className="garden-section">
          <div className="section-heading">
            <span className="garden-kicker">Available plants</span>
            <h2>Plant Selection</h2>
          </div>
          <div className="plant-catalog-grid">
            {garden.unlocked_catalog.map((plant) => (
              <div key={plant.id} className={`catalog-card ${plant.unlocked ? '' : 'locked'}`}>
                <PlantPreview plantType={plant.id} growthStage={plant.growthTarget} showLabel fullBloom />
                <p>{plant.description}</p>
                <span className="unlock-pill">
                  {plant.unlocked
                    ? `${plant.growthTarget} growth points to fully bloom`
                    : `Unlocks at ${plant.unlockCount} full plants`}
                </span>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}

export default Garden;
