#!/usr/bin/env python3
"""
xpublish Server for Ocean Flow Data

Serves NetCDF datasets as Zarr-compatible HTTP endpoints.
Allows browser clients to fetch ocean currents without pre-converting to Zarr.

Usage:
    python server.py --file ocean_currents.nc --port 9000
    
    # Serve from THREDDS OPeNDAP
    python server.py --opendap https://thredds.server/dodsC/ocean/latest --port 9000
    
    # With variable selection
    python server.py --file ocean.nc --variables u v --port 9000

Access:
    http://localhost:9000/datasets/ocean/zarr/.zmetadata
    http://localhost:9000/datasets/ocean/zarr/u/0.0.0
"""

import argparse
import sys
from pathlib import Path

try:
    import xarray as xr
    import xpublish
    import uvicorn
except ImportError as e:
    print(f"❌ Missing required package: {e}")
    print("\n📦 Install with:")
    print("   pip install xpublish xarray netCDF4 zarr uvicorn")
    sys.exit(1)


class OceanDataServer:
    """xpublish server for ocean flow data"""
    
    def __init__(self, dataset_path=None, opendap_url=None, variables=None, 
                 cache_size='1GB', chunks=None):
        """
        Initialize server with NetCDF file or OPeNDAP endpoint
        
        Args:
            dataset_path: Path to NetCDF file
            opendap_url: OPeNDAP endpoint URL
            variables: List of variables to serve (None = all)
            cache_size: Size of chunk cache (e.g., '1GB')
            chunks: Chunk configuration dict
        """
        self.dataset_path = dataset_path
        self.opendap_url = opendap_url
        self.variables = variables
        self.cache_size = cache_size
        self.chunks = chunks or {'time': 1, 'lat': 128, 'lon': 128}
        self.datasets = {}
        
    def load_dataset(self, name='ocean'):
        """Load and prepare dataset for serving"""
        print(f"📂 Loading dataset: {name}")
        
        # Load from file or OPeNDAP
        if self.dataset_path:
            print(f"   Source: {self.dataset_path}")
            ds = xr.open_dataset(self.dataset_path, chunks='auto')
        elif self.opendap_url:
            print(f"   Source: {self.opendap_url}")
            ds = xr.open_dataset(self.opendap_url, chunks='auto')
        else:
            raise ValueError("Must provide either dataset_path or opendap_url")
        
        print(f"   Dimensions: {dict(ds.sizes)}")
        print(f"   Variables: {list(ds.data_vars)}")
        
        # Filter variables if requested
        if self.variables:
            print(f"   Filtering to: {self.variables}")
            # Keep only requested variables plus coordinates
            vars_to_keep = [v for v in self.variables if v in ds.data_vars]
            ds = ds[vars_to_keep]
        
        # Optimize chunking for web access (skip if already chunked or unstructured)
        is_unstructured = any(dim in ds.dims for dim in ['mesh_node', 'mesh_num_faces', 'node', 'face'])
        
        if is_unstructured:
            print("   Detected unstructured mesh - preserving existing chunks")
        else:
            # Apply regular grid chunking
            applicable_chunks = {k: v for k, v in self.chunks.items() if k in ds.dims}
            if applicable_chunks:
                print(f"   Rechunking with: {applicable_chunks}")
                ds = ds.chunk(applicable_chunks)
            else:
                print("   Using existing chunks")
        
        # Store dataset
        self.datasets[name] = ds
        print(f"✅ Dataset '{name}' loaded and ready")
        
        return ds
    
    def create_rest(self):
        """Create xpublish REST object with CORS enabled"""
        from fastapi.middleware.cors import CORSMiddleware
        
        print("🌐 Creating REST API...")
        
        # Create xpublish REST API
        rest = xpublish.Rest(
            self.datasets,
            cache_kws={'available_bytes': self._parse_cache_size(self.cache_size)}
        )
        
        # Add CORS middleware for browser access
        rest.app.add_middleware(
            CORSMiddleware,
            allow_origins=['*'],  # In production, specify your domains
            allow_credentials=True,
            allow_methods=['*'],
            allow_headers=['*'],
        )
        
        # Add custom routes
        @rest.app.get('/')
        async def root():
            return {
                'service': 'xpublish Ocean Data Server',
                'version': xpublish.__version__,
                'datasets': list(self.datasets.keys()),
                'endpoints': {
                    'zarr_metadata': '/datasets/{dataset}/zarr/.zmetadata',
                    'zarr_array': '/datasets/{dataset}/zarr/{variable}/.zarray',
                    'zarr_chunk': '/datasets/{dataset}/zarr/{variable}/{chunk_id}',
                    'info': '/datasets/{dataset}/info',
                }
            }
        
        @rest.app.get('/datasets/{dataset}/info')
        async def dataset_info(dataset: str):
            """Get dataset information"""
            if dataset not in self.datasets:
                return {'error': f'Dataset {dataset} not found'}
            
            ds = self.datasets[dataset]
            return {
                'dims': dict(ds.sizes),
                'coords': list(ds.coords),
                'data_vars': list(ds.data_vars),
                'chunks': {k: v.chunks for k, v in ds.data_vars.items() if hasattr(v, 'chunks')},
            }
        
        print("✅ REST API created with CORS enabled")
        return rest
    
    def _parse_cache_size(self, size_str):
        """Parse cache size string like '1GB' to bytes"""
        size_str = size_str.upper()
        if size_str.endswith('GB'):
            return int(float(size_str[:-2]) * 1024**3)
        elif size_str.endswith('MB'):
            return int(float(size_str[:-2]) * 1024**2)
        else:
            return int(size_str)
    
    def serve(self, host='0.0.0.0', port=9000):
        """Start the server"""
        rest = self.create_rest()
        
        print(f"\n🚀 Starting xpublish server...")
        print(f"   Host: {host}")
        print(f"   Port: {port}")
        print(f"\n📡 Access your data at:")
        print(f"   http://{host}:{port}/")
        print(f"   http://{host}:{port}/datasets/ocean/zarr/.zmetadata")
        print(f"\n💡 In your React app, use:")
        print(f"   const zarrUrl = 'http://localhost:{port}/datasets/ocean/zarr'")
        print(f"\n⏸️  Press Ctrl+C to stop\n")
        
        uvicorn.run(
            rest.app,
            host=host,
            port=port,
            log_level='info'
        )


