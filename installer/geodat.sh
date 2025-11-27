#!/bin/sh
# Get geosite path from config using jq if available
get_geodat_from_config() {
    if [ -f "$CONFIG_FILE" ] && command_exists jq; then
        sitedat_path=$(jq -r '.system.geo.sitedat_path // empty' "$CONFIG_FILE" 2>/dev/null)
        if [ -n "$sitedat_path" ] && [ "$sitedat_path" != "null" ]; then
            # Extract directory from path
            echo "$(dirname "$sitedat_path")"
            return 0
        fi
    fi
    return 1
}

# Display geosite source menu and get user choice
select_geo_source() {
    echo "" >&2
    echo "=======================================" >&2
    echo "  Select Geosite Data Source" >&2
    echo "=======================================" >&2
    echo "" >&2

    # Display sources (using POSIX-compliant iteration)
    echo "$GEODAT_SOURCES" | while IFS='|' read -r num name url; do
        if [ -n "$num" ]; then
            printf "  ${GREEN}%s${NC}) %s\n" "$num" "$name" >&2
        fi
    done

    echo "" >&2
    printf "${CYAN}Select source (1-5) or 'q' to skip: ${NC}" >&2
    read choice

    case "$choice" in
    [qQ] | [qQ][uU][iI][tT])
        return 1
        ;;
    [1-5])
        # Extract URL for selected choice (POSIX-compliant)
        selected_url=$(echo "$GEODAT_SOURCES" | grep "^${choice}|" | cut -d'|' -f3)
        if [ -n "$selected_url" ]; then
            echo "$selected_url"
            return 0
        else
            print_error "Invalid selection"
            return 1
        fi
        ;;
    *)
        print_error "Invalid selection"
        return 1
        ;;
    esac
}

download_geodat() {
    base_url="$1"
    save_dir="$2"

    sitedat_url="${base_url}/geosite.dat"
    ipdat_url="${base_url}/geoip.dat"
    sitedat_path="${save_dir}/geosite.dat"
    ipdat_path="${save_dir}/geoip.dat"

    # Verify save_dir is writable
    if [ ! -w "$(dirname "$save_dir")" ] && [ ! -d "$save_dir" ]; then
        if [ -d "/opt/etc" ] && [ -w "/opt/etc" ]; then
            save_dir="/opt/etc/b4"
            sitedat_path="${save_dir}/geosite.dat"
            ipdat_path="${save_dir}/geoip.dat"
            print_warning "Original path not writable, using: $save_dir"
        fi
    fi

    # Create directory
    if [ ! -d "$save_dir" ]; then
        mkdir -p "$save_dir" || {
            print_error "Failed to create directory: $save_dir"
            return 1
        }
    fi

    # Download geosite.dat
    print_info "Downloading geosite.dat from: $sitedat_url"
    if ! fetch_file "$sitedat_url" "$sitedat_path"; then
        print_error "Failed to download geosite.dat"
        return 1
    fi

    if [ ! -s "$sitedat_path" ]; then
        print_error "Downloaded geosite.dat is empty"
        rm -f "$sitedat_path"
        return 1
    fi

    # Download geoip.dat
    print_info "Downloading geoip.dat from: $ipdat_url"
    if ! fetch_file "$ipdat_url" "$ipdat_path"; then
        print_error "Failed to download geoip.dat"
        return 1
    fi

    if [ ! -s "$ipdat_path" ]; then
        print_error "Downloaded geoip.dat is empty"
        rm -f "$ipdat_path"
        return 1
    fi

    print_success "Geosite: $sitedat_path"
    print_success "GeoIP: $ipdat_path"
    return 0
}

