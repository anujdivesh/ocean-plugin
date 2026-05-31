Apply these changes to the FastAPI SFINCS service you pasted so `/raster-png` and `/tiles/...png` can render threshold bands instead of the current continuous `turbo` ramp.

Add these helpers near the top of the file:

```python
def parse_threshold_list(raw: Optional[str]) -> list[float]:
    if not raw:
        return []
    values = []
    for chunk in raw.split(","):
        chunk = chunk.strip()
        if not chunk:
            continue
        values.append(float(chunk))
    return values


def parse_color_list(raw: Optional[str]) -> list[tuple[int, int, int]]:
    if not raw:
        return []
    colors = []
    for chunk in raw.split(","):
        token = chunk.strip().lstrip("#")
        if len(token) != 6:
            raise HTTPException(status_code=400, detail=f"Invalid color: {chunk}")
        colors.append(tuple(int(token[i:i + 2], 16) for i in (0, 2, 4)))
    return colors


def render_threshold_rgba(masked: np.ndarray, thresholds: list[float], color_values: list[tuple[int, int, int]]) -> np.ndarray:
    if len(thresholds) < 2 or len(thresholds) != len(color_values):
        raise HTTPException(
            status_code=400,
            detail="threshold rendering requires matching threshold/color arrays with at least two entries",
        )

    rgba = np.zeros(masked.shape + (4,), dtype=np.uint8)
    valid = np.isfinite(masked)

    for threshold, color in zip(thresholds, color_values):
      band_mask = valid & (masked >= threshold)
      rgba[band_mask, 0] = color[0]
      rgba[band_mask, 1] = color[1]
      rgba[band_mask, 2] = color[2]
      rgba[band_mask, 3] = 255

    return rgba
```

Update both raster routes to accept the extra query params:

```python
    render_mode: str = Query("continuous", description="continuous or thresholds"),
    thresholds: Optional[str] = Query(None, description="Comma-separated threshold list"),
    colors: Optional[str] = Query(None, description="Comma-separated hex colors"),
```

Replace the current `Normalize(...)` / `get_cmap("turbo")` block with:

```python
        if render_mode == "thresholds":
            threshold_values = parse_threshold_list(thresholds)
            color_values = parse_color_list(colors)
            rgba = render_threshold_rgba(masked, threshold_values, color_values)
        else:
            norm = colors.Normalize(vmin=vmin, vmax=vmax, clip=True)
            cmap = cm.get_cmap("turbo")
            rgba = (cmap(norm(masked)) * 255).astype(np.uint8)
            rgba[np.isnan(masked)] = [0, 0, 0, 0]
```

Then build the image from `rgba` directly:

```python
        img = Image.fromarray(rgba, mode="RGBA")
```

Notes:
- The frontend now sends `render_mode=thresholds`, `thresholds=...`, and `colors=...` on the inundation raster requests.
- The frontend also drives `vmin` from the threshold editor's "Hide below depth" control, so shallow noise suppression is already wired on the client side.
- Palette selection in the editor does not need a separate backend palette parameter; it works by changing the per-band `colors=...` list.
- Threshold rendering is discrete: each pixel gets the color of the highest matching threshold.
- Dry / masked cells stay transparent.
