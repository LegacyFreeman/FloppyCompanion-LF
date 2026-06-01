#!/system/bin/sh
# Copyright (c) 2026 Flopster101
# SPDX-License-Identifier: GPL-3.0
# HWUI renderer tweak backend

MODDIR="${0%/*}/.."
DATA_DIR="/data/adb/floppy_companion"
CONFIG_FILE="$DATA_DIR/config/hwui.conf"

get_rom_default() {
    local prop_line
    local prop_value

    prop_line=$(getprop | grep '^\[ro\.hwui\.use_vulkan\]:' | head -n 1)
    if [ -z "$prop_line" ]; then
        echo "Unknown"
        return 0
    fi

    prop_value=$(getprop ro.hwui.use_vulkan 2>/dev/null)
    if [ "$prop_value" = "true" ]; then
        echo "Vulkan"
        return 0
    fi

    if [ -z "$prop_value" ]; then
        echo "OpenGL"
        return 0
    fi

    echo "OpenGL"
}

normalize_renderer() {
    case "$1" in
        default|skiagl|skiavk)
            echo "$1"
            ;;
        *)
            echo "default"
            ;;
    esac
}

get_current() {
    local renderer
    renderer=$(getprop debug.hwui.renderer 2>/dev/null)
    renderer=$(normalize_renderer "$renderer")

    echo "renderer=$renderer"
    echo "rom_default=$(get_rom_default)"
}

get_saved() {
    if [ -f "$CONFIG_FILE" ]; then
        cat "$CONFIG_FILE"
    else
        echo "renderer="
    fi
}

save() {
    local renderer

    if [ "$#" -eq 0 ]; then
        rm -f "$CONFIG_FILE"
        echo "saved"
        return 0
    fi

    if echo "$1" | grep -q '='; then
        renderer=""
        for arg in "$@"; do
            key="${arg%%=*}"
            val="${arg#*=}"
            [ "$key" = "renderer" ] && renderer="$val"
        done
    else
        renderer="$1"
    fi

    renderer=$(normalize_renderer "$renderer")
    mkdir -p "$(dirname "$CONFIG_FILE")"

    if [ "$renderer" = "default" ]; then
        rm -f "$CONFIG_FILE"
    else
        echo "renderer=$renderer" > "$CONFIG_FILE"
    fi

    echo "saved"
}

apply() {
    local renderer
    renderer=$(normalize_renderer "$1")

    if [ "$renderer" = "default" ]; then
        if command -v resetprop >/dev/null 2>&1; then
            resetprop -d debug.hwui.renderer >/dev/null 2>&1 || true
        fi
        setprop debug.hwui.renderer "" 2>/dev/null || true
        echo "applied"
        return 0
    fi

    setprop debug.hwui.renderer "$renderer" 2>/dev/null
    echo "applied"
}

apply_saved() {
    local renderer

    if [ ! -f "$CONFIG_FILE" ]; then
        return 0
    fi

    renderer=$(grep '^renderer=' "$CONFIG_FILE" | cut -d= -f2)
    [ -n "$renderer" ] || return 0

    apply "$renderer"
}

case "$1" in
    get_current)
        get_current
        ;;
    get_saved)
        get_saved
        ;;
    save)
        shift
        save "$@"
        ;;
    apply)
        apply "$2"
        ;;
    apply_saved)
        apply_saved
        ;;
    rom_default)
        get_rom_default
        ;;
    *)
        echo "usage: $0 {get_current|get_saved|save|apply|apply_saved|rom_default}"
        exit 1
        ;;
esac
