/**
 * Cook Islands navigation targets.
 *
 * Bounds are derived from the coastal risk point coordinates in
 * operational_v2_dev/outputs/Risk_results.nc, with padding applied at zoom time.
 */

export const ISLAND_ZOOM_TARGETS = [
  {
    id: 'aitutaki',
    label: 'Aitutaki',
    group: 'Southern Group',
    bounds: {
      southWest: [-18.95958, -159.84839],
      northEast: [-18.81661, -159.72046]
    }
  },
  {
    id: 'atiu',
    label: 'Atiu',
    group: 'Southern Group',
    bounds: {
      southWest: [-20.03314, -158.14807],
      northEast: [-19.95996, -158.07614]
    }
  },
  {
    id: 'mangaia',
    label: 'Mangaia',
    group: 'Southern Group',
    bounds: {
      southWest: [-21.96448, -157.96794],
      northEast: [-21.88503, -157.86827]
    }
  },
  {
    id: 'manihiki',
    label: 'Manihiki',
    group: 'Northern Group',
    bounds: {
      southWest: [-10.46968, -161.04372],
      northEast: [-10.36497, -160.948]
    }
  },
  {
    id: 'manuae',
    label: 'Manuae',
    group: 'Southern Group',
    bounds: {
      southWest: [-19.29588, -158.9776],
      northEast: [-19.24309, -158.90738]
    }
  },
  {
    id: 'mauke',
    label: 'Mauke',
    group: 'Southern Group',
    bounds: {
      southWest: [-20.19441, -157.36664],
      northEast: [-20.12687, -157.31552]
    }
  },
  {
    id: 'mitiaro',
    label: 'Mitiaro',
    group: 'Southern Group',
    bounds: {
      southWest: [-19.90346, -157.72949],
      northEast: [-19.83412, -157.67393]
    }
  },
  {
    id: 'nassau',
    label: 'Nassau',
    group: 'Northern Group',
    bounds: {
      southWest: [-11.57354, -165.42871],
      northEast: [-11.54827, -165.40173]
    }
  },
  {
    id: 'palmerston',
    label: 'Palmerston',
    group: 'Southern Group',
    bounds: {
      southWest: [-18.10049, -163.20435],
      northEast: [-17.9833, -163.10796]
    }
  },
  {
    id: 'penrhyn',
    label: 'Penrhyn',
    group: 'Northern Group',
    bounds: {
      southWest: [-9.09155, -158.06233],
      northEast: [-8.91127, -157.87503]
    }
  },
  {
    id: 'pukapuka',
    label: 'Pukapuka',
    group: 'Northern Group',
    bounds: {
      southWest: [-10.92388, -165.88597],
      northEast: [-10.83926, -165.82535]
    }
  },
  {
    id: 'rakahanga',
    label: 'Rakahanga',
    group: 'Northern Group',
    bounds: {
      southWest: [-10.04332, -161.10999],
      northEast: [-9.9902, -161.07104]
    }
  },
  {
    id: 'rarotonga',
    label: 'Rarotonga',
    group: 'Southern Group',
    bounds: {
      southWest: [-21.28129, -159.83574],
      northEast: [-21.19233, -159.71858]
    }
  },
  {
    id: 'swarrow',
    label: 'Suwarrow',
    group: 'Northern Group',
    bounds: {
      southWest: [-13.3461, -163.207],
      northEast: [-13.19977, -163.03554]
    }
  },
  {
    id: 'takutea',
    label: 'Takutea',
    group: 'Southern Group',
    bounds: {
      southWest: [-19.82262, -158.30331],
      northEast: [-19.80195, -158.27637]
    }
  }
];

export const findIslandZoomTarget = (targetId) => (
  ISLAND_ZOOM_TARGETS.find((target) => target.id === targetId) || null
);
