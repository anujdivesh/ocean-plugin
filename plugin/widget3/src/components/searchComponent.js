import React, { useEffect, useState, useRef, lazy, Suspense } from 'react';
import { Container, Button, Form, Spinner, Badge, Alert } from 'react-bootstrap';
import { FaTimes, FaArrowRight } from 'react-icons/fa';
import Lottie from 'lottie-react';
import animationData from './live.json';

const MapWithNoSSR = lazy(() => import('./realtime_search_map'));

export default function SearchComponent({
    selectedStations,
    setSelectedStations,
    buoyOptions,
    setBuoyOptions,
    loading,
    setLoading,
    error,
    setError,
    setDashboardGenerated
}) {
    const MAX_SELECTION = 8;
    const [monitoringTypes, setMonitoringTypes] = useState([]); // list of {id,value}
    const [typesLoading, setTypesLoading] = useState(false);
    const [typesError, setTypesError] = useState(null);
    const [allStations, setAllStations] = useState([]); // unfiltered station list
    const [selectedTypeFilters, setSelectedTypeFilters] = useState([]); // array of type value strings

    // Avoid duplicate fetch in React 18 StrictMode (dev) using a ref flag
    const fetchedTypesRef = useRef(false);
    // Fetch monitoring types list (once)
    useEffect(() => {
        if (fetchedTypesRef.current) return; // guard duplicate in StrictMode
        fetchedTypesRef.current = true;
        const fetchTypes = async () => {
            setTypesLoading(true);
            setTypesError(null);
            try {
                const res = await fetch('https://ocean-obs-api.spc.int/insitu/types/');
                if(!res.ok) throw new Error('Failed to fetch monitoring types');
                const data = await res.json();
                setMonitoringTypes(data);
            } catch(e){
                setTypesError(e.message);
            } finally {
                setTypesLoading(false);
            }
        };
        fetchTypes();
    }, []);

    // When monitoring types load the first time, select all so UI reflects "all shown"
    useEffect(() => {
        if (monitoringTypes.length && selectedTypeFilters.length === 0) {
            setSelectedTypeFilters(monitoringTypes.map(t => t.value));
        }
    }, [monitoringTypes, selectedTypeFilters]);

    const fetchedStationsRef = useRef(false);
    useEffect(() => {
        if (fetchedStationsRef.current) return; // guard duplicate in StrictMode
        fetchedStationsRef.current = true;
        const fetchStations = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch('https://ocean-obs-api.spc.int/insitu/stations/');
                if(!res.ok) throw new Error('Failed to fetch stations');
                const data = await res.json();
                const active = data.filter(s => s.is_active);
                // Do NOT pre-fetch countries; defer until station selection (lazy load)
                const mapped = active.map(s => ({
                    id: s.id, // numeric station id needed for timeseries endpoint
                    spotter_id: s.station_id,
                    label: `${s.type_value} - ${s.display_name || s.station_id}`,
                    coordinates: [s.longitude, s.latitude],
                    latest_date: null,
                    owner: s.owner,
                    country_id: s.country_id,
                    country_short: null, // will be filled on demand
                    is_active: s.is_active,
                    type_value: s.type_value,
                    description: s.description
                }));
                setAllStations(mapped);
                setBuoyOptions(mapped);
            } catch(e){
                setError(e.message);
            } finally {
                setLoading(false);
            }
        };
        fetchStations();
    }, [setBuoyOptions, setLoading, setError]);

    // Cache for fetched country short names to avoid duplicate requests
    const [countryCache, setCountryCache] = useState({});
    const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 768 : false));

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Lazy fetch country short_name only when a station is selected and missing its country_short
    useEffect(() => {
        if (!selectedStations.length) return;
        const selectedStationObjs = allStations.filter(s => selectedStations.includes(s.spotter_id));
        const missing = selectedStationObjs.filter(s => s.country_id && !s.country_short);
        const neededCountryIds = [...new Set(missing.map(m => m.country_id).filter(id => !(id in countryCache)))];
        if (!neededCountryIds.length) return;

        let aborted = false;
        (async () => {
            try {
                const responses = await Promise.all(neededCountryIds.map(id => fetch(`https://ocean-middleware.spc.int/middleware/api/country/${id}/`).then(r => r.ok ? r.json() : null).catch(()=>null)));
                if (aborted) return;
                const newCache = { ...countryCache };
                responses.forEach(c => { if (c?.id) newCache[c.id] = (c.short_name || '').toUpperCase(); });
                setCountryCache(newCache);
                if (Object.keys(newCache).length) {
                    setAllStations(prev => prev.map(s => (s.country_id && newCache[s.country_id] && !s.country_short) ? { ...s, country_short: newCache[s.country_id] } : s));
                    setBuoyOptions(prev => prev.map(s => (s.country_id && newCache[s.country_id] && !s.country_short) ? { ...s, country_short: newCache[s.country_id] } : s));
                }
            } catch { /* silent */ }
        })();
        return () => { aborted = true; };
    }, [selectedStations, allStations, countryCache, setAllStations, setBuoyOptions]);

    // Recompute filtered stations when type filters change
    useEffect(() => {
        if (!selectedTypeFilters.length) {
            // Only show active stations
            const activeStations = allStations.filter(s => s.is_active);
            setBuoyOptions(activeStations);
            return;
        }
        // Filter by type and ensure only active stations are shown
        const filtered = allStations.filter(s => s.is_active && selectedTypeFilters.includes(s.type_value));
        setBuoyOptions(filtered);
        setSelectedStations(prev => prev.filter(id => filtered.some(f => f.spotter_id === id)));
    }, [selectedTypeFilters, allStations, setBuoyOptions, setSelectedStations]);

    const toggleTypeFilter = (value) => {
        setSelectedTypeFilters(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
    };


    // Helper: determine color for a given monitoring type (by id or value)
    const getTypeColor = (typeIdOrValue) => {
        let id = typeof typeIdOrValue === 'number' ? typeIdOrValue : undefined;
        if (id === undefined && typeIdOrValue) {
            const mt = monitoringTypes.find(m => m.value === typeIdOrValue);
            id = mt?.id;
        }
        let circleColor = "#01dddd"; // default
        if (id === 3) {
            circleColor = "#3f51b5"; // light purple
        } else if (id === 4) {
            circleColor = "#fe7e0f"; // orange
        }
        return circleColor;
    };

    // Consistent circle size/style across UI
    const CIRCLE_SIZE = 12;
    const circleBaseStyle = {
        display: 'inline-block',
        width: CIRCLE_SIZE,
        height: CIRCLE_SIZE,
        borderRadius: '50%',
        border: '1.5px solid #fff',
        boxShadow: '0 0 2px rgba(0,0,0,0.2)',
        flexShrink: 0
    };


    const removeStation = id => setSelectedStations(selectedStations.filter(s=>s!==id));
    const handleSubmit = () => setDashboardGenerated(true);
    const getStationDetails = id => buoyOptions.find(b=>b.spotter_id===id)||{};

    // Defensive clamp: ensure we never exceed MAX_SELECTION even if future code tries to push more.
    useEffect(() => {
        if (selectedStations.length > MAX_SELECTION) {
            setSelectedStations(prev => prev.slice(0, MAX_SELECTION));
        }
    }, [selectedStations, setSelectedStations]);

    return (
        <Container
            fluid
            className="py-3 px-3"
            style={{
                maxWidth:'100%',
                paddingLeft:'0.75rem',
                paddingRight:'0.75rem',
                paddingTop: isMobile ? '0.75rem' : '1.5rem',
                scrollMarginTop: '70px'
            }}
        >
            <div
                className="d-flex justify-content-between align-items-center mb-4"
                style={{flexWrap: isMobile ? 'wrap' : 'nowrap', gap: isMobile ? '1rem' : '0'}}
            >
                <div className="d-flex align-items-center gap-2" style={{flex: isMobile ? '1 0 100%' : '0 0 auto'}}>
                    <Lottie
                        animationData={animationData}
                        style={{ width: 30, height: 30 }}
                        loop={true}
                    />
                    <h1 className="mb-0" style={{color:'var(--color-primary)'}}>Real-Time Ocean Monitoring</h1>
                </div>
                <Button
                    className="btn-theme-primary generate-btn"
                    onClick={handleSubmit}
                    disabled={!selectedStations.length || loading}
                    style={{width: isMobile ? '100%' : 'auto'}}
                >
                                        {loading ? (
                                                <>
                                                    <Spinner animation="border" size="sm" className="me-2"/>Generating...
                                                </>
                                        ) : (
                                                <>
                                                    <span style={{position:'relative',zIndex:2}}>Generate Dashboard</span>
                                                    <FaArrowRight size={16} className="ms-2 arrow-slide"/>
                                                </>
                                        )}
                                </Button>
            </div>
            <div
                className="mb-4"
                style={{
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    gap: isMobile ? '1.75rem' : '3.5rem',
                    alignItems: isMobile ? 'stretch' : 'flex-start',
                    justifyContent: 'flex-start'
                }}
            >
                <div
                    style={{
                        width: isMobile ? '100%' : '300px',
                        minWidth: isMobile ? 'auto' : '220px',
                        maxWidth: isMobile ? '100%' : '340px',
                        marginRight: isMobile ? 0 : '0.5rem',
                        position: isMobile ? 'relative' : 'absolute',
                        left: isMobile ? undefined : '16px',
                        top: isMobile ? undefined : 0,
                        zIndex: isMobile ? undefined : 2,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem'
                    }}
                >
                    <div
                        className="p-4 rounded card-theme mb-3"
                        style={{
                            background:'var(--color-surface)',
                            border:'1px solid var(--color-border,#e2e8f0)',
                            boxShadow:'0 2px 12px rgba(0,0,0,0.06)',
                            marginTop: isMobile ? 0 : '55%'
                        }}
                    >
                        <Form.Group>
                            <Form.Label style={{color:'var(--color-text)',fontWeight:600,fontSize:'1.05rem'}}>Filter by Type</Form.Label>
                            {typesLoading && <div className="d-flex align-items-center"><Spinner animation="border" size="sm" className="me-2"/>Loading types...</div>}
                            {typesError && <div className="text-danger small">{typesError}</div>}
                            {!typesLoading && !typesError && (
                                <div className="d-flex flex-column gap-1" style={{maxHeight:180,overflowY:'auto'}}>
                                    {monitoringTypes.map((t) => {
                                        const circleColor = getTypeColor(t.id);
                                        return (
                                            <Form.Check
                                                key={t.id ?? t.value}
                                                type="checkbox"
                                                id={`filter-${t.id ?? t.value}`}
                                                label={
                                                    <span style={{color:'var(--color-text)',fontWeight:500,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                                                        <span>{t.value}</span>
                                                        <span
                                                            style={{
                                                                ...circleBaseStyle,
                                                                background: circleColor,
                                                                marginLeft: 8
                                                            }}
                                                        />
                                                    </span>
                                                }
                                                checked={selectedTypeFilters.includes(t.value)}
                                                onChange={() => toggleTypeFilter(t.value)}
                                            />
                                        );
                                    })}
                                </div>
                            )}
                            {/* <div className="mt-2 small" style={{color:'var(--color-text)',opacity:0.7}}>{selectedTypeFilters.length ? `${selectedTypeFilters.length} type filter(s) active` : 'No type filters (showing all)'}</div> */}
                        </Form.Group>
                    </div>
                    <div
                        className="p-4 rounded card-theme"
                        style={{
                            background:'var(--color-surface)',
                            border:'1px solid var(--color-border,#e2e8f0)',
                            boxShadow:'0 2px 12px rgba(0,0,0,0.06)'
                        }}
                    >
                        <Form.Label style={{color:'var(--color-text)',fontWeight:600,fontSize:'1.05rem'}}>
                            Selected Stations <span className="fw-normal" style={{fontSize:'0.95rem',opacity:0.7}}>(tap/click markers to add/remove)</span>
                        </Form.Label>
                        {loading && <div className="d-flex align-items-center"><Spinner animation="border" size="sm" className="me-2"/>Loading stations...</div>}
                        {error && <div className="text-danger small mt-2">{error}</div>}
                        <div className="mt-2 d-flex flex-wrap gap-2" style={{maxWidth:'100%'}}>
                            {selectedStations.map(id => {
                                const details = getStationDetails(id);
                                const circleColor = getTypeColor(details.type_value);
                                return (
                                    <Badge
                                        key={id}
                                        pill
                                        bg="primary"
                                        className="d-inline-flex align-items-center"
                                        style={{
                                            fontSize:'1rem',
                                            background:'var(--color-primary,#2563eb)',
                                            color:'var(--color-on-primary,#fff)',
                                            boxShadow:'0 2px 8px rgba(0,0,0,0.08)',
                                            maxWidth:'100%',
                                            overflow:'hidden'
                                        }}
                                        title={details.label}
                                    >
                                        <span
                                            style={{
                                                ...circleBaseStyle,
                                                background: circleColor,
                                                marginRight: 8
                                            }}
                                        />
                                        <span style={{
                                            overflow:'hidden',
                                            textOverflow:'ellipsis',
                                            whiteSpace:'nowrap',
                                            minWidth:0,
                                            flex:'1 1 auto'
                                        }}>
                                            {details.label}
                                        </span>
                                        <FaTimes
                                            className="ms-2 remove-station-icon"
                                            style={{cursor:'pointer',fontSize:'1.1em',opacity:0.9,color:'#ef4444',flex:'0 0 auto'}}
                                            onClick={()=>removeStation(id)}
                                            title="Remove"
                                        />
                                    </Badge>
                                );
                            })}
                            {!selectedStations.length && !loading && <span className="small" style={{color:'var(--color-text)',opacity:0.6}}>None selected yet</span>}
                        </div>
                        {selectedStations.length >= MAX_SELECTION && <Alert variant="info" className="mt-2 p-2" style={{background:'var(--color-accent,#e0f2fe)',color:'var(--color-primary,#2563eb)',border:'none'}}>Maximum of {MAX_SELECTION} stations selected</Alert>}
                    </div>
                </div>
                <div
                    style={{
                        flex: isMobile ? '1 1 auto' : 2,
                        minWidth: 0,
                        marginLeft: isMobile ? 0 : '356px'
                    }}
                >
                    <div
                        className="rounded card-theme"
                        style={{
                            height: isMobile ? 'min(60vh, 520px)' : '750px',
                            minHeight: isMobile ? '320px' : undefined,
                            position:'relative',
                            display:'flex',
                            flexDirection:'column',
                            background:'var(--color-surface)',
                            border:'1px solid var(--color-border,#e2e8f0)',
                            boxShadow:'0 2px 12px rgba(0,0,0,0.06)'
                        }}
                    >
                        <div style={{flex:1,minHeight:0}}>
                            <Suspense fallback={<div className="p-3">Loading map...</div>}>
                                <MapWithNoSSR
                                    buoyOptions={buoyOptions}
                                    selectedStations={selectedStations}
                                    setSelectedStations={setSelectedStations}
                                    maxSelection={MAX_SELECTION}
                                />
                            </Suspense>
                        </div>
                    </div>
                </div>
            </div>
        </Container>
    );
}
