/**
 * World-Class Multi-Island Comparison Dashboard
 * 
 * Displays side-by-side comparison of forecast data across selected islands
 */

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Card, Row, Col, Table, Badge, Alert } from 'react-bootstrap';
import multiIslandManager from '../services/MultiIslandManager';
import logger from '../utils/logger';
import './IslandComparisonDashboard.css';

const IslandComparisonDashboard = ({ comparisonIslands, inundationData }) => {
  const [comparisonData, setComparisonData] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (comparisonIslands && comparisonIslands.length > 0) {
      generateComparisonData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comparisonIslands, inundationData]);

  const generateComparisonData = () => {
    const data = comparisonIslands.map(island => {
      const profile = multiIslandManager.getIslandProfile(island.name);
      const inundationPoints = inundationData?.filter(point => 
        point.location?.toLowerCase().includes(island.name.toLowerCase())
      ) || [];

      return {
        island: island.name,
        profile,
        inundation: {
          count: inundationPoints.length,
          maxDepth: inundationPoints.length > 0 
            ? Math.max(...inundationPoints.map(p => p.depth))
            : 0,
          avgDepth: inundationPoints.length > 0
            ? inundationPoints.reduce((sum, p) => sum + p.depth, 0) / inundationPoints.length
            : 0,
          highRisk: inundationPoints.filter(p => p.depth >= 0.6).length
        },
        coordinates: {
          lat: island.lat,
          lon: island.lon
        }
      };
    });

    setComparisonData(data);
    calculateStats(data);
    logger.info('COMPARISON', `Comparing ${data.length} islands`, data);
  };

  const calculateStats = (data) => {
    const stats = {
      totalInundationPoints: data.reduce((sum, d) => sum + d.inundation.count, 0),
      highestRisk: data.reduce((max, d) => 
        d.inundation.highRisk > max.count ? { island: d.island, count: d.inundation.highRisk } : max,
        { island: '', count: 0 }
      ),
      avgInundationDepth: data.reduce((sum, d) => sum + d.inundation.avgDepth, 0) / data.length
    };

    setStats(stats);
  };

  const getRiskLevel = (depth) => {
    if (depth < 0.3) return { level: 'Low', color: 'primary' };
    if (depth < 0.6) return { level: 'Medium', color: 'warning' };
    return { level: 'High', color: 'danger' };
  };

  if (!comparisonIslands || comparisonIslands.length === 0) {
    return (
      <Alert variant="info">
        <strong>No islands selected for comparison</strong>
        <p className="mb-0 mt-2">Enable comparison mode and select islands to view comparative analysis.</p>
      </Alert>
    );
  }

  return (
    <div className="island-comparison-dashboard">
      <Card className="mb-3">
        <Card.Header className="bg-primary text-white">
          <h5 className="mb-0">🏝️ Multi-Island Comparison Dashboard</h5>
        </Card.Header>
        <Card.Body>
          {/* Summary Stats */}
          {stats && (
            <Row className="mb-4">
              <Col md={4}>
                <Card className="text-center">
                  <Card.Body>
                    <h6>Total Inundation Points</h6>
                    <h2 className="text-primary">{stats.totalInundationPoints}</h2>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={4}>
                <Card className="text-center">
                  <Card.Body>
                    <h6>Highest Risk Island</h6>
                    <h2 className="text-danger">{stats.highestRisk.island || 'N/A'}</h2>
                    <Badge bg="danger">{stats.highestRisk.count} high-risk points</Badge>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={4}>
                <Card className="text-center">
                  <Card.Body>
                    <h6>Avg Inundation Depth</h6>
                    <h2 className="text-warning">{stats.avgInundationDepth.toFixed(2)}m</h2>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          )}

          {/* Detailed Comparison Table */}
          <Table striped bordered hover responsive>
            <thead className="table-dark">
              <tr>
                <th>Island</th>
                <th>Region</th>
                <th>Coordinates</th>
                <th>Inundation Points</th>
                <th>Max Depth</th>
                <th>Avg Depth</th>
                <th>High Risk Points</th>
                <th>Health Status</th>
              </tr>
            </thead>
            <tbody>
              {comparisonData.map((data, index) => {
                const riskInfo = getRiskLevel(data.inundation.maxDepth);
                return (
                  <tr key={index}>
                    <td>
                      <strong>{data.island}</strong>
                      {data.profile?.isCapital && (
                        <Badge bg="warning" className="ms-2">Capital</Badge>
                      )}
                    </td>
                    <td>
                      <Badge bg="info">{data.profile?.region || 'N/A'}</Badge>
                    </td>
                    <td className="text-muted small">
                      {data.coordinates.lat.toFixed(3)}°S, {data.coordinates.lon.toFixed(3)}°E
                    </td>
                    <td className="text-center">
                      <Badge bg="secondary">{data.inundation.count}</Badge>
                    </td>
                    <td className="text-center">
                      <Badge bg={riskInfo.color}>{data.inundation.maxDepth.toFixed(2)}m</Badge>
                    </td>
                    <td className="text-center">
                      {data.inundation.avgDepth.toFixed(2)}m
                    </td>
                    <td className="text-center">
                      <Badge bg="danger">{data.inundation.highRisk}</Badge>
                    </td>
                    <td className="text-center">
                      <Badge bg={data.profile?.health?.status === 'excellent' ? 'success' : 'warning'}>
                        {data.profile?.health?.status || 'Unknown'}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>

          {/* Nearest Islands Info */}
          <Row className="mt-4">
            {comparisonData.map((data, index) => (
              <Col md={6} key={index} className="mb-3">
                <Card>
                  <Card.Header>
                    <strong>{data.island}</strong> - Nearest Atolls
                  </Card.Header>
                  <Card.Body>
                    {data.profile?.nearestIslands?.length > 0 ? (
                      <ul className="mb-0">
                        {data.profile.nearestIslands.map((nearest, i) => (
                          <li key={i}>
                            <strong>{nearest.island.name}</strong> - {nearest.distance} km away
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted mb-0">No nearby island data available</p>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Card.Body>
      </Card>
    </div>
  );
};

IslandComparisonDashboard.propTypes = {
  comparisonIslands: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string.isRequired,
    lat: PropTypes.number.isRequired,
    lon: PropTypes.number.isRequired,
    dataset: PropTypes.string,
    isCapital: PropTypes.bool
  })),
  inundationData: PropTypes.arrayOf(PropTypes.shape({
    location: PropTypes.string,
    depth: PropTypes.number,
    lat: PropTypes.number,
    lon: PropTypes.number
  }))
};

export default IslandComparisonDashboard;
