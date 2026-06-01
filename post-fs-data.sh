#!/system/bin/sh
# Copyright (c) 2026 Flopster101
# SPDX-License-Identifier: GPL-3.0
# Apply early boot properties before Android userspace settles.

MODDIR="${0%/*}"

if [ -f "$MODDIR/tweaks/hwui.sh" ]; then
    sh "$MODDIR/tweaks/hwui.sh" apply_saved
fi
