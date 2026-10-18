// ==UserScript==
// @name         ZTE Router Ultimate Dashboard (v13.1)
// @namespace    http://tampermonkey.net/
// @version      13.1
// @description  Full Dashboard with Bandwidth, EARFCN, Temps, Cell Locks, Version Info, and Clear Exit Button.
// @author       Miononno (Original Logic) / Refined by User
// @match        http://192.168.0.1/*
// @match        http://192.168.1.1/*
// @match        http://192.168.254.1/*
// @match        http://192.168.8.1/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=zte.com.cn
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    console.log("Loading ZTE Ultimate Dashboard v13.1...");

    // --- CONFIGURATION ---
    window.siginfo =
        "wan_active_band,wan_active_channel,wan_lte_ca,wan_apn,wan_ipaddr,wan_ipaddr_v6," +
        "cell_id,dns_mode,prefer_dns_manual,standby_dns_manual,network_type," +
        "network_provider_fullname,rmcc,rmnc," +
        "bandwidth,tx_power,rssi,rscp,ecio," +
        "lte_multi_ca_scell_info,lte_multi_ca_scell_sig_info," +
        "lte_band,lte_rsrp,lte_rsrq,lte_rssi,lte_snr," +
        "lte_ca_pcell_band,lte_ca_pcell_freq,lte_ca_pcell_bandwidth,lte_ca_pcell_arfcn," +
        "lte_ca_scell_band,lte_ca_scell_bandwidth,lte_ca_scell_arfcn," +
        "lte_rsrp_1,lte_rsrp_2,lte_rsrp_3,lte_rsrp_4," +
        "lte_snr_1,lte_snr_2,lte_snr_3,lte_snr_4," +
        "lte_pci,lte_pci_lock,lte_earfcn_lock," +
        "nr5g_pci,nr5g_action_channel,nr5g_action_band,nr5g_cell_id," +
        "Z5g_rsrp,Z5g_rsrq,Z5g_SINR," +
        "nr_ca_pcell_band,nr_ca_pcell_freq,nr_multi_ca_scell_info," +
        "pm_sensor_mdm,pm_modem_5g,pm_sensor_pa1,wifi_chip_temp," +
        "hardware_version,web_version,wa_inner_version,cr_version";

    // --- HELPERS ---
    // Added cookWithRequest support for newer ZTE firmwares
    window.hash = function(s) {
        if (typeof cookWithRequest === "function") return cookWithRequest(s);
        if (typeof SHA256 === "function") return SHA256(s);
        if (typeof hex_md5 === "function") return hex_md5(s);
        return s;
    };

    var unhideTimer = null;

    function run_cmd(goformId, data, successCb) {
        $.ajax({
            type: "GET", url: "/goform/goform_get_cmd_process",
            data: { cmd: "wa_inner_version,cr_version,RD", multi_data: "1" },
            dataType: "json",
            success: function(a) {
                var ad = window.hash(window.hash(a.wa_inner_version + a.cr_version) + a.RD);
                data.isTest = "false";
                data.goformId = goformId;
                data.AD = ad;
                $.ajax({ type: "POST", url: "/goform/goform_set_cmd_process", data: data, success: successCb });
            },
            error: function(e) { console.error("Command Failed", e); alert("Command Failed. Are you logged in?"); }
        });
    }

    // --- ACTIONS ---

    window.unhide_force = function() {
        alert("Forcing ALL hidden settings...");
        if (unhideTimer) clearInterval(unhideTimer);
        unhideTimer = setInterval(function() {
            $("*").each(function() {
                var el = $(this);
                var cls = el.attr("class") || "";
                var id = el.attr("id") || "";

                // Skip Dashboard elements (prevents bugs)
                if (id.startsWith("zte_") || cls.includes("zte_") || el.closest("#zte_ultimate_ui").length) return;

                // Skip generic router UI loading/modals
                if (cls.includes("loading") || cls.includes("modal") || cls.includes("dialog") || el.prop("tagName") == "SCRIPT") return;

                if (el.css("display") == "none" || el.hasClass("hide")) {
                    el.removeClass("hide hidden");
                    el.css("display", "");
                    if(el.css("display") == "none") el.css("display", "block");
                    if (el.css("border-left-color") != "rgb(255, 0, 0)") el.css("border-left", "2px solid red");
                }
                if ((el.prop("tagName") == "INPUT" || el.prop("tagName") == "SELECT") && el.prop("disabled")) {
                    el.prop("disabled", false);
                    el.css("background-color", "#ffffe0");
                }
            });
            $("#ipv4_section, #ipv6_section, .item_content").show();
        }, 2000);
        setTimeout(() => clearInterval(unhideTimer), 30000);
    };

    // --- COMMAND HANDLERS ---

    window.set_net_mode_cmd = function(mode) {
        if (!mode) return;
        run_cmd("SET_BEARER_PREFERENCE", { BearerPreference: mode }, function() { alert("Network Mode set to: " + mode); $("#zte_popup").hide(); });
    };

    window.lte_band_set_cmd = function(bands) {
        if (!bands) return;
        var mask = "0xA3E2AB0908DF";
        if (bands.toUpperCase() !== "AUTO") {
             var b_arr = bands.split("+");
             var n = 0;
             for (var l = 0; l < b_arr.length; l++) {
                 var clean = b_arr[l].toUpperCase().replace("B","");
                 n += Math.pow(2, parseInt(clean) - 1);
             }
             mask = "0x" + n.toString(16);
        }
        run_cmd("BAND_SELECT", { is_gw_band: 0, gw_band_mask: 0, is_lte_band: 1, lte_band_mask: mask }, function() { alert("LTE Bands Set: " + bands); $("#zte_popup").hide(); });
    };

    window.nr_band_set_cmd = function(bands) {
        if (!bands) return;
        var mask = bands.split("+").join(",");
        mask = mask.toUpperCase().replace(/N/g, "");
        if (bands.toUpperCase() === "AUTO") mask = "1,2,3,5,7,8,20,28,38,41,50,51,66,70,71,74,75,76,77,78,79,80,81,82,83,84";
        run_cmd("WAN_PERFORM_NR5G_BAND_LOCK", { nr5g_band_mask: mask }, function() { alert("5G Bands Set: " + bands); $("#zte_popup").hide(); });
    };

    window.bridge_set_cmd = function(val) {
        var enable = (val === "1");
        if (!confirm((enable ? "Enable" : "Disable") + " Bridge Mode? Router will reboot.")) return;
        run_cmd("OPERATION_MODE", { opMode: (enable ? "LTE_BRIDGE" : "PPP"), ethernet_port_specified: "1" }, () => alert("Bridge Mode Updated. Rebooting..."));
        setTimeout(() => run_cmd("REBOOT_DEVICE", {}, null), 1000);
        $("#zte_popup").hide();
    };

    window.arp_set_cmd = function(val) {
        var enable = (val === "1");
        if (!confirm((enable ? "Enable" : "Disable") + " ARP Proxy? Router will reboot.")) return;
        run_cmd("ARP_PROXY_SWITCH", { arp_proxy_switch: enable ? 1 : 0 }, () => alert("ARP Proxy Updated. Rebooting..."));
        setTimeout(() => run_cmd("REBOOT_DEVICE", {}, null), 1000);
        $("#zte_popup").hide();
    };

    // --- LOCKING HANDLERS (Auto-fills current active cell) ---

    window.lock_lte_set = function() {
        var currentPci = window.lte_pci ? parseInt(window.lte_pci, 16) : "116";
        var currentEarfcn = window.lte_ca_pcell_arfcn || window.wan_active_channel || "3350";
        var d = prompt("LTE Lock: PCI,EARFCN (e.g. 116,3350)", currentPci + "," + currentEarfcn);
        if(d) {
            var p = d.split(',');
            run_cmd("LTE_LOCK_CELL_SET", {lte_pci_lock:p[0].trim(), lte_earfcn_lock:p[1].trim()}, ()=> window.reboot(true));
        }
    };

    window.lock_lte_remove = function() {
        if(confirm("Remove LTE Cell Lock?")) {
            run_cmd("LTE_LOCK_CELL_SET", {lte_pci_lock:0, lte_earfcn_lock:0}, ()=> window.reboot(true));
        }
    };

    window.lock_nr_set = function() {
        var currentNrPci = window.nr5g_pci ? parseInt(window.nr5g_pci, 16) : "202";
        var currentNrArfcn = window.nr5g_action_channel || "639936";
        var currentNrBand = (window.nr5g_action_band || "78").toString().replace(/n/gi, "");
        var defVal = currentNrPci + "," + currentNrArfcn + "," + currentNrBand + ",30";
        var d = prompt("5G Lock: PCI,ARFCN,BAND,SCS (e.g. 202,639936,78,30)", defVal);
        if(d) run_cmd("NR5G_LOCK_CELL_SET", {nr5g_cell_lock:d.trim()}, ()=> window.reboot(true));
    };

    window.lock_nr_remove = function() {
        if(confirm("Remove 5G Cell Lock?")) {
            run_cmd("NR5G_LOCK_CELL_SET", {nr5g_cell_lock:"0,0,0,0"}, ()=> window.reboot(true));
        }
    };

    // --- POPUP BUILDERS ---

    window.open_net_popup = function() {
        var opts = [
            {l:"Auto", v:"WL_AND_5G"}, {l:"5G SA", v:"Only_5G"}, {l:"5G NSA", v:"LTE_AND_5G"},
            {l:"5G SA/NSA/LTE", v:"4G_AND_5G"}, {l:"LTE", v:"Only_LTE"}, {l:"3G", v:"Only_WCDMA"}, {l:"2G", v:"Only_GSM"}
        ];
        build_popup("Network Mode", opts, "set_net_mode_cmd");
    };

    window.open_lte_popup = function() {
        var opts = [
            {l:"Auto", v:"AUTO"}, {l:"B1", v:"1"}, {l:"B3", v:"3"}, {l:"B7", v:"7"},
            {l:"B8", v:"8"}, {l:"B20", v:"20"}, {l:"B1+B3", v:"1+3"}, {l:"B1+B3+B7", v:"1+3+7"}
        ];
        build_popup("LTE Bands", opts, "lte_band_set_cmd");
    };

    window.open_nr_popup = function() {
        var opts = [
            {l:"Auto", v:"AUTO"}, {l:"N1", v:"1"}, {l:"N3", v:"3"}, {l:"N7", v:"7"},
            {l:"N28", v:"28"}, {l:"N28+N75", v:"28+75"}, {l:"N78", v:"78"}, {l:"N78+N28+N75", v:"78+28+75"}
        ];
        build_popup("5G Bands", opts, "nr_band_set_cmd");
    };

    window.open_bridge_popup = function() {
        var opts = [{l:"Enable Bridge", v:"1"}, {l:"Disable Bridge", v:"0"}];
        build_popup("Bridge Mode", opts, "bridge_set_cmd", false);
    };

    window.open_arp_popup = function() {
        var opts = [{l:"Enable ARP", v:"1"}, {l:"Disable ARP", v:"0"}];
        build_popup("ARP Proxy", opts, "arp_set_cmd", false);
    };

    window.open_info_popup = function() {
        var html = `
            <div class="p-title">Version Information</div>
            <div style="font-size:12px; line-height:1.6; color:#ccc">
                <div class="val-row"><span>Device Model:</span> <span style="color:#fff">${window.hardware_version || "Loading..."}</span></div>
                <div class="val-row"><span>Firmware (WA):</span> <span style="color:#40adf5">${window.wa_inner_version || "--"}</span></div>
                <div class="val-row"><span>Web UI Version:</span> <span style="color:#fff">${window.web_version || "--"}</span></div>
                <div class="val-row"><span>CR Version:</span> <span style="color:#fff">${window.cr_version || "--"}</span></div>
            </div>
            <div class="btn danger" style="margin-top:15px" onclick="$('#zte_popup').hide()">Close</div>
        `;
        $("#zte_popup_content").html(html);
        $("#zte_popup").show();
    };

    function build_popup(title, options, callbackName, showCustom = true) {
        var html = `<div class="p-title">${title}</div><div class="p-grid">`;
        options.forEach(o => {
            var style = (o.l.includes("Disable")) ? 'style="border-color:#d32f2f; color:#ffcdd2"' : '';
            html += `<div class="btn" ${style} onclick="${callbackName}('${o.v}')">${o.l}</div>`;
        });
        html += `</div>`;
        if(showCustom) {
            html += `
            <div style="margin-top:10px; border-top:1px solid #444; padding-top:5px;">
                <div style="font-size:11px; color:#aaa; margin-bottom:5px">Custom Value</div>
                <div style="display:flex; gap:5px">
                    <input type="text" id="custom_val" placeholder="e.g. 1+3" style="flex:1; background:#222; border:1px solid #555; color:#fff; padding:4px;">
                    <div class="btn" style="flex:0 0 60px" onclick="${callbackName}($('#custom_val').val())">Set</div>
                </div>
            </div>`;
        }
        html += `<div class="btn danger" style="margin-top:10px" onclick="$('#zte_popup').hide()">Close</div>`;
        $("#zte_popup_content").html(html);
        $("#zte_popup").show();
    }

    // --- REBOOT LOGIC ---
    window.reboot = function(force) {
        if(force || confirm("Reboot Router?")) {
            run_cmd("REBOOT_DEVICE", {}, ()=>alert("Rebooting..."));
        }
    };

    // --- DATA PARSING & FORMATTING ---

    function clean_bw(bw) {
        if (!bw) return "";
        var n = parseFloat(bw.toString().replace("MHz", ""));
        if (isNaN(n)) return "";
        return n + "M";
    }

    function get_status() {
        $.ajax({
            type: "GET", url: "/goform/goform_get_cmd_process",
            data: { cmd: window.siginfo, multi_data: "1" }, dataType: "json",
            success: function(data) {
                for (var key in data) window[key] = data[key];
                $("#dash_prov").text(data.network_provider_fullname || "N/A");
                $("#dash_net").text(data.network_type || "N/A");
                $("#dash_apn").text(data.wan_apn || "N/A");
                $("#dash_ip").text(data.wan_ipaddr || "N/A");
                $("#dash_ca").html(data.wan_lte_ca === "ca_activated" ? "<span class='tag_active'>CA ACTIVE</span>" : "<span class='tag_inactive'>NO CA</span>");

                // eNB ID & Temps
                var enb = data.cell_id ? Math.trunc(parseInt(data.cell_id, 16) / 256) : "--";
                $("#dash_enb").text(isNaN(enb) ? "--" : enb);
                var t4g = data.pm_sensor_mdm ? data.pm_sensor_mdm + "°C" : "--";
                var t5g = data.pm_modem_5g ? data.pm_modem_5g + "°C" : "--";
                $("#dash_temp").text(t4g + " / " + t5g);

                // --- LTE BANDS & BW LOGIC ---
                var lte_summary = [];
                var pcc_bw = clean_bw(data.lte_ca_pcell_bandwidth || data.bandwidth);
                var pcc_band = data.lte_ca_pcell_band || data.lte_band;
                if(pcc_band) lte_summary.push("B" + pcc_band.toString().replace(/B/gi, "") + (pcc_bw ? " (" + pcc_bw + ")" : ""));

                if(data.lte_multi_ca_scell_info) {
                    data.lte_multi_ca_scell_info.split(";").forEach(c => {
                        var p = c.split(",");
                        if(p.length > 5) {
                            var s_band = p[3];
                            var s_bw = clean_bw(p[5]);
                            lte_summary.push("B" + s_band + (s_bw ? " (" + s_bw + ")" : ""));
                        }
                    });
                }
                $("#dash_lte_bands").text(lte_summary.join(" + ") || "No LTE");

                // --- NR BANDS & BW LOGIC ---
                var nr_summary = [];
                var nr_pcc_band = data.nr5g_action_band;
                var nr_pcc_bw = ""; 
                if(data.nr_multi_ca_scell_info && nr_pcc_band) {
                     var nr_rows = data.nr_multi_ca_scell_info.split(";");
                     var match = nr_rows.find(r => r.includes("," + nr_pcc_band + ",") || r.includes(",n" + nr_pcc_band + ","));
                     if(match) nr_pcc_bw = clean_bw(match.split(",")[5]);
                }
                if(nr_pcc_band) nr_summary.push(nr_pcc_band + (nr_pcc_bw ? " (" + nr_pcc_bw + ")" : ""));

                if(data.nr_multi_ca_scell_info) {
                     data.nr_multi_ca_scell_info.split(";").forEach(c => {
                        var p = c.split(",");
                        if(p.length > 5) {
                            var n_band = p[3];
                            if (n_band !== nr_pcc_band && n_band !== "n"+nr_pcc_band) {
                                var n_bw = clean_bw(p[5]);
                                nr_summary.push(n_band + (n_bw ? " (" + n_bw + ")" : ""));
                            }
                        }
                     });
                }
                $("#dash_nr_bands").text(nr_summary.join(" + ") || "No 5G");

                // --- TABLES ---
                var lte_html = "";
                if(data.lte_pci) {
                    var dec_lte_pci = parseInt(data.lte_pci, 16);
                    var pcc_earfcn = data.lte_ca_pcell_arfcn || data.wan_active_channel || "--";
                    lte_html += render_row("Primary", "B"+pcc_band, dec_lte_pci, pcc_earfcn, pcc_bw ? pcc_bw+"Hz" : "", data.lte_rsrp, data.lte_snr);
                }
                
                if(data.lte_multi_ca_scell_info) {
                    data.lte_multi_ca_scell_info.split(";").forEach((sc, idx) => {
                        if(!sc) return; var parts = sc.split(","); if(parts.length < 6) return;
                        var rsrp = ""; var sinr = "";
                        if(data.lte_multi_ca_scell_sig_info && data.lte_multi_ca_scell_sig_info.split(";")[idx]) {
                            var sp = data.lte_multi_ca_scell_sig_info.split(";")[idx].split(","); rsrp = sp[0]; sinr = sp[2];
                        }
                        var s_bw = clean_bw(parts[5]);
                        lte_html += render_row("SCell " + (idx+1), "B"+parts[3], parts[1], parts[4], s_bw ? s_bw+"Hz" : "", rsrp, sinr);
                    });
                }
                $("#lte_table_body").html(lte_html);

                var nr_html = "";
                if(data.nr5g_pci) {
                    var dec_nr_pci = parseInt(data.nr5g_pci, 16);
                    var nr_arfcn = data.nr5g_action_channel || "--";
                    nr_html += render_row("Primary", nr_pcc_band, dec_nr_pci, nr_arfcn, nr_pcc_bw ? nr_pcc_bw+"Hz" : "", data.Z5g_rsrp, data.Z5g_SINR);
                }
                if(data.nr_multi_ca_scell_info) {
                    data.nr_multi_ca_scell_info.split(";").forEach((sc, idx) => {
                        if(!sc) return; var parts = sc.split(","); if(parts.length < 6) return;
                        if (parts[3] !== nr_pcc_band && parts[3] !== "n"+nr_pcc_band) {
                             var n_bw = clean_bw(parts[5]);
                             nr_html += render_row("SCell", parts[3], parts[1], parts[4], n_bw ? n_bw+"Hz" : "", parts[7], parts[9]);
                        }
                    });
                }
                $("#nr_table_body").html(nr_html);
            }
        });
    }

    function render_row(label, band, pci, earfcn, bw, rsrp, sinr) {
        if(rsrp == "-44" || rsrp == "-32768" || !rsrp) rsrp = "--";
        if(!sinr) sinr = "--";
        var c_rsrp = (parseInt(rsrp)>-80)?'good':(parseInt(rsrp)>-100)?'mid':'bad';
        var c_sinr = (parseInt(sinr)>20)?'good':(parseInt(sinr)>10)?'mid':'bad';
        return `<tr>
            <td style="color:#aaa">${label}</td>
            <td style="font-weight:bold; color:#40adf5">${band}</td>
            <td>${bw}</td>
            <td>PCI:${pci}</td>
            <td style="color:#999">CH:${earfcn}</td>
            <td class="sig_${c_rsrp}">${rsrp} <small>dBm</small></td>
            <td class="sig_${c_sinr}">${sinr} <small>dB</small></td>
        </tr>`;
    }

    function inject_ui() {
        if ($("#zte_ultimate_ui").length) return;
        var css = `
            <style>
                #zte_ultimate_ui { position: fixed; top: 20px; right: 20px; width: 460px; background: rgba(18, 22, 30, 0.98); color: #ddd; font-family: 'Segoe UI', sans-serif; font-size: 13px; border: 1px solid #444; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.8); z-index: 99999; backdrop-filter: blur(10px); }
                #zte_ultimate_ui .head { padding: 10px 15px; background: #222838; border-bottom: 1px solid #444; display: flex; justify-content: space-between; align-items: center; border-radius: 8px 8px 0 0; }
                #zte_ultimate_ui .title { font-weight: 700; color: #40adf5; font-size: 14px; }
                #zte_ultimate_ui .body { padding: 15px; max-height: 85vh; overflow-y: auto; }
                #zte_ultimate_ui .box { background: #1a1f2b; border: 1px solid #333; border-radius: 6px; padding: 10px; margin-bottom: 10px; }
                #zte_ultimate_ui .label { color: #888; font-size: 11px; text-transform: uppercase; margin-bottom: 8px; margin-top:5px; }
                #zte_ultimate_ui .val-row { display: flex; justify-content: space-between; border-bottom: 1px solid #2a3040; padding-bottom: 2px; margin-bottom: 3px; }
                #zte_ultimate_ui .val-row span:last-child { color: #fff; font-weight: 600; }
                #zte_ultimate_ui .tag_active { background: #1b5e20; color: #a5d6a7; padding: 2px 6px; border-radius: 4px; font-size: 10px; }
                #zte_ultimate_ui .tag_inactive { background: #333; color: #777; padding: 2px 6px; border-radius: 4px; font-size: 10px; }
                #zte_ultimate_ui .sig-table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
                #zte_ultimate_ui .sig-table td { padding: 4px 2px; border-bottom: 1px solid #2a3040; }
                #zte_ultimate_ui .sig_good { color: #4caf50; font-weight: bold; }
                #zte_ultimate_ui .sig_mid { color: #ffeb3b; font-weight: bold; }
                #zte_ultimate_ui .sig_bad { color: #f44336; font-weight: bold; }
                #zte_ultimate_ui .btn { background: #2b3245; color: #ccc; border: 1px solid #444; padding: 6px 10px; border-radius: 4px; cursor: pointer; text-align: center; font-size: 12px; display:inline-block; flex:1; text-decoration: none; }
                #zte_ultimate_ui .btn:hover { background: #40adf5; color: #fff; border-color: #40adf5; }
                #zte_ultimate_ui .btn.danger:hover { background: #d32f2f; border-color: #d32f2f; }
                #zte_ultimate_ui .btn-sm { font-size: 11px; padding: 4px 0; }
                #zte_ultimate_ui .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom:8px;}
                #zte_ultimate_ui .grid-4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 5px; margin-bottom:8px;}
                #zte_ultimate_ui .grid-1 { display: grid; grid-template-columns: 1fr; gap: 5px; margin-bottom:8px;}

                /* POPUP */
                #zte_popup { display:none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 300px; background: #151922; border: 1px solid #555; box-shadow: 0 0 50px rgba(0,0,0,0.9); z-index: 100000; padding: 15px; border-radius: 8px; }
                #zte_ultimate_ui .p-title { font-weight:bold; color:#fff; margin-bottom:10px; border-bottom:1px solid #333; padding-bottom:5px; }
                #zte_ultimate_ui .p-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; }
                #zte_ultimate_ui ::-webkit-scrollbar { width: 6px; }
                #zte_ultimate_ui ::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; }
                #zte_ultimate_ui ::-webkit-scrollbar-track { background: #1a1a1a; }
            </style>
        `;
        var html = `
            <div id="zte_ultimate_ui">
                <div class="head"><span class="title">ZTE COMMANDER V13.1</span><span id="dash_prov" style="font-size:11px; color:#aaa">--</span></div>
                <div class="body">
                    <div class="box">
                        <div class="grid-2" style="margin-bottom:0">
                            <div>
                                <div class="val-row"><span>Net:</span> <span id="dash_net">--</span></div>
                                <div class="val-row"><span>IP:</span> <span id="dash_ip">--</span></div>
                                <div class="val-row"><span>eNB ID:</span> <span id="dash_enb">--</span></div>
                            </div>
                            <div>
                                <div class="val-row"><span>APN:</span> <span id="dash_apn">--</span></div>
                                <div class="val-row"><span>Mode:</span> <span id="dash_ca">--</span></div>
                                <div class="val-row"><span>Temp (4G/5G):</span> <span id="dash_temp">--</span></div>
                            </div>
                        </div>
                    </div>
                    <div class="box"><div class="label">LTE Bands</div><span id="dash_lte_bands" style="color:#fff; font-weight:bold">--</span></div>
                    <div class="box"><div class="label">5G Bands</div><span id="dash_nr_bands" style="color:#fff; font-weight:bold">--</span></div>
                    <div class="box" style="max-height:150px; overflow-y:auto"><table class="sig-table"><tbody id="lte_table_body"></tbody></table><table class="sig-table"><tbody id="nr_table_body"></tbody></table></div>

                    <div class="label">Configuration</div>
                    <div class="grid-2">
                        <div class="btn" onclick="open_net_popup()">Set Network Mode</div>
                        <div class="btn" onclick="open_lte_popup()">Set 4G Bands</div>
                        <div class="btn" onclick="open_nr_popup()">Set 5G Bands</div>
                        <div class="btn" onclick="unhide_force()" style="color:#d4af37; border-color:#d4af37">FORCE UNHIDE</div>
                    </div>

                    <div class="label">Advanced</div>
                    <div class="grid-2">
                         <div class="btn" onclick="open_bridge_popup()">Bridge Mode</div>
                         <div class="btn" onclick="open_arp_popup()">ARP Proxy</div>
                    </div>

                    <div class="label">Cell Locking</div>
                    <div class="grid-2">
                        <div class="btn" onclick="lock_lte_set()">LTE Cell Lock</div>
                        <div class="btn" onclick="lock_lte_remove()">Remove LTE Lock</div>
                        <div class="btn" onclick="lock_nr_set()">5G Cell Lock</div>
                        <div class="btn" onclick="lock_nr_remove()">Remove 5G Lock</div>
                    </div>

                    <div class="label">System & Hidden</div>
                    <div class="grid-4">
                        <a class="btn btn-sm" href="#debug_page">Debug</a>
                        <a class="btn btn-sm" href="#thermal_switch">Thermal</a>
                        <a class="btn btn-sm" href="#ant_switch">Antenna</a>
                        <a class="btn btn-sm" href="#network_info">Net Page</a>
                    </div>
                    <div class="grid-2" style="margin-top:5px">
                        <div class="btn" onclick="open_info_popup()">Version Info</div>
                        <div class="btn danger" onclick="reboot(true)">!!! FORCE REBOOT !!!</div>
                    </div>
                    <div class="grid-1" style="margin-top:5px">
                        <div class="btn danger" onclick="location.reload()">Exit - Refresh Page</div>
                    </div>
                </div>
                <div id="zte_popup"><div id="zte_popup_content"></div></div>
            </div>
        `;
        $("head").append(css); $("body").append(html);
    }

    var checkReady = setInterval(function() { if (window.jQuery) { clearInterval(checkReady); init(); } }, 500);
    function init() { inject_ui(); setInterval(get_status, 2000); get_status(); }
})();