def main():
    parser = argparse.ArgumentParser(
        description='Serve ocean NetCDF data as Zarr HTTP API',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    # Serve local NetCDF file
    python server.py --file ocean_currents.nc
    
    # Serve from THREDDS OPeNDAP
    python server.py --opendap https://thredds.server/dodsC/ocean/latest
    
    # Custom port and variables
    python server.py --file ocean.nc --variables u v hs --port 8080
    
    # Optimize chunking for web access
    python server.py --file ocean.nc --time-chunk 1 --spatial-chunk 256
"""
    )
    
    # Data source
    source_group = parser.add_mutually_exclusive_group(required=True)
    source_group.add_argument('--file', help='Path to NetCDF file')
    source_group.add_argument('--opendap', help='OPeNDAP endpoint URL')
    
    # Server options
    parser.add_argument('--port', type=int, default=9000,
                       help='Server port (default: 9000)')
    parser.add_argument('--host', default='0.0.0.0',
                       help='Server host (default: 0.0.0.0)')
    
    # Data options
    parser.add_argument('--variables', nargs='+',
                       help='Variables to serve (default: all)')
    parser.add_argument('--time-chunk', type=int, default=1,
                       help='Time chunk size (default: 1)')
    parser.add_argument('--spatial-chunk', type=int, default=128,
                       help='Spatial chunk size (default: 128)')
    parser.add_argument('--cache-size', default='1GB',
                       help='Chunk cache size (default: 1GB)')
    
    args = parser.parse_args()
    
    # Configure chunking
    chunks = {
        'time': args.time_chunk,
        'lat': args.spatial_chunk,
        'lon': args.spatial_chunk,
    }
    
    # Create and start server
    server = OceanDataServer(
        dataset_path=args.file,
        opendap_url=args.opendap,
        variables=args.variables,
        cache_size=args.cache_size,
        chunks=chunks,
    )
    
    server.load_dataset('ocean')
    server.serve(host=args.host, port=args.port)


if __name__ == '__main__':
    main()
