#!/bin/sh
# Main function - parse arguments
main() {
    # Check for remove flag first
    for arg in "$@"; do
        case "$arg" in
        --remove | --uninstall | -r)
            check_root
            remove_b4
            exit 0
            ;;
        --update | -u)
            check_root
            perform_update "$@"
            exit 0
            ;;
        --info | -i | --sysinfo)
            show_system_info
            exit 0
            ;;
        --help | -h)
            echo "Usage: $0 [OPTIONS] [VERSION]"
            echo ""
            echo "Options:"
            echo "  --sysinfo, -i       Show system information and b4 status"
            echo "  --remove, -r        Uninstall b4 from the system"
            echo "  --update, -u        Update b4 to latest version"
            echo "  --arch=ARCH         Force architecture (skip auto-detection)"
            echo "  --help, -h          Show this help message"
            echo "  --quiet, -q         Suppress output except for errors"
            echo "  --geosite-src URL   Specify geosite.dat source URL"
            echo "  --geosite-dst DIR   Specify directory to save geosite.dat"
            echo "  VERSION             Install specific version (e.g., v1.4.0)"
            echo ""
            echo "Architectures:"
            echo "  amd64, 386, arm64, armv5, armv6, armv7,"
            echo "  mips, mipsle, mips_softfloat, mipsle_softfloat,"
            echo "  mips64, mips64le, loong64, ppc64, ppc64le, riscv64, s390x"
            echo ""
            echo "Examples:"
            echo "  $0                          Install latest version"
            echo "  $0 v1.4.0                   Install version 1.4.0"
            echo "  $0 --arch=mipsle_softfloat  Force architecture"
            echo "  $0 --sysinfo                Show system diagnostics"
            echo "  $0 --update                 Update to latest version"
            echo "  $0 --remove                 Uninstall b4"
            exit 0
            ;;
        esac
    done

    # No remove/update flag found, proceed with installation
    main_install "$@"
}

# Run main function
main "$@"
