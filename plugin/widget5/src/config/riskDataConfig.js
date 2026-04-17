const publicBaseUrl = process.env.PUBLIC_URL || '';

export const RISK_DATA_CONFIG = {
  version: '1.0',
  basePath: `${publicBaseUrl}/data/risk`,
  pointsFile: 'points.json',
  detailsDirectory: 'details',
  representativeZoomThreshold: 10
};

export const getRiskPointsUrl = () => (
  `${RISK_DATA_CONFIG.basePath}/${RISK_DATA_CONFIG.pointsFile}`
);

export const getRiskDetailsUrl = (pointId) => (
  `${RISK_DATA_CONFIG.basePath}/${RISK_DATA_CONFIG.detailsDirectory}/${pointId}.json`
);
