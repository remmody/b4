#!/bin/sh
# B4 Universal Installer Script (POSIX Compliant)
# Automatically detects system architecture and installs the appropriate b4 binary
# Supports OpenWRT, MerlinWRT, and other Linux-based routers with only sh shell
#
# AUTO-GENERATED - Do not edit directly
# Edit files in installer/ and run installer/build.sh
#

set -e

# Entware paths first so wget-ssl/curl from /opt/bin are preferred over BusyBox
export PATH="/opt/bin:/opt/sbin:$HOME/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/snap/bin:$PATH"
