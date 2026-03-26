import React, { useState, useEffect } from 'react';
import * as ROSLIB from 'roslib';
import { Wifi, Smartphone, Settings2, Power, ShieldAlert, Cpu, HardDrive, RefreshCw, Moon, Sun, Lock, AlertTriangle, X } from 'lucide-react';

export default function SettingsPage({ ros, wifiData, sysTelemetry, globalState, syncState }) {
    const [scanLoading, setScanLoading] = useState(false);
    const [passwordPrompt, setPasswordPrompt] = useState(null);
    const [wifiPass, setWifiPass] = useState('');

    // UI States
    const [expandedCard, setExpandedCard] = useState(null);
    const [showSoftwareKillModal, setShowSoftwareKillModal] = useState(false);
    const [showHardwareKillModal, setShowHardwareKillModal] = useState(false);

    // Animation States for smooth popups
    const [isAnimating, setIsAnimating] = useState(false);

    const isDark = !globalState || globalState.theme === 'dark';
    const devMode = globalState?.dev_mode === true;

    // Trigger animation classes whenever expandedCard changes
    useEffect(() => {
        if (expandedCard) {
            setTimeout(() => setIsAnimating(true), 10);
        } else {
            setIsAnimating(false);
        }
    }, [expandedCard]);

    const handleCloseCard = () => {
        setIsAnimating(false);
        setTimeout(() => setExpandedCard(null), 300); // Wait for shrink animation before unmounting
    };

    const triggerWifiScan = () => {
        if (!ros) return;
        setScanLoading(true);
        const wifiCmd = new ROSLIB.Topic({ ros: ros, name: '/gui/wifi_command', messageType: 'std_msgs/String' });
        wifiCmd.publish({ data: 'SCAN' });
        setTimeout(() => setScanLoading(false), 3000);
    };

    const triggerWifiConnect = () => {
        if (!ros || !passwordPrompt) return;
        const wifiCmd = new ROSLIB.Topic({ ros: ros, name: '/gui/wifi_command', messageType: 'std_msgs/String' });
        wifiCmd.publish({ data: `CONNECT|${passwordPrompt}|${wifiPass}` });
        setPasswordPrompt(null);
        setWifiPass('');
    };

    const triggerSysCmd = (cmd) => {
        if (!ros) return;
        const sysCmd = new ROSLIB.Topic({ ros: ros, name: '/gui/system_command', messageType: 'std_msgs/String' });
        sysCmd.publish({ data: cmd });
    };

    const toggleTheme = (newTheme) => {
        if (syncState) syncState({ theme: newTheme });
    };

    const toggleDevMode = () => {
        if (syncState) syncState({ dev_mode: !devMode });
    };

    // Standard port options
    const defaultPorts = ['/dev/ttyACM0', '/dev/ttyACM1', '/dev/ttyUSB0', '/dev/ttyUSB1'];

    return (
        <div className="h-full flex flex-col items-center animate-fade-in-up pb-6 px-4 py-8 relative max-w-7xl mx-auto">

            {/* Custom WiFi Password Modal */}
            {passwordPrompt && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md px-4 transition-all">
                    <div className={`transform transition-all duration-300 border p-6 md:p-8 rounded-3xl shadow-2xl max-w-sm w-full ${isDark ? 'bg-slate-900 border-indigo-500/50 shadow-[0_0_40px_rgba(99,102,241,0.2)]' : 'bg-white border-indigo-300'}`}>
                        <h2 className={`text-lg md:text-xl font-bold tracking-widest mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}><Wifi className="text-indigo-500" /> SECURE NETWORK</h2>
                        <div className="mb-4">
                            <label className="text-slate-500 font-mono text-[9px] md:text-[10px] tracking-widest mb-1 block">TARGET SSID</label>
                            <input disabled type="text" value={passwordPrompt} className={`w-full border px-4 py-3 rounded-xl font-bold opacity-80 cursor-not-allowed text-sm ${isDark ? 'bg-slate-950 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-700'}`} />
                        </div>
                        <div className="mb-6">
                            <label className="text-slate-500 font-mono text-[9px] md:text-[10px] tracking-widest mb-1 block">NETWORK PASSWORD</label>
                            <input autoFocus type="password" placeholder="Enter Password..." value={wifiPass} onChange={(e) => setWifiPass(e.target.value)} className={`w-full border px-4 py-3 rounded-xl font-mono text-sm focus:outline-none focus:border-indigo-500 ${isDark ? 'bg-black border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`} />
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setPasswordPrompt(null)} className={`flex-1 py-3 rounded-xl font-bold text-xs md:text-sm transition-all ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}`}>CANCEL</button>
                            <button onClick={triggerWifiConnect} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-bold text-xs md:text-sm transition-all shadow-lg">CONNECT</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Software Shutdown Modal */}
            {showSoftwareKillModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md px-4">
                    <div className={`transform transition-all duration-300 border p-6 md:p-8 rounded-3xl shadow-2xl max-w-md w-full flex flex-col items-center text-center ${isDark ? 'bg-slate-900 border-orange-500/50 shadow-[0_0_40px_rgba(249,115,22,0.2)]' : 'bg-white border-orange-300'}`}>
                        <AlertTriangle size={48} className="text-orange-500 mb-4 animate-pulse" />
                        <h2 className={`text-lg md:text-xl font-bold tracking-widest mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>SOFTWARE HALT</h2>
                        <p className="text-slate-500 text-xs md:text-sm mb-8 font-mono">This will terminate the React UI, Mesh Servers, and all ROS 2 nodes. The physical computer remains powered on.</p>
                        <div className="flex gap-3 w-full">
                            <button onClick={() => setShowSoftwareKillModal(false)} className={`flex-1 py-3 rounded-xl font-bold text-xs md:text-sm transition-all ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}`}>CANCEL</button>
                            <button onClick={() => { setShowSoftwareKillModal(false); triggerSysCmd('SHUTDOWN_SOFTWARE'); }} className="flex-[2] bg-orange-600 hover:bg-orange-500 text-white py-3 rounded-xl font-bold text-xs md:text-sm transition-all shadow-lg">CONFIRM HALT</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Hardware Shutdown Modal */}
            {showHardwareKillModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md px-4">
                    <div className={`transform transition-all duration-300 border p-6 md:p-8 rounded-3xl shadow-2xl max-w-md w-full flex flex-col items-center text-center ${isDark ? 'bg-slate-900 border-red-600/50 shadow-[0_0_40px_rgba(220,38,38,0.3)]' : 'bg-white border-red-400'}`}>
                        <HardDrive size={48} className="text-red-500 mb-4 animate-pulse" />
                        <h2 className={`text-lg md:text-xl font-black tracking-widest mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>FULL SYSTEM POWER OFF</h2>
                        <p className="text-slate-500 text-xs md:text-sm mb-8 font-mono">This command will permanently shut down the Ubuntu OS. You will lose all connection to the robot.</p>
                        <div className="flex gap-3 w-full">
                            <button onClick={() => setShowHardwareKillModal(false)} className={`flex-1 py-3 rounded-xl font-bold text-xs md:text-sm transition-all ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}`}>CANCEL</button>
                            <button onClick={() => { setShowHardwareKillModal(false); triggerSysCmd('SHUTDOWN_HARDWARE'); }} className="flex-[2] bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl font-black text-xs md:text-sm tracking-widest transition-all shadow-[0_0_20px_rgba(220,38,38,0.5)]">POWER OFF</button>
                        </div>
                    </div>
                </div>
            )}

            {/* POPOUT CARD MODAL (Smooth Scale Animation) */}
            {expandedCard && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-6" onClick={handleCloseCard}>
                    <div
                        className={`relative w-full max-w-3xl border rounded-3xl p-8 md:p-12 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto transition-all duration-300 ease-out transform ${isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'} ${isDark ? 'bg-slate-900/95 border-slate-700' : 'bg-white/95 border-slate-300'}`}
                        onClick={e => e.stopPropagation()}
                    >
                        <button onClick={handleCloseCard} className={`absolute top-6 right-6 p-2 rounded-full transition-colors ${isDark ? 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200'}`}>
                            <X size={24} />
                        </button>

                        {/* WIFI POPOUT */}
                        {expandedCard === 'wifi' && (
                            <div className="flex flex-col h-full items-center text-center">
                                <Wifi size={64} className="text-blue-500 mb-6" />
                                <h3 className={`font-black text-2xl tracking-widest mb-8 ${isDark ? 'text-white' : 'text-slate-900'}`}>WIRELESS NETWORKS</h3>

                                <button onClick={triggerWifiScan} className="w-full max-w-md mx-auto mb-6 text-blue-500 hover:text-white font-mono text-sm font-bold px-6 py-4 bg-blue-500/10 hover:bg-blue-600 rounded-xl transition-colors flex items-center justify-center gap-3 active:scale-95">
                                    {scanLoading ? <RefreshCw size={18} className="animate-spin" /> : "SCAN AIRSPACE"}
                                </button>

                                <div className="w-full max-w-md mx-auto overflow-y-auto max-h-[300px] flex flex-col gap-3">
                                    {wifiData.networks && wifiData.networks.length > 0 ? (
                                        wifiData.networks.map((net, idx) => (
                                            <div key={idx} onClick={() => setPasswordPrompt(net.ssid)} className={`p-5 rounded-2xl flex items-center justify-between cursor-pointer transition-all active:scale-95 border ${isDark ? 'bg-slate-800/50 hover:bg-slate-700/80 border-slate-700' : 'bg-slate-50 hover:bg-slate-100 border-slate-200'}`}>
                                                <div className="flex flex-col text-left truncate pr-4">
                                                    <span className={`font-bold text-base truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{net.ssid}</span>
                                                    <span className="text-slate-500 font-mono text-[10px] flex items-center gap-1 mt-1">{net.secured ? <><Lock size={12} /> SECURED</> : 'OPEN'}</span>
                                                </div>
                                                <div className="flex items-center gap-3 shrink-0">
                                                    <span className="text-emerald-500 font-mono text-sm font-bold">{net.signal}%</span>
                                                    <Wifi size={20} className={isDark ? 'text-slate-500' : 'text-slate-400'} />
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center text-slate-500 font-mono text-sm py-10 italic flex flex-col items-center gap-3"><Wifi size={32} className="opacity-50" /> Awaiting Scan Results...</div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* REMOTE POPOUT */}
                        {expandedCard === 'remote' && (
                            <div className="flex flex-col h-full items-center text-center">
                                <Smartphone size={64} className="text-indigo-500 mb-6" />
                                <h3 className={`font-black text-2xl tracking-widest mb-8 ${isDark ? 'text-white' : 'text-slate-900'}`}>REMOTE ACCESS</h3>

                                <div className={`w-full max-w-md mx-auto p-6 rounded-3xl mb-8 border shadow-inner ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                                    <span className="text-slate-500 font-mono text-[10px] md:text-xs tracking-widest block mb-3">MOBILE ACCESS URL</span>
                                    <span className="text-indigo-500 font-mono text-xl md:text-3xl font-black tracking-wider truncate block">http://{wifiData.ip}:5173</span>
                                </div>

                                <span className="text-slate-500 font-mono text-[10px] md:text-xs tracking-widest mb-4 uppercase block">Connected Devices ({sysTelemetry.external_clients})</span>
                                <div className="w-full max-w-md mx-auto overflow-y-auto max-h-[200px] flex flex-col gap-3">
                                    {sysTelemetry.connected_ips && sysTelemetry.connected_ips.length > 0 ? (
                                        sysTelemetry.connected_ips.map((ip, idx) => (
                                            <div key={idx} className={`p-4 rounded-xl border flex items-center justify-center gap-4 ${isDark ? 'bg-indigo-900/20 border-indigo-500/30' : 'bg-indigo-50 border-indigo-200'}`}>
                                                <div className="w-3 h-3 rounded-full bg-indigo-500 animate-pulse"></div>
                                                <span className={`font-mono text-lg font-bold ${isDark ? 'text-indigo-300' : 'text-indigo-700'}`}>{ip}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center text-slate-500 font-mono text-sm py-6 italic">No external phones or tablets connected.</div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* THEME POPOUT */}
                        {expandedCard === 'theme' && (
                            <div className="flex flex-col h-full items-center text-center justify-center py-4">
                                <Sun size={64} className="text-yellow-500 mb-6" />
                                <h3 className={`font-black text-2xl tracking-widest mb-10 ${isDark ? 'text-white' : 'text-slate-900'}`}>SYSTEM APPEARANCE</h3>

                                <div className="grid grid-cols-2 gap-6 w-full max-w-lg mx-auto">
                                    <button onClick={() => toggleTheme('dark')} className={`p-8 rounded-3xl flex flex-col items-center gap-6 transition-all active:scale-95 border ${isDark ? 'bg-slate-800 border-yellow-500/50 shadow-[0_0_40px_rgba(234,179,8,0.3)]' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}>
                                        <Moon size={56} className={isDark ? "text-yellow-400" : "text-slate-400"} />
                                        <span className={`font-bold tracking-widest text-sm ${isDark ? 'text-white' : 'text-slate-500'}`}>DARK MODE</span>
                                    </button>
                                    <button onClick={() => toggleTheme('light')} className={`p-8 rounded-3xl flex flex-col items-center gap-6 transition-all active:scale-95 border ${!isDark ? 'bg-white border-yellow-500/50 shadow-[0_0_40px_rgba(234,179,8,0.3)]' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}>
                                        <Sun size={56} className={!isDark ? "text-yellow-500" : "text-slate-500"} />
                                        <span className={`font-bold tracking-widest text-sm ${!isDark ? 'text-slate-900' : 'text-slate-400'}`}>LIGHT MODE</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* HARDWARE POPOUT (UPDATED WITH PORT DROPDOWNS & LEDS) */}
                        {expandedCard === 'hardware' && (
                            <div className="flex flex-col h-full items-center text-center py-4">
                                <Cpu size={64} className="text-emerald-500 mb-6" />
                                <h3 className={`font-black text-2xl tracking-widest mb-10 ${isDark ? 'text-white' : 'text-slate-900'}`}>HARDWARE & DEV TOOLS</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 w-full max-w-lg mx-auto">

                                    {/* MCU / PICO BLOCK */}
                                    <div className={`p-6 rounded-3xl border flex flex-col items-center shadow-inner transition-all ${sysTelemetry.pico_connected ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                                        <div className="flex items-center gap-2 mb-3">
                                            {/* Status LED */}
                                            <div className={`w-3 h-3 rounded-full shadow-md ${sysTelemetry.pico_connected ? 'bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]' : 'bg-red-500'}`}></div>
                                            <span className="text-slate-500 font-mono text-[10px] md:text-xs tracking-widest">MOTOR MCU (PICO)</span>
                                        </div>

                                        {/* Port Dropdown */}
                                        <select
                                            value={sysTelemetry.pico_port || '/dev/ttyACM0'}
                                            onChange={(e) => triggerSysCmd(`SET_PORT|PICO|${e.target.value}`)}
                                            className={`w-full text-center border px-3 py-2 rounded-xl font-mono text-xs md:text-sm focus:outline-none focus:border-emerald-500 mb-3 transition-colors cursor-pointer ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                                        >
                                            <option value="/dev/ttyACM0">/dev/ttyACM0</option>
                                            <option value="/dev/ttyACM1">/dev/ttyACM1</option>
                                            <option value="/dev/ttyUSB0">/dev/ttyUSB0</option>
                                            <option value="/dev/ttyUSB1">/dev/ttyUSB1</option>
                                            {sysTelemetry.available_ports && sysTelemetry.available_ports.map(port => (
                                                !defaultPorts.includes(port) && <option key={port} value={port}>{port}</option>
                                            ))}
                                        </select>

                                        <div className={`font-black text-xl md:text-2xl ${sysTelemetry.pico_connected ? 'text-emerald-500' : 'text-red-500'}`}>{sysTelemetry.pico_connected ? 'ONLINE' : 'OFFLINE'}</div>
                                    </div>

                                    {/* LIDAR SENSOR BLOCK */}
                                    <div className={`p-6 rounded-3xl border flex flex-col items-center shadow-inner transition-all ${sysTelemetry.lidar_connected ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                                        <div className="flex items-center gap-2 mb-3">
                                            {/* Status LED */}
                                            <div className={`w-3 h-3 rounded-full shadow-md ${sysTelemetry.lidar_connected ? 'bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]' : 'bg-red-500'}`}></div>
                                            <span className="text-slate-500 font-mono text-[10px] md:text-xs tracking-widest">LIDAR SENSOR</span>
                                        </div>

                                        {/* Port Dropdown */}
                                        <select
                                            value={sysTelemetry.lidar_port || '/dev/ttyUSB0'}
                                            onChange={(e) => triggerSysCmd(`SET_PORT|LIDAR|${e.target.value}`)}
                                            className={`w-full text-center border px-3 py-2 rounded-xl font-mono text-xs md:text-sm focus:outline-none focus:border-emerald-500 mb-3 transition-colors cursor-pointer ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                                        >
                                            <option value="/dev/ttyUSB0">/dev/ttyUSB0</option>
                                            <option value="/dev/ttyUSB1">/dev/ttyUSB1</option>
                                            <option value="/dev/ttyACM0">/dev/ttyACM0</option>
                                            <option value="/dev/ttyACM1">/dev/ttyACM1</option>
                                            {sysTelemetry.available_ports && sysTelemetry.available_ports.map(port => (
                                                !defaultPorts.includes(port) && <option key={port} value={port}>{port}</option>
                                            ))}
                                        </select>

                                        <div className={`font-black text-xl md:text-2xl ${sysTelemetry.lidar_connected ? 'text-emerald-500' : 'text-red-500'}`}>{sysTelemetry.lidar_connected ? 'ONLINE' : 'OFFLINE'}</div>
                                    </div>
                                </div>

                                <div className={`flex items-center justify-between p-6 md:p-8 rounded-3xl border w-full max-w-lg mx-auto ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                                    <div className="flex flex-col text-left pr-4">
                                        <span className={`font-black text-base md:text-lg tracking-wide ${isDark ? 'text-white' : 'text-slate-900'}`}>ENGINEERING MODE</span>
                                        <span className="text-slate-500 font-mono text-[10px] md:text-xs mt-2">Unlocks AMCL and Override Tools</span>
                                    </div>
                                    <div onClick={toggleDevMode} className={`w-16 h-8 md:w-20 md:h-10 flex items-center rounded-full p-1.5 cursor-pointer transition-colors duration-300 shrink-0 ${devMode ? 'bg-yellow-500' : (isDark ? 'bg-slate-700' : 'bg-slate-300')}`}>
                                        <div className={`bg-white w-6 h-6 md:w-7 md:h-7 rounded-full shadow-md transform transition-transform duration-300 ${devMode ? 'translate-x-8 md:translate-x-10' : ''}`}></div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* POWER POPOUT */}
                        {expandedCard === 'power' && (
                            <div className="flex flex-col h-full items-center text-center py-4">
                                <ShieldAlert size={64} className="text-red-500 mb-6" />
                                <h3 className="text-red-500 font-black text-2xl tracking-widest mb-10">CRITICAL POWER CONTROLS</h3>

                                <div className="grid grid-cols-1 gap-6 w-full max-w-lg mx-auto">
                                    <button onClick={() => { triggerSysCmd('REBOOT'); window.location.reload(); }} className={`flex items-center justify-center gap-6 p-6 rounded-3xl border transition-all active:scale-95 group ${isDark ? 'bg-slate-900 border-slate-700 hover:bg-slate-800' : 'bg-white border-slate-300 hover:bg-slate-100'}`}>
                                        <RefreshCw size={32} className={`transition-colors ${isDark ? 'text-slate-400 group-hover:text-white' : 'text-slate-500 group-hover:text-slate-900'}`} />
                                        <div className="flex flex-col text-left">
                                            <span className={`font-black tracking-widest text-lg ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>RESTART UI</span>
                                            <span className="text-slate-500 font-mono text-[10px]">Soft refresh the Interface</span>
                                        </div>
                                    </button>

                                    <button onClick={() => { setExpandedCard(null); setTimeout(() => setShowSoftwareKillModal(true), 300); }} className={`flex items-center justify-center gap-6 p-6 rounded-3xl border transition-all active:scale-95 group ${isDark ? 'bg-slate-900 border-orange-900/50 hover:bg-orange-900/30' : 'bg-orange-50 border-orange-200 hover:bg-orange-100'}`}>
                                        <Power size={32} className="text-orange-500" />
                                        <div className="flex flex-col text-left">
                                            <span className="text-orange-500 font-black tracking-widest text-lg">SOFTWARE HALT</span>
                                            <span className="text-orange-500/70 font-mono text-[10px]">Kill all ROS Nodes</span>
                                        </div>
                                    </button>

                                    <button onClick={() => { setExpandedCard(null); setTimeout(() => setShowHardwareKillModal(true), 300); }} className="flex items-center justify-center gap-6 p-6 rounded-3xl bg-red-600 border border-red-500 hover:bg-red-700 transition-all active:scale-95 group shadow-[0_0_20px_rgba(220,38,38,0.4)]">
                                        <HardDrive size={32} className="text-white" />
                                        <div className="flex flex-col text-left">
                                            <span className="text-white font-black tracking-widest text-lg">POWER OFF SYSTEM</span>
                                            <span className="text-white/70 font-mono text-[10px]">Safely shutdown Ubuntu OS</span>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* MAIN DASHBOARD (LARGE CENTERED TILES) */}
            <div className="text-center mb-8">
                <h2 className={`font-mono tracking-[0.3em] text-[10px] md:text-sm uppercase mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    System Configuration Hub
                </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10 w-full">

                {/* TILE 1: WIFI */}
                <button onClick={() => setExpandedCard('wifi')} className={`group relative border p-8 md:p-12 rounded-[2.5rem] flex flex-col items-center justify-center space-y-6 transition-all duration-500 ease-out hover:-translate-y-2 active:scale-95 overflow-hidden group-hover:shadow-[0_0_40px_rgba(59,130,246,0.3)] ${isDark ? 'bg-black/40 backdrop-blur-xl border-slate-700/50 hover:border-slate-400 shadow-2xl' : 'bg-white/80 backdrop-blur-xl border-slate-200 hover:border-slate-400 shadow-xl'}`}>
                    <div className="absolute inset-0 bg-gradient-to-t from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                    <div className="text-blue-500 z-10 transform transition-all duration-500 group-hover:scale-110 group-hover:-translate-y-2 drop-shadow-2xl">
                        <Wifi size={56} className="md:w-16 md:h-16" />
                    </div>
                    <div className="flex flex-col items-center z-10 transition-transform duration-500 group-hover:translate-y-1">
                        <h2 className={`text-xl md:text-2xl font-black tracking-widest text-center mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>WIFI NETWORK</h2>
                        <p className={`font-mono text-[10px] md:text-xs text-center uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{wifiData.current}</p>
                    </div>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-1 w-0 group-hover:w-1/2 transition-all duration-500 rounded-t-full bg-blue-500"></div>
                </button>

                {/* TILE 2: REMOTE */}
                <button onClick={() => setExpandedCard('remote')} className={`group relative border p-8 md:p-12 rounded-[2.5rem] flex flex-col items-center justify-center space-y-6 transition-all duration-500 ease-out hover:-translate-y-2 active:scale-95 overflow-hidden group-hover:shadow-[0_0_40px_rgba(99,102,241,0.3)] ${isDark ? 'bg-black/40 backdrop-blur-xl border-slate-700/50 hover:border-slate-400 shadow-2xl' : 'bg-white/80 backdrop-blur-xl border-slate-200 hover:border-slate-400 shadow-xl'}`}>
                    <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                    <div className="text-indigo-500 z-10 transform transition-all duration-500 group-hover:scale-110 group-hover:-translate-y-2 drop-shadow-2xl">
                        <Smartphone size={56} className="md:w-16 md:h-16" />
                    </div>
                    <div className="flex flex-col items-center z-10 transition-transform duration-500 group-hover:translate-y-1">
                        <h2 className={`text-xl md:text-2xl font-black tracking-widest text-center mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>REMOTE ACCESS</h2>
                        <p className={`font-mono text-[10px] md:text-xs text-center uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{sysTelemetry.external_clients} Linked</p>
                    </div>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-1 w-0 group-hover:w-1/2 transition-all duration-500 rounded-t-full bg-indigo-500"></div>
                </button>

                {/* TILE 3: APPEARANCE */}
                <button onClick={() => setExpandedCard('theme')} className={`group relative border p-8 md:p-12 rounded-[2.5rem] flex flex-col items-center justify-center space-y-6 transition-all duration-500 ease-out hover:-translate-y-2 active:scale-95 overflow-hidden group-hover:shadow-[0_0_40px_rgba(234,179,8,0.2)] ${isDark ? 'bg-black/40 backdrop-blur-xl border-slate-700/50 hover:border-slate-400 shadow-2xl' : 'bg-white/80 backdrop-blur-xl border-slate-200 hover:border-slate-400 shadow-xl'}`}>
                    <div className="absolute inset-0 bg-gradient-to-t from-yellow-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                    <div className="text-yellow-500 z-10 transform transition-all duration-500 group-hover:scale-110 group-hover:-translate-y-2 drop-shadow-2xl">
                        <Sun size={56} className="md:w-16 md:h-16" />
                    </div>
                    <div className="flex flex-col items-center z-10 transition-transform duration-500 group-hover:translate-y-1">
                        <h2 className={`text-xl md:text-2xl font-black tracking-widest text-center mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>APPEARANCE</h2>
                        <p className={`font-mono text-[10px] md:text-xs text-center uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{isDark ? 'Dark Theme' : 'Light Theme'}</p>
                    </div>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-1 w-0 group-hover:w-1/2 transition-all duration-500 rounded-t-full bg-yellow-500"></div>
                </button>

                {/* TILE 4: HARDWARE */}
                <button onClick={() => setExpandedCard('hardware')} className={`group relative border p-8 md:p-12 rounded-[2.5rem] flex flex-col items-center justify-center space-y-6 transition-all duration-500 ease-out hover:-translate-y-2 active:scale-95 overflow-hidden group-hover:shadow-[0_0_40px_rgba(16,185,129,0.3)] ${isDark ? 'bg-black/40 backdrop-blur-xl border-slate-700/50 hover:border-slate-400 shadow-2xl' : 'bg-white/80 backdrop-blur-xl border-slate-200 hover:border-slate-400 shadow-xl'}`}>
                    <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                    <div className="text-emerald-500 z-10 transform transition-all duration-500 group-hover:scale-110 group-hover:-translate-y-2 drop-shadow-2xl">
                        <Cpu size={56} className="md:w-16 md:h-16" />
                    </div>
                    <div className="flex flex-col items-center z-10 transition-transform duration-500 group-hover:translate-y-1">
                        <h2 className={`text-xl md:text-2xl font-black tracking-widest text-center mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>HARDWARE INFO</h2>
                        <p className={`font-mono text-[10px] md:text-xs text-center uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Diagnostics</p>
                    </div>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-1 w-0 group-hover:w-1/2 transition-all duration-500 rounded-t-full bg-emerald-500"></div>
                </button>

                {/* TILE 5: POWER ACTIONS */}
                <button onClick={() => setExpandedCard('power')} className={`md:col-span-2 lg:col-span-1 group relative border p-8 md:p-12 rounded-[2.5rem] flex flex-col items-center justify-center space-y-6 transition-all duration-500 ease-out hover:-translate-y-2 active:scale-95 overflow-hidden group-hover:shadow-[0_0_40px_rgba(239,68,68,0.3)] ${isDark ? 'bg-black/40 backdrop-blur-xl border-slate-700/50 hover:border-red-500 shadow-2xl' : 'bg-white/80 backdrop-blur-xl border-slate-200 hover:border-red-400 shadow-xl'}`}>
                    <div className="absolute inset-0 bg-gradient-to-t from-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                    <div className="text-red-500 z-10 transform transition-all duration-500 group-hover:scale-110 group-hover:-translate-y-2 drop-shadow-2xl">
                        <ShieldAlert size={56} className="md:w-16 md:h-16" />
                    </div>
                    <div className="flex flex-col items-center z-10 transition-transform duration-500 group-hover:translate-y-1">
                        <h2 className={`text-xl md:text-2xl font-black tracking-widest text-center mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>POWER ACTIONS</h2>
                        <p className={`font-mono text-[10px] md:text-xs text-center uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>System Shutdown</p>
                    </div>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-1 w-0 group-hover:w-1/2 transition-all duration-500 rounded-t-full bg-red-500"></div>
                </button>
            </div>

            {/* FOOTER: COPYRIGHT & VERSION */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center justify-center opacity-40 hover:opacity-100 transition-opacity z-10">
                <span className={`font-mono text-[11px] md:text-[13px] tracking-[0.25em] font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>© 2026 HUMYNEX ROBOTICS</span>
                <span className={`font-mono text-[9px] md:text-[10px] tracking-[0.3em] mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>AEROPORTER OS v2.3.2</span>
            </div>

        </div>
    );
}