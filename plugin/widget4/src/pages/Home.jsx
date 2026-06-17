import React, { useEffect, useState } from 'react';
import { Spinner } from 'react-bootstrap';
import Select from 'react-select';
import { TreeSelect } from 'primereact/treeselect';
import LayerSettingsCard from '../components/layerSettingCard'; 
import {getDateFromArray, formatDateToISOWithoutMilliseconds,getDay,formatDateToISOWithoutMilliseconds3Monthly} from '../components/helper';



const URL_COUNTRY = 'https://ocean-middleware.spc.int/middleware/api/country/?format=json';
const URL_PRODUCT = 'https://ocean-middleware.spc.int/middleware/api/main_menu/?format=json&theme_id=8';
// const URL_LAYER = 'https://ocean-middleware.spc.int/middleware/api/layer_web_map/';
const Home = () => {
  const [countries, setCountries] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [loading, setLoading] = useState(true);
  
  const [productNodes, setProductNodes] = useState([]);
  const [selectedNodeKey, setSelectedNodeKey] = useState(null);
  const [expandedKeys, setExpandedKeys] = useState({});
  
  // Removed currentSettings; using onApply to fetch and display image
  const [mapImageUrl, setMapImageUrl] = useState("");
  const [mapError, setMapError] = useState(false);
  const [mapLoading, setMapLoading] = useState(false);
  // Use cache toggle similar to DynamicImage component
  const [useCache, setUseCache] = useState(true);

  // const sanitizeLabel = (text) => String(text || '').replace(/\]/g, '').replace(/\[/g, '');
  const sanitizeLabel = (text) => String(text || '').replace(/\]/g, '').replace(/\[/g, '').replace(/\{\d+\}/g, '').replace(/\{\{\d+\}\}/g, '');
  
  useEffect(() => {
    fetch(URL_COUNTRY)
    .then((response) => response.json())
    .then((data) => {
      const sortedData = [...data].sort((a, b) => a.long_name.localeCompare(b.long_name));
      setCountries(sortedData);
      setLoading(false);
    })
    .catch((error) => {
      console.error('Error fetching countries:', error);
      setLoading(false);
    });
}, []);
  
  
// (native select handler removed; using react-select handler below)

// Build options for react-select
const options = countries.map((country) => ({ value: country.id, label: country.long_name }));

// Fetch products and build grouped nodes using display_title (group) and layer_information (value)
useEffect(() => {
  fetch(URL_PRODUCT)
    .then((r) => r.json())
    .then((data) => {
      const sections = Array.isArray(data) ? data : [];
      const groups = sections.filter((s) => Array.isArray(s.content) && s.content.length > 0);
      const nodes = groups.map((s, gi) => {
        const children = (s.content || [])
          .filter((item) => item && item.layer_information != null)
          .map((item) => {
            const key = String(item.layer_information);
            let label = sanitizeLabel(item.name);
            // Keys whose label should drop the first 5 space-separated words
            const dropFiveKeys = new Set(['38', '16', '6', '54']);
            // Keys whose label should drop the first 3 space-separated words
            const dropThreeKeys = new Set(['35', '26', '36']);
            if (dropFiveKeys.has(key)) {
              label = label.split(' ').slice(5).join(' ');
            } else if (dropThreeKeys.has(key)) {
              label = label.split(' ').slice(3).join(' ');
            }
            return { key, label, selectable: true };
          });
        const count = children.length;
        const label = `${sanitizeLabel(s.display_title || s.title || 'Untitled')} (${count})`;
        return {
          key: `g_${gi}`,
          label,
          selectable: false,
          children
        };
      });
      //console.log('TreeSelect raw product data:', data);
      //console.log('TreeSelect productNodes (options):', nodes);
      setProductNodes(nodes);
    })
    .catch((err) => {
      console.error('Error fetching products:', err);
      setProductNodes([]);
    });
}, []);

// Theme-aware styles for react-select using CSS variables
const selectStyles = {
  control: (base, state) => ({
    ...base,
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text)',
    borderColor: 'var(--color-border, #e2e8f0)',
    boxShadow: state.isFocused ? `0 0 0 1px var(--color-primary)` : 'none',
    '&:hover': { borderColor: 'var(--color-primary)' },
    minHeight: 44,
    height: 44
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text)',
    boxShadow: 'var(--card-shadow)'
  }),
  valueContainer: (base) => ({
    ...base,
    height: 44,
    paddingTop: 0,
    paddingBottom: 0
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? 'var(--color-primary)'
      : state.isFocused
        ? 'var(--color-background)'
        : 'transparent',
    color: state.isSelected ? 'white' : 'var(--color-text)'
  }),
  singleValue: (base) => ({ ...base, color: 'var(--color-text)' }),
  input: (base) => ({ ...base, color: 'var(--color-text)' }),
  placeholder: (base) => ({ ...base, color: 'var(--color-secondary)' }),
  indicatorSeparator: (base) => ({ ...base, backgroundColor: 'var(--color-border, #e2e8f0)' }),
  dropdownIndicator: (base) => ({
    ...base,
    color: 'var(--color-text)',
    ':hover': { color: 'var(--color-primary)' }
  }),
  clearIndicator: (base) => ({
    ...base,
    color: 'var(--color-text)',
    ':hover': { color: 'var(--color-primary)' }
  }),
  indicatorsContainer: (base) => ({
    ...base,
    color: 'var(--color-text)'
  })
};

