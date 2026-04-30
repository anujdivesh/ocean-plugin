#!/bin/bash
# 🚀 Quick Setup Script for Local Testing
# This script sets up everything you need to test the ocean visualization app

set -e  # Exit on error

WIDGET_DIR="/home/kishank/ocean-plugin/plugin/widget5"
DATA_DIR="/tmp/ocean_test_data"

echo "🌊 Ocean Visualization App - Local Setup"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "ℹ️  $1"
}

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v python3 &> /dev/null; then
    print_error "Python 3 is not installed"
    exit 1
fi
print_success "Python 3 found: $(python3 --version)"

if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    exit 1
fi
print_success "Node.js found: $(node --version)"

if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    exit 1
fi
print_success "npm found: $(npm --version)"

echo ""

# Ask user what they want to do
echo "🎯 What would you like to test with?"
echo "1) Generate sample data (fastest, ~30 seconds)"
echo "2) Download from THREDDS (real data, ~5 minutes)"
echo "3) Use existing NetCDF file"
echo ""
read -p "Enter your choice (1-3): " choice

case $choice in
    1)
        echo ""
        echo "📊 Generating sample ocean flow data..."
        mkdir -p "$DATA_DIR"
        
        cd "$WIDGET_DIR/scripts"
        python3 convert_netcdf_to_zarr.py \
            --sample-data "$DATA_DIR/sample_ocean.zarr"
        
        if [ $? -eq 0 ]; then
            print_success "Sample data created at: $DATA_DIR/sample_ocean.zarr"
            DATA_PATH="$DATA_DIR/sample_ocean.zarr"
        else
            print_error "Failed to generate sample data"
            exit 1
        fi
        ;;
    
    2)
        echo ""
        print_warning "Downloading from THREDDS requires a working internet connection"
        read -p "Enter THREDDS OPeNDAP URL (or press Enter for Hawaii SWAN): " opendap_url
        
        if [ -z "$opendap_url" ]; then
            opendap_url="https://pae-paha.pacioos.hawaii.edu/thredds/dodsC/swan/hawaii/SWAN_Hawaii_Regional"
            print_info "Using default: $opendap_url"
        fi
        
        echo "📥 Downloading data from THREDDS (this may take a few minutes)..."
        mkdir -p "$DATA_DIR"
        
        cd "$WIDGET_DIR/scripts"
        python3 thredds_to_zarr.py \
            --opendap "$opendap_url" \
            --output "$DATA_DIR/thredds_data.nc" \
            --variables hs dir tp 2>/dev/null || {
                print_warning "Direct download failed, will serve via xpublish instead"
                DATA_PATH="opendap:$opendap_url"
            }
        
        if [ ! "$DATA_PATH" ]; then
            print_success "Data downloaded to: $DATA_DIR/thredds_data.nc"
            DATA_PATH="$DATA_DIR/thredds_data.nc"
        fi
        ;;
    
    3)
        echo ""
        read -p "Enter path to your NetCDF file: " netcdf_file
        
        if [ ! -f "$netcdf_file" ]; then
            print_error "File not found: $netcdf_file"
            exit 1
        fi
        
        print_success "Using file: $netcdf_file"
        DATA_PATH="$netcdf_file"
        ;;
    
    *)
        print_error "Invalid choice"
        exit 1
        ;;
esac

echo ""

# Install Python dependencies
echo "📦 Installing Python dependencies for xpublish server..."
cd "$WIDGET_DIR/xpublish-server"

if ! pip3 show xpublish &> /dev/null; then
    print_info "Installing xpublish and dependencies..."
    pip3 install -r requirements.txt
    print_success "Python dependencies installed"
else
    print_success "Python dependencies already installed"
fi

echo ""

# Install Node dependencies
echo "📦 Checking Node.js dependencies..."
cd "$WIDGET_DIR"

if [ ! -d "node_modules" ]; then
    print_info "Installing npm packages (this may take a few minutes)..."
    npm install
    print_success "Node.js dependencies installed"
else
    print_success "Node.js dependencies already installed"
fi

echo ""

# Configure environment
echo "⚙️  Configuring environment..."
cat > "$WIDGET_DIR/.env.development" << EOF
REACT_APP_ZARR_URL=http://localhost:9000/datasets/ocean/zarr
REACT_APP_ZARR_SOURCE=xpublish
EOF
print_success "Environment configured (.env.development created)"

echo ""

# Create startup scripts
echo "📝 Creating startup scripts..."

# xpublish server start script
if [[ "$DATA_PATH" == opendap:* ]]; then
    # Extract OPeNDAP URL
    OPENDAP_URL="${DATA_PATH#opendap:}"
    cat > "$WIDGET_DIR/start-server.sh" << EOF
#!/bin/bash
cd "$WIDGET_DIR/xpublish-server"
echo "🚀 Starting xpublish server with THREDDS data..."
python3 server.py --opendap "$OPENDAP_URL" --port 9000
EOF
else
    cat > "$WIDGET_DIR/start-server.sh" << EOF
#!/bin/bash
cd "$WIDGET_DIR/xpublish-server"
echo "🚀 Starting xpublish server..."
python3 server.py --file "$DATA_PATH" --port 9000
EOF
fi

chmod +x "$WIDGET_DIR/start-server.sh"

# React app start script
cat > "$WIDGET_DIR/start-app.sh" << EOF
#!/bin/bash
cd "$WIDGET_DIR"
echo "🌐 Starting React application..."
npm start
EOF

chmod +x "$WIDGET_DIR/start-app.sh"

print_success "Startup scripts created"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""
print_success "Setup complete! 🎉"
echo ""
echo "📚 To start testing:"
echo ""
echo "   Terminal 1 - Start xpublish server:"
echo "   $ cd $WIDGET_DIR"
echo "   $ ./start-server.sh"
echo ""
echo "   Terminal 2 - Start React app:"
echo "   $ cd $WIDGET_DIR"
echo "   $ ./start-app.sh"
echo ""
echo "   Then open: http://localhost:3000"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Ask if user wants to start now
read -p "Would you like to start the server now? (y/N) " start_now

if [[ "$start_now" =~ ^[Yy]$ ]]; then
    echo ""
    print_info "Starting xpublish server..."
    print_warning "Press Ctrl+C to stop the server"
    echo ""
    sleep 2
    exec "$WIDGET_DIR/start-server.sh"
else
    echo ""
    print_info "Run ./start-server.sh when you're ready to start testing"
    echo ""
fi
