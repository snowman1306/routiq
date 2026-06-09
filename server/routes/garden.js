const express = require('express');
const { pool } = require('../database/init');
const authenticate = require('../middleware/auth');
const { getPlantCatalog } = require('../services/plantCatalog');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const userResult = await pool.query(
      'SELECT plants_fully_grown FROM users WHERE id = $1',
      [req.user.id]
    );

    const plantsFullyGrown = userResult.rows[0]?.plants_fully_grown || 0;

    const gardenResult = await pool.query(
      `SELECT id, habit_id, habit_name, plant_type, milestone_number, reward_given, grown_at
       FROM garden_plants
       WHERE user_id = $1
       ORDER BY grown_at DESC`,
      [req.user.id]
    );

    res.json({
      plants_fully_grown: plantsFullyGrown,
      unlocked_catalog: getPlantCatalog(plantsFullyGrown),
      garden_plants: gardenResult.rows
    });
  } catch (error) {
    console.error('Get garden error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/greenhouse', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    // Collection-level aggregates
    const aggregateResult = await pool.query(
      `SELECT
        COUNT(*) as total_blooms,
        COUNT(DISTINCT plant_type) as species_cultivated,
        MIN(grown_at) as earliest_bloom,
        MAX(grown_at) as latest_bloom
      FROM garden_plants
      WHERE user_id = $1`,
      [userId]
    );

    // Species summary
    const speciesResult = await pool.query(
      `SELECT plant_type, COUNT(*) as count
      FROM garden_plants
      WHERE user_id = $1
      GROUP BY plant_type`,
      [userId]
    );

    const speciesSummary = {};
    speciesResult.rows.forEach(row => {
      speciesSummary[row.plant_type] = parseInt(row.count, 10);
    });

    // Most cultivated habit
    const mostCultivatedResult = await pool.query(
      `SELECT COALESCE(habit_name, 'Archived Ritual') as habit_name, COUNT(*) as bloom_count
      FROM garden_plants
      WHERE user_id = $1
      GROUP BY habit_name
      ORDER BY bloom_count DESC
      LIMIT 1`,
      [userId]
    );

    const collection = {
      total_blooms: parseInt(aggregateResult.rows[0].total_blooms, 10) || 0,
      species_cultivated: parseInt(aggregateResult.rows[0].species_cultivated, 10) || 0,
      species_summary: speciesSummary,
      earliest_bloom: aggregateResult.rows[0].earliest_bloom,
      latest_bloom: aggregateResult.rows[0].latest_bloom,
      most_cultivated: mostCultivatedResult.rows[0] ? {
        habit_name: mostCultivatedResult.rows[0].habit_name,
        bloom_count: parseInt(mostCultivatedResult.rows[0].bloom_count, 10)
      } : null
    };

    // All specimens grouped by habit
    const specimensResult = await pool.query(
      `SELECT
        id, habit_id, COALESCE(habit_name, 'Archived Ritual') as habit_name,
        plant_type, milestone_number, reward_given, grown_at,
        COALESCE(growth_cycle_number, 1) as growth_cycle_number,
        COALESCE(growth_stage_reached, 0) as growth_stage_reached
      FROM garden_plants
      WHERE user_id = $1
      ORDER BY habit_name, grown_at DESC`,
      [userId]
    );

    const wingsMap = new Map();
    specimensResult.rows.forEach(row => {
      if (!wingsMap.has(row.habit_name)) {
        wingsMap.set(row.habit_name, {
          habit_name: row.habit_name,
          habit_id: row.habit_id,
          primary_species: row.plant_type,
          bloom_count: 0,
          latest_bloom_at: row.grown_at,
          specimens: []
        });
      }
      const wing = wingsMap.get(row.habit_name);
      wing.bloom_count += 1;
      wing.specimens.push(row);
      // Update latest_bloom_at if this specimen is newer
      if (new Date(row.grown_at) > new Date(wing.latest_bloom_at)) {
        wing.latest_bloom_at = row.grown_at;
      }
    });

    // We want the wings ordered by latest_bloom_at DESC
    const wings = Array.from(wingsMap.values()).sort(
      (a, b) => new Date(b.latest_bloom_at) - new Date(a.latest_bloom_at)
    );

    res.json({
      collection,
      wings
    });
  } catch (error) {
    console.error('Get greenhouse error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