// onSettingsChange not required in this view

const handleSelectChange = (option) => {
  const value = option ? String(option.value) : "";
  setSelectedCountry(value);
  // Clear product selection and image when country changes/clears
  setSelectedNodeKey(null);
  setMapImageUrl("");
  const country = countries.find((c) => c.id === (option?.value ?? -1));
  if (country) {
    console.log('Selected country:', country.long_name);
  }
};

return (
  <div style={{ padding: '20px', color: 'var(--color-text)' }}>
    {loading && <div style={{ color: 'var(--color-text)', marginBottom: 10 }}>Loading countries...</div>}

    {/* Top row: Country (left/red), Product (right/blue) */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-start', marginBottom: 16 }}>
      <div style={{ width: 400 }}>
        <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold', color: 'var(--color-text)' }}>
          Country
        </label>
        <Select
          inputId="country-select"
          options={options}
          value={options.find((o) => String(o.value) === selectedCountry) || null}
          onChange={handleSelectChange}
          isClearable
          isSearchable
          placeholder="Select a Country"
          noOptionsMessage={() => 'No countries found'}
          styles={selectStyles}
          aria-label="Choose a country"
        />
      </div>
  <div style={{ width: 400 }}>
        <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold', color: 'var(--color-text)' }}>
          Product
      </label>
        <TreeSelect
          id="product-tree"
          value={selectedNodeKey}
          onChange={(e) => {
            if (!selectedCountry) return;
            setSelectedNodeKey(e.value);
            //console.log('Selected product layer_information:', e.value);
            // Close the dropdown after selection
            setTimeout(() => {
              const el = document.getElementById('product-tree');
              if (el) el.blur();
            }, 0);
          }}
          options={productNodes}
          expandedKeys={expandedKeys}
          onToggle={(e) => { if (!selectedCountry) return; setExpandedKeys(e.value || {}); }}
          onNodeClick={(e) => {
            if (!selectedCountry) return;
            const node = e.node;
            if (node && node.children && node.children.length) {
              setExpandedKeys((prev) => ({ ...prev, [node.key]: !prev?.[node.key] }));
            }
          }}
          metaKeySelection={false}
          className="treeProduct"
          dropdownIcon={<svg height="20" width="20" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path fill="currentColor" d="M4.516 7.548c0.436-0.446 1.043-0.481 1.576 0l3.908 3.747 3.908-3.747c0.533-0.481 1.141-0.446 1.574 0 0.436 0.445 0.408 1.197 0 1.615-0.406 0.418-4.695 4.502-4.695 4.502-0.217 0.223-0.502 0.335-0.787 0.335s-0.57-0.112-0.789-0.335c0 0-4.287-4.084-4.695-4.502s-0.436-1.17 0-1.615z"></path></svg>}
          selectionMode="single"
          placeholder={selectedCountry ? "Select a Product" : "Select a country first"}
          disabled={!selectedCountry}
        />
      </div>
    </div>

    {/* Main area: Left (selections), Right (image/error) */}
    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', minHeight: '60vh', gap: 32 }}>
      {/* Left: Selections and LayerSettingsCard */}
      <div style={{ minWidth: 400, maxWidth: 420, flex: '0 0 420px',marginLeft:-20 }}>
        
        {selectedNodeKey ? (
          <>
           <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold',marginLeft:20, color: 'var(--color-text)' }}>
          Time Range
      </label>
          <LayerSettingsCard 
            layerId={parseInt(selectedNodeKey, 10)}
            onApply={async ({ layerId, settings }) => {
              try {
                if (!selectedCountry) { console.warn('No country selected'); return; }
                const region = encodeURIComponent(String(selectedCountry));
                const layer_map = encodeURIComponent(String(layerId));
                const iso = settings?.selectedDate || settings?.timeRange?.end || settings?.timeRange?.start;
                if (!iso) { console.warn('No time selected'); return; }
                const time = new Date(iso).toISOString().split('.')[0] + 'Z';
                const cacheParam = useCache ? 'True' : 'False';
                const urlBase = `https://ocean-plotter.spc.int/plotter/getMap?region=${region}&layer_map=${layer_map}&time=${time}&use_cache=False&token=null`;
                const url = `${urlBase}&nocache=${Date.now()}`;
                console.log('Apply with settings:', settings);
                console.log('Resolved ISO:', iso);
                console.log('Map image URL:', url);
                setMapError(false);
                setMapLoading(true);
                setMapImageUrl(url);
              } catch (e) {
                console.error('Error fetching map image', e);
              }
            }}
          />
          </>
        ) : null}
      </div>
      {/* Right: Image and error display */}
  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', height: '100%' }}>
        {mapImageUrl ? (
          <>
            {mapError && (
              <div style={{ padding: '12px', borderRadius: 8, border: '1px solid #e2e8f0', color: 'var(--color-text)', maxWidth: 480, margin: '0 auto', marginBottom: 16 }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Error Loading Image</div>
                <div style={{ marginBottom: 10 }}>Failed to load image</div>
                <button
                  onClick={() => {
                    setMapError(false);
                    setMapLoading(true);
                    setMapImageUrl((prev) => (prev ? `${prev}&nocache=${Date.now()}` : prev));
                  }}
                  style={{ padding: '6px 10px', cursor: 'pointer' }}
                >
                  Try again
                </button>
              </div>
            )}
            {!mapError && (
              <div style={{ position: 'relative', alignSelf: 'flex-start', width: '100%', marginTop:-180 }}>
                {mapLoading && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Spinner animation="border" role="status" variant="primary" />
                      <span style={{ marginLeft: '10px', fontSize: '18px' }}>
      Processing layers and generating visualization...
    </span>
                  </div>
                )}
                <img
                  src={mapImageUrl}
                  alt="Layer map"
                  onError={() => { setMapError(true); setMapLoading(false); }}
                  onLoad={() => { setMapError(false); setMapLoading(false); }}
                  style={{ width: '100%', height: 'auto', maxHeight: '80vh', objectFit: 'contain', visibility: mapLoading ? 'hidden' : 'visible', display: 'block' }}
                />
                {!mapLoading && (
                  <div style={{ marginTop: 6, textAlign: 'center' }}>
                    <button
                      className="btn btn-warning"
                      style={{ color: '#212529', fontWeight: 600 }}
                      onClick={async () => {
                        try {
                          const response = await fetch(mapImageUrl, { mode: 'cors' });
                          if (!response.ok) throw new Error('Network response was not ok');
                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `map_${selectedCountry}_image.png`;
                          document.body.appendChild(a);
                          a.click();
                          setTimeout(() => {
                            window.URL.revokeObjectURL(url);
                            document.body.removeChild(a);
                          }, 100);
                        } catch (err) {
                          alert('Failed to download image.');
                        }
                      }}
                    >
                      Download image
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div style={{ color: 'var(--color-secondary)' }}>{/*Choose a product and click Apply.*/}</div>
        )}
      </div>
    </div>
  </div>
);
};
export default Home;
//
//https://ocean-middleware.spc.int/middleware/api/main_menu/?format=json&theme_id=8
//https://ocean-middleware.spc.int/middleware/api/layer_web_map/16/?format=jso
//