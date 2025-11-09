import React from "react";
import Button from "react-bootstrap/Button";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import { FaPlay, FaPause } from "react-icons/fa";
import { Waves, Navigation, Eye, BarChart3 } from "lucide-react";
import Badge from 'react-bootstrap/Badge';
import FancyIcon from '../components/FancyIcon';
import './timeseries_scroll.css';
import './opacity.css';
import '../styles/fancyIcons.css';

const sideLabelStyle = {
  width: 54,
  minWidth: 54,
  fontSize: "12px",
  marginRight: 6,
  display: "flex",
  alignItems: "center",
  flexShrink: 0,
  lineHeight: 1.1,
};

const sliderRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  marginTop: 7,
  marginBottom: 2,
};

const smallSelect = {
  fontSize: "12px",
  height: 26,
  minHeight: 26,
  minWidth: 0,
  width: "100%",
  padding: "2px 8px",
  cursor: "pointer"
};

const smallRange = {
  flex: 1,
  height: 22,
  minHeight: 18,
  margin: 0,
  padding: 0,
};

const smallButtonGroup = {
  height: 22,
  display: "flex",
  alignItems: "center",
};

const valueText = {
  minWidth: 30,
  fontSize: "11px",
  textAlign: "right",
  fontVariantNumeric: "tabular-nums",
  paddingLeft: 2,
  lineHeight: 1.1,
};

const legendBox = {
  width: "98%",
  margin: "8px auto 0 auto",
  display: "flex",
  justifyContent: "center",
};

export default function WaveForecastAccordion({
  WAVE_FORECAST_LAYERS,
  selectedWaveForecast,
  setSelectedWaveForecast,
  opacity,
  setOpacity,
  capTime,
  totalSteps,
  sliderIndex,
  setSliderIndex,
  isPlaying,
  setIsPlaying,
  currentSliderDate,
}) {
  // Debug logging temporarily disabled
  // Get the legend URL from the selected layer (or sublayer if composite)
  const selectedLayer = WAVE_FORECAST_LAYERS.find(l => l.value === selectedWaveForecast);
  let legendUrl = "";
  if (selectedLayer) {
    if (selectedLayer.composite && selectedLayer.layers) {
      // If composite, just take the first sublayer's legend for now
      legendUrl = selectedLayer.layers[0]?.legendUrl || selectedLayer.legendUrl;
    } else {
      legendUrl = selectedLayer.legendUrl;
    }
  }

  return (
    <div style={{ fontSize: "14px", width: "100%", maxWidth: 370, margin: "0 auto" }}>
      {/* Layer select with fancy icon */}
      <div style={sliderRowStyle}>
        <label style={{...sideLabelStyle, display: "flex", alignItems: "center", gap: 4}} htmlFor="select-wave-forecast">
          <FancyIcon 
            Icon={Waves} 
            size={16} 
            animation="wave" 
            color="#00cc11ff"
            glowColor="rgba(9, 238, 28, 0.3)"
          />
          Layer
        </label>
        <select
          id="select-wave-forecast"
          className="form-select form-select-sm"
          value={selectedWaveForecast}
          onChange={e => {
            setSelectedWaveForecast(e.target.value);
          }}
          style={smallSelect}
        >
          {WAVE_FORECAST_LAYERS.map(layer => (
            <option key={layer.value} value={layer.value}>{layer.label}</option>
          ))}
        </select>
      </div>

      {/* Opacity slider with fancy icon */}
      <div style={sliderRowStyle}>
        <label style={{...sideLabelStyle, display: "flex", alignItems: "center", gap: 4}} htmlFor="wave-opacity-slider">
          <FancyIcon 
            Icon={Eye} 
            size={16} 
            animation="pulse" 
            color="#6c757d"
          />
          Opacity
        </label>
        <input
          type="range"
          id="wave-opacity-slider"
          className="form-range custom-range-slider"
          min={0}
          max={100}
          step={1}
          value={Math.round(opacity * 100)}
          onChange={e => setOpacity(Number(e.target.value) / 100)}
          style={smallRange}
        />
        <span style={valueText}>{Math.round(opacity * 100)}%</span>
      </div>

      {/* Time range slider with fancy icon */}
      <div style={sliderRowStyle}>
        <label style={{...sideLabelStyle, display: "flex", alignItems: "center", gap: 4}} htmlFor="wave-time-slider">
          <FancyIcon 
            Icon={BarChart3} 
            size={16} 
            animation="shimmer" 
            color="#28a745"
          />
          Time
        </label>
        <input
          type="range"
          className="form-range custom-range-slider2"
          id="wave-time-slider"
          min={0}
          max={totalSteps}
          value={sliderIndex}
          disabled={capTime.loading}
          step={1}
          onChange={e => {
            setSliderIndex(Number(e.target.value));
          }}
          style={smallRange}
        />
        <ButtonGroup size="sm" style={smallButtonGroup}>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => setSliderIndex(prev => prev > 0 ? prev - 1 : totalSteps)}
            title="Previous"
            style={{ padding: "0.05rem 0.3rem", fontSize: "1.02em", height: 20, minHeight: 20, display: "flex", alignItems: "center", justifyContent: "center", border: "none" }}
          >
            <FancyIcon 
              Icon={Navigation} 
              size={10} 
              animation="bounce" 
              color="#6c757d"
              className="rotate-180"
            />
          </Button>
          <Button
            variant={isPlaying ? "danger" : "success"}
            size="sm"
            onClick={() => setIsPlaying((p) => !p)}
            title={isPlaying ? "Pause" : "Play"}
            style={{ padding: "0.05rem 0.3rem", height: 20, minHeight: 20, display: "flex", alignItems: "center", justifyContent: "center", border: "none" }}
            disabled={capTime.loading}
          >
            {isPlaying ? 
              <FancyIcon Icon={FaPause} size={10} animation="pulse" color="white" /> : 
              <FancyIcon Icon={FaPlay} size={10} animation="hover" color="white" />
            }
          </Button>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => setSliderIndex(prev => prev < totalSteps ? prev + 1 : 0)}
            title="Next"
            style={{ padding: "0.05rem 0.3rem", fontSize: "1.02em", height: 20, minHeight: 20, display: "flex", alignItems: "center", justifyContent: "center", border: "none" }}
          >
            <FancyIcon 
              Icon={Navigation} 
              size={10} 
              animation="bounce" 
              color="#6c757d"
            />
          </Button>
        </ButtonGroup>
      </div>
     

      <div style={{ 
            marginTop: "2px",
            marginLeft: "2px",
            textAlign: "right"
          }}>
            <Badge bg="secondary" className="fw-bold small p-1" style={{
              fontSize: "11px",
              color: "white",
              backgroundColor: "#6c757d",
              padding: "2px 6px",
              borderRadius: "4px"
            }}>
              {capTime.loading
          ? "Loading…"
          : (currentSliderDate?.toISOString().replace("T", " ").substring(0, 16) + " UTC")}
            </Badge>
          </div>

      {/* Legend */}
      <div style={legendBox}>
        {legendUrl && (
          <img src={legendUrl} alt="Legend" style={{ width: "100%", maxWidth: 280, display: "block" }} />
        )}
      </div>

      {/* Source */}
      <div style={{ 
        fontSize: "10px", 
        color: "var(--color-text)", 
        marginTop: 8, 
        wordBreak: "break-all" 
      }}>
        Source: <a 
          href="https://gemthreddshpc.spc.int/thredds" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ color: "var(--color-primary)" }}
        >
          https://gemthreddshpc.spc.int/thredds
        </a>
      </div>
    </div>
  );
}