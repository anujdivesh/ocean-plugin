
import React, { useState, useEffect, useRef } from 'react';
import { Container, Button, Row, Col, Form, Spinner, Badge, Card } from 'react-bootstrap';
import { FaTimes, FaWaveSquare, FaArrowLeft } from 'react-icons/fa';
import Plot from 'react-plotly.js';
import 'chart.js/auto';
import Lottie from 'lottie-react';
import animationData from './live.json';
import './Dashboard.css';
const fixedColors = [
  'rgb(255, 87, 51)',
  'rgb(153, 102, 255)', 
  'rgb(255, 206, 86)', 
  'rgb(54, 162, 235)', 
  'rgb(255, 99, 132)', 
  'rgb(75, 192, 192)', 
];

const countryFlags = {
    'SLB': '/flags/SLB.jpg',
    'FSM': '/flags/FSM.jpg',
    'ASM': '/flags/ASM.png',
    'GUM': '/flags/GUM.png',
    'PLW': '/flags/PLW.jpg',
    'TUV': '/flags/TUV.jpg',
    'NIU':'/flags/NU.jpg'
};

const RealtimeComponent = ({ 
    selectedStations, 
    setDashboardGenerated,
    buoyOptions,
    firstSelection
}) => {
    const [stationData, setStationData] = useState({});
    const [chartData, setChartData] = useState({});
    const [dataLimit, setDataLimit] = useState(30);
    const [liveMode, setLiveMode] = useState(false);
    const refreshIntervalRef = useRef(null);
    
    const REFRESH_INTERVAL = 1800000; // 30 minutes in milliseconds

    function getValueByKey(key) {
        const keyValuePairs = {
            'SPC': 'c3abab55e2e549f02fdb683bd936c7',
            'FMS': 'b9f2c081116e70f44152dd9aa45dcb',
            'KMS': 'e62e5e58efac587d2c7eb4a1d938b0',
            'SamoaMet': 'e5c7ab12898f4414c0acf817b4bbde',
            'TongaMet': '743acb9023dec1ef847d5651596352',
            'TMS': '99a920305541f1c38db611ebab95ba',
            'NMS':'2a348598f294c6b0ce5f7e41e5c0f5'
        };
        return keyValuePairs[key] || null;
    }

    function generateWaveDataUrl(spotterId, token) {
        const baseUrl = "https://api.sofarocean.com/api/wave-data";
        const queryParams = new URLSearchParams({
            spotterId: spotterId,
            token: token,
            includeWindData: false,
            includeDirectionalMoments: true,
            includeSurfaceTempData: true,
            limit: dataLimit,
            includeTrack: true
        });
        return `${baseUrl}?${queryParams.toString()}`;
    }

    useEffect(() => {
        if (selectedStations.length > 0) {
            fetchStationData();
            initializeChartData();
            
            if (liveMode) {
                startRefreshInterval();
            }
        }

        return () => {
            if (refreshIntervalRef.current) {
                clearInterval(refreshIntervalRef.current);
            }
        };
    }, [dataLimit, liveMode]);

    const startRefreshInterval = () => {
        if (refreshIntervalRef.current) {
            clearInterval(refreshIntervalRef.current);
        }
        
        refreshIntervalRef.current = setInterval(() => {
            initializeChartData();
        }, REFRESH_INTERVAL);
    };

    const toggleLiveMode = () => {
        const newLiveMode = !liveMode;
        setLiveMode(newLiveMode);
        
        if (newLiveMode) {
            startRefreshInterval();
        } else if (refreshIntervalRef.current) {
            clearInterval(refreshIntervalRef.current);
            refreshIntervalRef.current = null;
        }
    };

    const fetchStationData = async () => {
        try {
            const dataPromises = selectedStations.map(async (stationId) => {
                const response = await fetch(
                    `https://opmgeoserver.gem.spc.int/geoserver/spc/wfs?service=WFS&version=1.1.0&request=GetFeature&typeNames=spc:wave_buoy_pac&outputFormat=application/json&srsName=EPSG:4326&cql_filter=spotter_id='${stationId}'`
                );
                if (!response.ok) {
                    throw new Error(`Failed to fetch data for station ${stationId}`);
                }
                return response.json();
            });

            const results = await Promise.all(dataPromises);
            const stationDataMap = {};
            
            results.forEach((data, index) => {
                const stationId = selectedStations[index];
                if (data.features && data.features.length > 0) {
                    stationDataMap[stationId] = data.features[0];
                }
            });

            setStationData(stationDataMap);
        } catch (err) {
            console.error('Error fetching station data:', err);
        }
    };

    const fetchWaveData = async (stationId, owner) => {
        try {
            let url;
            if (owner === "PACIOOS") {
                const now = new Date();
                const startDate = new Date(now);
                startDate.setHours(now.getHours() - dataLimit);
                
                const formatDate = (date) => {
                    return date.toISOString().slice(0, 19) + 'Z';
                };
                
                const baseUrl = 'https://erddap.cdip.ucsd.edu/erddap/tabledap/wave_agg.geoJson';
                const parameters = 'station_id,time,waveHs,waveTp,waveTa,waveDp,latitude,longitude';
                const startDateStr = formatDate(startDate);
                const endDateStr = formatDate(now);
                const waveFlagPrimary = 1;
    
                url = `${baseUrl}?${parameters}&station_id="${stationId}"&time>=${startDateStr}&time<=${endDateStr}&waveFlagPrimary=${waveFlagPrimary}`;
            } else {
                const token = getValueByKey(owner);
                url = generateWaveDataUrl(stationId, token);
            }
    
            const res = await fetch(url, {
                method: 'GET',
                credentials: 'omit',
                headers: { 'Accept': 'application/json' },
            });
    
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
    
            return await res.json();
        } catch (error) {
            console.log(`Error fetching wave data:`, error);
            return null;
        }
    };
    
    const initializeChartData = async () => {
        const chartDataMap = {};
        
        for (const stationId of selectedStations) {
            const station = getStationDetails(stationId);
            const data = await fetchWaveData(stationId, station.owner);
            
            if (data) {
                let times, waveHeights, peakPeriods, meanDirections;
                
                if (station.owner === "PACIOOS") {
                    const features = data.features || [];
                    const limitedFeatures = features.slice(-dataLimit);
                    times = limitedFeatures.map(feature => feature.properties.time);
                    waveHeights = limitedFeatures.map(feature => feature.properties.waveHs);
                    peakPeriods = limitedFeatures.map(feature => feature.properties.waveTp);
                    meanDirections = limitedFeatures.map(feature => feature.properties.waveDp);
                } else {
                    const waveData = data.data?.waves || [];
                    times = waveData.map(entry => entry.timestamp);
                    waveHeights = waveData.map(entry => entry.significantWaveHeight);
                    peakPeriods = waveData.map(entry => entry.peakPeriod);
                    meanDirections = waveData.map(entry => entry.meanDirection);
                }
    
                const formattedTimes = times?.map(time => {
                    const date = new Date(time);
                    return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getFullYear()).slice(-2)}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
                }) || [];
    
                chartDataMap[stationId] = {
                    labels: formattedTimes,
                    datasets: [
                        { values: waveHeights || [], label: 'Significant Wave Height (m)' },
                        { values: peakPeriods || [], label: 'Peak Period (s)' },
                        { values: meanDirections || [], label: 'Mean Direction (degrees)' }
                    ],
                    lastUpdated: new Date().toISOString()
                };
            }
        }
    
        setChartData(chartDataMap);
    };

    const renderLiveModeIndicator = () => {
        const station = selectedStations.length > 0 ? getStationDetails(selectedStations[0]) : null;
        const isActive = station?.is_active;

        return (
            <div className="d-flex align-items-center">
                <Form.Check 
                    type="switch"
                    id="live-mode-switch"
                    label=""
                    checked={liveMode}
                    onChange={toggleLiveMode}
                    disabled={!isActive}
                    className="me-2"
                    onClick={(e) => e.currentTarget.blur()}
                    style={{ 
                        fontSize: '0.875rem', marginRight: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        transform: 'scale(1.2)',
                        opacity: isActive ? 1 : 0.6
                      }}
                />
                
                {liveMode && isActive ? (
                    <>
                        <Lottie
                            animationData={animationData}
                            style={{ width: 30, height: 30, marginRight: 5 }}
                            loop={true}
                        />
                        <span className="text-success">Live Mode</span>
                    </>
                ) : (
                    <span style={{ color: isActive ? '#6c757d' : '#dc3545' }}>
                        {isActive ? 'Live Mode (Inactive)' : 'Live Mode Disabled (Station Inactive)'}
                    </span>
                )}
            </div>
        );
    };

    const handleBackToSelection = () => {
        setDashboardGenerated(false);
        document.documentElement.style.overflow = 'auto';
        document.body.style.overflow = 'auto';
    };

    const handleLimitChange = (e) => {
        const newLimit = parseInt(e.target.value);
        if (!isNaN(newLimit)) {
            const clampedLimit = Math.min(1000, Math.max(1, newLimit));
            setDataLimit(clampedLimit);
        }
    };

    const getStationDetails = (stationId) => {
        return buoyOptions.find(b => b.spotter_id === stationId) || {};
    };

    const getGridLayout = () => {
        const count = selectedStations.length;
        
        if (count === 1) {
            return {
                rows: 1,
                colsPerRow: [1],
                className: 'col-12'
            };
        }
        
        // For 2+ buoys, always use 2 rows
        const firstRowCount = Math.ceil(count / 2);
        return {
            rows: 2,
            colsPerRow: [firstRowCount, count - firstRowCount],
            className: [
                `col-md-${Math.floor(12 / firstRowCount)}`,
                `col-md-${Math.floor(12 / (count - firstRowCount))}`
            ]
        };
    };

    const renderChart = (stationId) => {
        const data = chartData[stationId];
        if (!data) {
            return (
                <div style={{ 
                    height: '100%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color:'#0275d8'
                }}>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Loading chart data...
                </div>
            );
        }

        // Prepare Plotly traces
        const traces = data.datasets.map((dataset, index) => {
            const color = fixedColors[index % fixedColors.length];
            let mode = 'lines+markers';
            if (index === 2) mode = 'markers';
            return {
                x: data.labels,
                y: dataset.values,
                name: dataset.label,
                type: 'scatter',
                mode,
                marker: { color },
                line: { color },
                yaxis: index === 0 ? 'y1' : index === 1 ? 'y2' : 'y3',
            };
        });

        const layout = {
            autosize: true,
            height: 300,
            margin: { t: 60, l: 60, r: 60, b: 60 },
            legend: { orientation: 'h', y: 1.15, yanchor: 'bottom', x: 0.5, xanchor: 'center' },
            xaxis: { title: 'Time', tickangle: -45 },
            yaxis: { title: 'Wave Height (m)', side: 'left' },
            yaxis2: {
                title: 'Peak Period (s)',
                overlaying: 'y',
                side: 'right',
                showgrid: false,
                range: [0, 30],
            },
            yaxis3: {
                title: 'Direction (degrees)',
                overlaying: 'y',
                side: 'right',
                position: 1,
                showgrid: false,
                range: [0, 360],
            },
            showlegend: true,
        };

        return (
            <Plot
                data={traces}
                layout={layout}
                useResizeHandler={true}
                style={{ width: '100%', height: '100%' }}
                config={{ responsive: true }}
            />
        );
    };

    const renderCountryFlag = (countryCode) => {
        const flagSrc = countryFlags[countryCode] || '/flags/spc.png';
        return (
            <img 
                src={flagSrc} 
                alt={`${countryCode} flag`} 
                style={{ 
                    width: '80px', 
                    height: '45px', 
                    objectFit: 'cover',
                    marginRight: '10px',
                    border: '1px solid #dee2e6'
                }} 
            />
        );
    };

    const renderGrid = () => {
        const layout = getGridLayout();
        const stations = [...selectedStations];
        
        return (
            <Container fluid className="dashboard-grid" style={{ 
                flex: 1,
                overflow: 'auto',
                marginBottom: '20px'
            }}>
                {Array.from({ length: layout.rows }).map((_, rowIndex) => {
                    const colsInRow = layout.colsPerRow[rowIndex];
                    const className = Array.isArray(layout.className) 
                        ? layout.className[rowIndex]
                        : layout.className;
                    
                    const rowStations = stations.splice(0, colsInRow);
                    
                    return (
                        <Row key={rowIndex} className="g-0" style={{ height: '50%' }}>
                            {rowStations.map((stationId) => {
                                const station = getStationDetails(stationId);
                                const stationFeature = stationData[stationId];
                                const owner = stationFeature?.properties?.owner || station.owner || 'Unknown';
                                const isActive = station?.is_active;
                                const countryCode = station?.country_co || 'SPC';

                                return (
                                    <Col key={stationId} className={`${className} p-2 h-100`}>
                                        <Card className="h-100">
                                            <Card.Header className="d-flex justify-content-between align-items-center">
                                                <div className="d-flex align-items-center">
                                                    {renderCountryFlag(countryCode)}
                                                    <div>
                                                        <FaWaveSquare className="me-2" />
                                                        <strong>{station.label}</strong>
                                                        <div className="small text-muted">
                                                            Owner: {owner} | Last update: {new Date(chartData[stationId]?.lastUpdated || station.latest_date).toLocaleString()}
                                                        </div>
                                                    </div>
                                                </div>
                                                <Badge bg={isActive ? "success" : "danger"}>
                                                    {isActive ? "Active" : "Inactive"}
                                                </Badge>
                                            </Card.Header>
                                            <Card.Body className="d-flex flex-column p-0">
                                                <div className="chart-container flex-grow-1">
                                                    {renderChart(stationId)}
                                                </div>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                );
                            })}
                        </Row>
                    );
                })}
            </Container>
        );
    };

    return (
        <div className="dashboard-view d-flex flex-column" style={{ 
            height: 'calc(100vh - 56px)', // Subtract navbar height
            marginLeft: '-8px',
            marginRight: '-8px',
            overflow: 'hidden'
        }}>
            <div className="dashboard-controls" style={{ 
                    padding: '0.5rem 1rem',
                    background: '#f8f9fa',
                    borderBottom: '1px solid #dee2e6',
                    flexShrink: 0
                }}>
                <div className="d-flex align-items-center gap-3">
                    <Button 
                        variant="outline-secondary" 
                        onClick={handleBackToSelection}
                        className="back-button"
                        style={{ 
                            padding: '0.25rem 0.5rem',
                            fontSize: '0.875rem'
                        }}
                    >
                        <FaArrowLeft className="me-2" style={{marginTop:-2}} />
                        Back to Selection
                    </Button>
                    
                    {renderLiveModeIndicator()}
                    
                    <div className="data-limit-control">
                    <span style={{ fontSize: '0.875rem', marginRight: '8px' }}>Data Points:</span>
                        <Form.Control
                            type="number"
                            value={dataLimit}
                            onChange={handleLimitChange}
                            min="1"
                            max="1000"
                            style={{ 
                                width: '70px',
                                height: '30px',
                                fontSize: '0.875rem',
                                padding: '0.25rem 0.5rem'
                            }}
                        />
                    </div>
                </div>
            </div>
            
            {renderGrid()}

        
        </div>
    );
};

export default RealtimeComponent;