# Update config file with geodat paths
update_config_geodat_path() {
    sitedat_path="$1"
    ipdat_path="$2"
    sitedat_url="$3/geosite.dat"
    ipdat_url="$3/geoip.dat"

    # Try to update with jq if available
    if command_exists jq; then
        print_info "Updating config file..."

        if [ ! -f "$CONFIG_FILE" ]; then
            jq -n \
                --arg sitedat_path "$sitedat_path" \
                --arg sitedat_url "$sitedat_url" \
                --arg ipdat_path "$ipdat_path" \
                --arg ipdat_url "$ipdat_url" \
                '{
                    system: {
                        geo: {
                            sitedat_path: $sitedat_path,
                            sitedat_url: $sitedat_url,
                            ipdat_path: $ipdat_path,
                            ipdat_url: $ipdat_url
                        }
                    }
                }' >"$CONFIG_FILE"
            print_success "Created new config file with geodat settings"
            return 0
        fi

        # Create temporary file
        temp_file="${CONFIG_FILE}.tmp"

        # Merge into existing geo object instead of replacing
        if jq \
            --arg sitedat_path "$sitedat_path" \
            --arg sitedat_url "$sitedat_url" \
            --arg ipdat_path "$ipdat_path" \
            --arg ipdat_url "$ipdat_url" \
            '.system.geo = (.system.geo // {}) + {
                 sitedat_path: $sitedat_path,
                 sitedat_url: $sitedat_url,
                 ipdat_path: $ipdat_path,
                 ipdat_url: $ipdat_url
             }' \
            "$CONFIG_FILE" >"$temp_file" 2>/dev/null; then

            mv "$temp_file" "$CONFIG_FILE" || {
                print_error "Failed to update config file"
                rm -f "$temp_file"
                return 1
            }
            print_success "Config updated:"
            print_success "  Geosite: $sitedat_path"
            print_success "  URL: $sitedat_url"
            print_success "  GeoIP:   $ipdat_path"
            print_success "  URL: $ipdat_url"

            # Show what was actually written
            print_info "Verifying config..."
            if command_exists jq; then
                jq '.system.geo' "$CONFIG_FILE" 2>/dev/null || true
            fi
            return 0
        else
            print_error "Failed to parse config with jq"
            rm -f "$temp_file"
            return 1
        fi
    else
        print_warning "jq not found - cannot automatically update config"
        print_info "Please manually add to your config file:"
        print_info '  "system": {'
        print_info '    "geo": {'
        print_info "      \"sitedat_path\": \"$sitedat_path\","
        print_info "      \"sitedat_url\": \"$sitedat_url\","
        print_info "      \"ipdat_path\": \"$ipdat_path\","
        print_info "      \"ipdat_url\": \"$ipdat_url\""
        print_info '    }'
        print_info '  }'
        echo ""
        print_info "Or update paths in B4 Web UI: Settings -> Geodat Settings"
        return 0
    fi
}

# Setup geosite data
setup_geodat() {
    echo ""
    echo "======================================="
    echo "  GEO Data Setup"
    echo "======================================="
    echo ""

    if [ -z "$GEOSITE_SRC" ] && [ -z "$GEOSITE_DST" ]; then
        # Skip prompts in quiet mode
        if [ "$QUIET_MODE" = "1" ]; then
            print_info "Geosite setup skipped (quiet mode)"
            return 0
        fi

        printf "${CYAN}Do you want to download geosite.dat & geoip.dat files? (y/N): ${NC}"
        read answer
    else
        answer="y"
    fi

    case "$answer" in
    [yY] | [yY][eE][sS])
        # Select source
        if [ -z "$GEOSITE_SRC" ]; then
            sitedat_url=$(select_geo_source)
            if [ $? -ne 0 ] || [ -z "$sitedat_url" ]; then
                print_info "Geosite setup skipped"
                return 0
            fi
        else
            sitedat_url="$GEOSITE_SRC"
            print_info "Using geosite source: $sitedat_url"
        fi

        # Set default directory BEFORE using it
        default_dir="$CONFIG_DIR"

        # Try to get existing path from config
        existing_dir=$(get_geodat_from_config || true)
        if [ -n "$existing_dir" ]; then
            default_dir="$existing_dir"
            print_info "Found existing geosite path in config: $default_dir"
        fi

        if [ -z "$GEOSITE_DST" ]; then
            # Skip in quiet mode - use default
            if [ "$QUIET_MODE" = "1" ]; then
                geosite_dst_dir="$default_dir"
            else
                echo ""
                printf "${CYAN}Save directory [${default_dir}]: ${NC}"
                read geosite_dst_dir

                if [ -z "$geosite_dst_dir" ]; then
                    geosite_dst_dir="$default_dir"
                fi
            fi
        else
            geosite_dst_dir="$GEOSITE_DST"
            print_info "Using geodat destination: $geosite_dst_dir"
        fi

        # Download geosite file
        download_geodat "$sitedat_url" "$geosite_dst_dir"
        sitedat_path="${geosite_dst_dir}/geosite.dat"
        ipdat_path="${geosite_dst_dir}/geoip.dat"

        # Update config
        update_config_geodat_path "$sitedat_path" "$ipdat_path" "$sitedat_url"

        print_success "Geosite setup completed!"
        return 0

        ;;
    *)
        print_info "Geosite setup skipped"
        ;;
    esac

    echo ""
    return 0
}
