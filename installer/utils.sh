# Helper functions
print_info() {
    if [ "$QUIET_MODE" -eq 0 ]; then
        printf "${BLUE}[INFO   ]${NC} %s\n" "$1" >&2
    fi
}

print_success() {
    if [ "$QUIET_MODE" -eq 0 ]; then
        printf "${GREEN}[SUCCESS]${NC} %s\n" "$1" >&2
    fi
}

print_error() {
    printf "${RED}[ERROR  ]${NC} %s\n" "$1" >&2
}

print_warning() {
    if [ "$QUIET_MODE" -eq 0 ]; then
        printf "${YELLOW}[WARNING]${NC} %s\n" "$1" >&2
    fi
}

print_header() {
    if [ "$QUIET_MODE" -eq 0 ]; then
        printf "\n${MAGENTA}%s${NC}\n" "$1" >&2
    fi
}

print_detail() {
    if [ "$QUIET_MODE" -eq 0 ]; then
        printf "  ${CYAN}%-22s${NC}: %b\n" "$1" "$2" >&2
    fi
}

# Check if command exists (works on routers without 'command' builtin)
command_exists() {
    # Try which first (common on routers)
    if which "$1" >/dev/null 2>&1; then
        return 0
    fi

    # Fallback: try to run with --help (most commands support this)
    if $1 --help >/dev/null 2>&1; then
        return 0
    fi

    # Command not found
    return 1
}

# Check if running as root (works on minimal routers)
check_root() {
    # Method 1: Check $USER variable
    if [ "$USER" = "root" ]; then
        return 0
    fi

    # Method 2: Try to write to /etc (only root can)
    if touch /etc/.root_test 2>/dev/null; then
        rm -f /etc/.root_test 2>/dev/null
        return 0
    fi

    # Method 3: Check whoami if available
    if which whoami >/dev/null 2>&1 && [ "$(whoami 2>/dev/null)" = "root" ]; then
        return 0
    fi

    # If we get here, probably not root
    print_error "This script must be run as root"
    print_info "Please switch to root user first"
    exit 1
}

# Check for required dependencies
check_dependencies() {
    missing_deps=""

    # Check for tar
    if ! command_exists tar; then
        missing_deps="${missing_deps} tar"
    fi

    # Check for download tool
    if ! command_exists wget && ! command_exists curl; then
        missing_deps="${missing_deps} wget/curl"
    fi

    if [ -n "$missing_deps" ]; then
        print_error "Missing required dependencies:$missing_deps"
        print_info "Please install them first"

        # Try to detect package manager and suggest install command
        if command_exists opkg; then
            print_info "For OpenWRT, try: opkg update && opkg install wget tar"
        elif command_exists apt-get; then
            print_info "Try: apt-get update && apt-get install -y wget tar"
        elif command_exists yum; then
            print_info "Try: yum install -y wget tar"
        fi

        exit 1
    fi
}

# Create necessary directories
setup_directories() {
    print_info "Creating directories..."

    # Create install directory if it doesn't exist
    if [ ! -d "$INSTALL_DIR" ]; then
        mkdir -p "$INSTALL_DIR" || {
            print_error "Failed to create install directory: $INSTALL_DIR"
            exit 1
        }
    fi

    # Create config directory
    if [ ! -d "$CONFIG_DIR" ]; then
        if ! mkdir -p "$CONFIG_DIR" 2>/dev/null; then
            # Config dir creation failed - likely read-only filesystem
            # Try Entware fallback
            if [ -d "/opt/etc" ] && [ -w "/opt/etc" ]; then
                print_warning "Cannot write to $CONFIG_DIR (read-only?), falling back to /opt/etc/b4"
                CONFIG_DIR="/opt/etc/b4"
                CONFIG_FILE="${CONFIG_DIR}/b4.json"
                INSTALL_DIR="/opt/sbin"
                SERVICE_DIR="/opt/etc/init.d"
                SERVICE_NAME="S99b4"
                mkdir -p "$CONFIG_DIR" || {
                    print_error "Failed to create config directory: $CONFIG_DIR"
                    exit 1
                }
            else
                print_error "Failed to create config directory: $CONFIG_DIR"
                print_error "Filesystem may be read-only. Try installing Entware first."
                exit 1
            fi
        fi
    fi

    # Create temp directory
    mkdir -p "$TEMP_DIR" || {
        print_error "Failed to create temp directory"
        exit 1
    }
}

# Clean up temporary files
cleanup() {
    if [ -d "$TEMP_DIR" ]; then
        rm -rf "$TEMP_DIR"
    fi
}

# Set up trap for cleanup
trap cleanup EXIT INT TERM

# Check if process is running (POSIX compliant, no pidof)
is_process_running() {
    process_name="$1"
    # Match exact binary name, not the installer script
    if ps 2>/dev/null | grep -v grep | grep -v "b4install" | grep -q "^.*${process_name}$\|^.*${process_name}[[:space:]]"; then
        return 0
    else
        return 1
    fi
}

# Stop process (POSIX compliant)
stop_process() {
    process_name="$1"
    if is_process_running "$process_name"; then
        print_info "Stopping existing $process_name process..."
        # Try pkill if available, otherwise use ps + kill
        if command_exists pkill; then
            pkill "^${process_name}$" 2>/dev/null || true
        else
            # BusyBox way: find and kill by name, exclude installer script
            ps | grep -v grep | grep -v "b4install" | grep "${process_name}$\|${process_name}[[:space:]]" | awk '{print $1}' | while read pid; do
                if [ -n "$pid" ]; then
                    kill "$pid" 2>/dev/null || true
                fi
            done
        fi
        sleep 2
    fi
}

# Download file from URL
fetch_file() {
    url="$1"
    output="$2"

    if command_exists wget; then
        wget -q -O "$output" "$url" 2>/dev/null
        return $?
    elif command_exists curl; then
        curl -sfL -o "$output" "$url" 2>/dev/null
        return $?
    else
        print_error "Neither wget nor curl found"
        return 1
    fi
}

# Fetch URL content to stdout
fetch_stdout() {
    url="$1"

    if command_exists wget; then
        wget -qO- "$url" 2>/dev/null
    elif command_exists curl; then
        curl -sfL "$url" 2>/dev/null
    else
        return 1
    fi
}
