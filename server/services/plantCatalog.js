const PLANT_CATALOG = [
  {
    id: 'fern',
    name: 'Fern',
    description: 'A calm starter plant with layered fronds and a steady rhythm.',
    unlockCount: 0,
    growthTarget: 12
  },
  {
    id: 'lotus',
    name: 'Lotus',
    description: 'A brighter bloom unlocked after your first fully grown plant.',
    unlockCount: 1,
    growthTarget: 15
  },
  {
    id: 'orchid',
    name: 'Orchid',
    description: 'Elegant and harder to earn, with softer petal growth.',
    unlockCount: 2,
    growthTarget: 18
  },
  {
    id: 'bonsai',
    name: 'Bonsai',
    description: 'Structured, sculptural growth for more experienced gardeners.',
    unlockCount: 4,
    growthTarget: 22
  },
  {
    id: 'moonvine',
    name: 'Moonvine',
    description: 'A rarer luminous plant unlocked by sustained completion.',
    unlockCount: 6,
    growthTarget: 26
  }
];

function getPlantCatalog(plantsFullyGrown = 0) {
  return PLANT_CATALOG.map((plant) => ({
    ...plant,
    unlocked: plantsFullyGrown >= plant.unlockCount
  }));
}

function canUsePlant(plantId, plantsFullyGrown = 0) {
  const plant = PLANT_CATALOG.find((entry) => entry.id === plantId);
  if (!plant) {
    return false;
  }

  return plantsFullyGrown >= plant.unlockCount;
}

function getPlantById(plantId) {
  return PLANT_CATALOG.find((entry) => entry.id === plantId) || PLANT_CATALOG[0];
}

module.exports = {
  PLANT_CATALOG,
  getPlantCatalog,
  canUsePlant,
  getPlantById
};
