# ZTE 5G Router Ultimate Dashboard (Commander v13)

A custom floating dashboard script for ZTE 5G CPEs and Outdoor Units (like the MC888, MC889, and MC801A). It builds on Miononno's core API logic, tweaking it for better stability, live bandwidth tracking, and easy access to hidden router menus. (Note: In some cases and firmware versions, unlocking certain hidden menus may unfortunately require your root password).

## Setup Options

### Option A: Using Tampermonkey (Recommended for Persistent Use)

1. Grab the **[Tampermonkey](https://www.tampermonkey.net/)** extension for Chrome, Edge, Firefox, or Brave.
2. **[Install the Script Directly](https://raw.githubusercontent.com/Paflis/zte-5g-ultimate-dashboard/refs/heads/main/zte-ultimate-dashboard.user.js)** (or open the file on GitHub and hit the `Raw` button).
3. A Tampermonkey installation tab will pop up—click **Install**.
4. Log into your router (`192.168.0.1`, `192.168.1.1`, `192.168.8.1`, or `192.168.254.1`). The dashboard will automatically appear in the top-right corner.

### Option B: Running Purely via Browser Console (No Extensions Needed)

If you prefer not to install any extensions, you can run the script manually:

1. Log into your ZTE router web interface (`192.168.0.1`, `192.168.1.1`, `192.168.8.1`, or `192.168.254.1`).
2. Open your browser's developer tools by pressing **F12** (or `Ctrl+Shift+J` on Windows / `Cmd+Option+J` on Mac) and select the **Console** tab.
3. If your browser blocks pasting scripts, type `allow pasting` into the console and hit **Enter**.
4. Copy the raw JavaScript code of the dashboard (the core code block inside the `(function() { ... })();` wrapper, without the metadata header).
5. Paste it right into the console and hit **Enter**. The dashboard will pop up instantly.

---

## What It Does

* **Live Signal & Bandwidth Tracker:** Shows your active 4G LTE and 5G NR bands alongside real-time channel bandwidth (e.g., `B3 (20M) + B7 (20M)`), plus PCI, RSRP, and SINR stats.
* **Band Locking (4G & 5G):** Pick from quick presets or type in custom band mixes (like `1+3+7` or `28+78`).
* **Cell Locking:** Lock your connection to a specific tower sector or clear out active locks instantly.
* **Safe Force Unhide:** Unmasks hidden carrier settings, grayed-out input boxes, and secret IPv4/IPv6 pages without messing up the dashboard UI.
* **Advanced Tweaks:** Quick toggles for **Bridge Mode** (`LTE_BRIDGE` / `PPP`) and **ARP Proxy**.
* **Hidden Page Shortcuts:** One-click shortcuts to secret router pages like `#debug_page`, `#thermal_switch` (T2), `#ant_switch`, and `#network_info`, alongside quick **Version Info** popups and a **Force Reboot** button.

---

## Quick Reference: Bands & Cell Locking

### Band Selection

* **4G LTE:** Type band numbers joined by a `+` (e.g., `1+3+7` or `1+3+20`). Type `Auto` to clear.
* **5G NR:** Type band numbers joined by a `+` (e.g., `28+78` or `78`). Type `Auto` to clear.

### Cell Locking Syntax

* **LTE Lock:** Format as `PCI,EARFCN` (e.g., `116,3350`).
* **5G Lock:** Format as `PCI,ARFCN,BAND,SCS` (e.g., `202,639936,78,30`).
* **Clearing Locks:** Hit **Remove LTE Lock** or **Remove 5G Lock** to reset values to `0` and trigger a reboot.

---

## Heads-Up

This script talks straight to the router's internal `goform` API. Be careful with cell locking and bridge settings—if you accidentally lock onto a dead tower or lose access, you might need to clear the lock or factory reset the router to get back online.
