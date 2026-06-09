export const PLANT_CATALOG = [
  {
    id: 'fern',
    name: 'Fern',
    description: 'A calm starter plant with layered fronds.',
    unlockCount: 0,
    growthTarget: 12
  },
  {
    id: 'lotus',
    name: 'Lotus',
    description: 'A brighter bloom unlocked after your first full plant.',
    unlockCount: 1,
    growthTarget: 15
  },
  {
    id: 'orchid',
    name: 'Orchid',
    description: 'An elegant bloom with softer petals and richer color.',
    unlockCount: 2,
    growthTarget: 18
  },
  {
    id: 'bonsai',
    name: 'Bonsai',
    description: 'Structured, sculptural growth for disciplined gardeners.',
    unlockCount: 4,
    growthTarget: 22
  },
  {
    id: 'moonvine',
    name: 'Moonvine',
    description: 'A luminous rarer plant unlocked by sustained completion.',
    unlockCount: 6,
    growthTarget: 26
  }
];

export function getPlantById(id) {
  return PLANT_CATALOG.find((plant) => plant.id === id) || PLANT_CATALOG[0];
}
