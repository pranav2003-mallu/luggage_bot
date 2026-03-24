/*
 * Developed by Humynex Robotics - We make your ideas into reality
 * Email: humynexrobotics@gmail.com
 * Phone: 8714358646
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import * as ROSLIB from 'roslib';
import { Home as HomeIcon, Gamepad2, Map as MapIcon, Navigation, BatteryMedium, Package, Settings, Wifi, Smartphone } from 'lucide-react';

import Home from './pages/Home';
import FreeDrive from './pages/FreeDrive';
import Mapping from './pages/Mapping';
import NavigationPage from './pages/Navigation';
import Guide from './pages/Guide';
import About from './pages/About';
import SettingsPage from './pages/Settings';

function AppContent({ ros, connected }) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const [interceptor, setInterceptor] = useState(null);

  // Global Telemetry & Synchronized State
  const [batteryPct, setBatteryPct] = useState("--");
  const [wifiData, setWifiData] = useState({ current: 'Disconnected', ip: '127.0.0.1', networks: [] });
  const [sysTelemetry, setSysTelemetry] = useState({ external_clients: 0, connected_ips: [], pico_connected: false, lidar_connected: false });

  const [globalState, setGlobalState] = useState({
    current_path: "/",
    system_status: "idle",
    dev_mode: false,
    theme: "dark"
  });

  // Function to request a state change to the Master Brain (Python)
  const syncState = (updates) => {
    if (!ros) return;
    const stateCmd = new ROSLIB.Topic({ ros: ros, name: '/gui/state_update', messageType: 'std_msgs/String' });
    stateCmd.publish({ data: JSON.stringify(updates) });
  };

  useEffect(() => {
    if (!ros) return;

    const batteryListener = new ROSLIB.Topic({ ros: ros, name: '/battery_level', messageType: 'std_msgs/Float32' });
    batteryListener.subscribe((msg) => { setBatteryPct(Math.round(msg.data) + "%"); });

    const wifiListener = new ROSLIB.Topic({ ros: ros, name: '/gui/wifi_status', messageType: 'std_msgs/String' });
    wifiListener.subscribe((msg) => { setWifiData(JSON.parse(msg.data)); });

    const telemetryListener = new ROSLIB.Topic({ ros: ros, name: '/gui/system_telemetry', messageType: 'std_msgs/String' });
    telemetryListener.subscribe((msg) => { setSysTelemetry(JSON.parse(msg.data)); });

    // LISTEN FOR MASTER STATE BROADCASTS
    const stateListener = new ROSLIB.Topic({ ros: ros, name: '/gui/global_state', messageType: 'std_msgs/String' });
    stateListener.subscribe((msg) => {
      const masterState = JSON.parse(msg.data);
      setGlobalState(masterState);

      // Force React to obey the Master Python router
      if (masterState.current_path !== location.pathname) {
        navigate(masterState.current_path);
      }
    });

    return () => {
      batteryListener.unsubscribe();
      wifiListener.unsubscribe();
      telemetryListener.unsubscribe();
      stateListener.unsubscribe();
    };
  }, [ros, location.pathname, navigate]);

  // When user clicks a nav button, we tell Python, NOT React.
  const handleNavClick = (path) => {
    if (path === currentPath) return;
    if (interceptor) {
      // Handle abort safety modals locally before syncing
      // (Handled directly in the pages now)
    }
    syncState({ current_path: path });
  };

  const navItems = [
    { path: '/', icon: <HomeIcon size={26} />, label: 'Home' },
    { path: '/freedrive', icon: <Gamepad2 size={26} />, label: 'Drive' },
    { path: '/mapping', icon: <MapIcon size={26} />, label: 'Map' },
    { path: '/navigation', icon: <Navigation size={26} />, label: 'Nav' },
  ];

  const theme = globalState.theme;

  return (
    <div className={`transition-colors duration-500 ${theme === 'dark' ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-900'} min-h-screen`}>
      {/* 1. THE GLOBAL HEADER */}
      <div className={`fixed top-0 w-full h-16 md:h-20 backdrop-blur-xl flex items-center justify-between px-4 md:px-8 z-30 border-b shadow-2xl transition-all ${theme === 'dark' ? 'bg-black/80 border-slate-700/50' : 'bg-white/80 border-slate-300'}`}>
        <h1 className={`text-2xl md:text-4xl font-black tracking-[0.2em] uppercase leading-tight ${theme === 'dark' ? 'text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'text-slate-900'}`}>AEROPORTER</h1>

        <div className="flex items-center space-x-3 md:space-x-4">

          <div className={`hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-xl border transition-colors ${theme === 'dark' ? 'bg-slate-800/60 border-slate-600/50' : 'bg-slate-200/60 border-slate-300'}`}>
            <Wifi size={16} className={wifiData.current !== 'Disconnected' ? "text-emerald-500" : "text-slate-500"} />
            <span className={`font-mono text-[10px] uppercase tracking-widest ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{wifiData.current}</span>
          </div>

          <div className={`hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-xl border transition-colors ${theme === 'dark' ? 'bg-slate-800/60 border-slate-600/50' : 'bg-slate-200/60 border-slate-300'}`}>
            <Smartphone size={16} className={sysTelemetry.external_clients > 0 ? "text-blue-500" : "text-slate-500"} />
            <span className={`font-mono text-[10px] uppercase tracking-widest ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
              {sysTelemetry.external_clients > 0 ? `${sysTelemetry.external_clients} CONNECTED` : 'NO REMOTES'}
            </span>
          </div>

          <div className={`hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/60 border-slate-600/50' : 'bg-slate-200/60 border-slate-300'}`}>
            <Package size={16} className="text-cyan-500" />
            <span className={`font-mono text-[10px] tracking-widest ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>PAYLOAD: <span className="text-cyan-500 font-bold">SECURED</span></span>
          </div>

          <div className={`hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/60 border-slate-600/50' : 'bg-slate-200/60 border-slate-300'}`}>
            <BatteryMedium size={16} className="text-emerald-500" />
            <span className="text-emerald-500 font-mono text-[10px] font-bold tracking-widest">{batteryPct}</span>
          </div>
        </div>
      </div>

      {/* 2. THE FLOATING SIDEBAR */}
      <div className={`fixed z-40 backdrop-blur-xl border shadow-[0_0_40px_rgba(0,0,0,0.5)] transition-all duration-500 bottom-6 left-1/2 transform -translate-x-1/2 flex flex-row space-x-4 px-6 py-4 rounded-3xl lg:bottom-auto lg:left-6 lg:top-1/2 lg:-translate-y-1/2 lg:-translate-x-0 lg:flex-col lg:space-x-0 lg:space-y-6 lg:py-8 lg:px-4 ${theme === 'dark' ? 'bg-black/70 border-slate-700/50' : 'bg-white/80 border-slate-300'}`}>
        {navItems.map((item) => {
          const isActive = currentPath === item.path;
          return (
            <button key={item.path} onClick={() => handleNavClick(item.path)} className="group relative flex items-center justify-center active:scale-90 transition-all duration-300">
              <div className={`p-3.5 rounded-2xl transition-all duration-500 ${isActive ? 'bg-cyan-500/20 text-cyan-500 shadow-[0_0_20px_rgba(34,211,238,0.4)] scale-110 animate-[pulse_2s_ease-in-out_infinite]' : (theme === 'dark' ? 'text-slate-400 hover:bg-slate-800/80 hover:text-white hover:scale-105' : 'text-slate-500 hover:bg-slate-200 hover:text-slate-900 hover:scale-105')}`}>
                {item.icon}
              </div>
            </button>
          );
        })}

        <div className={`hidden lg:block w-full h-px my-2 ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-300'}`}></div>
        <button onClick={() => handleNavClick('/settings')} className="group relative flex items-center justify-center active:scale-90 transition-all duration-300">
          <div className={`p-3.5 rounded-2xl transition-all duration-500 ${currentPath === '/settings' ? 'bg-indigo-500/20 text-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.4)] scale-110 animate-[spin_4s_linear_infinite]' : (theme === 'dark' ? 'text-slate-400 hover:bg-slate-800/80 hover:text-white hover:scale-105' : 'text-slate-500 hover:bg-slate-200 hover:text-slate-900 hover:scale-105')}`}>
            <Settings size={26} />
          </div>
        </button>
      </div>

      {/* 3. MAIN CONTENT AREA */}
      <div className="pt-20 pb-40 lg:pt-24 lg:pb-10 lg:pl-36 lg:pr-8 px-4 h-screen overflow-y-auto overflow-x-hidden relative">
        <div className={`fixed inset-0 -z-20 ${theme === 'dark' ? 'bg-slate-950' : 'bg-slate-100'}`}>
          {theme === 'dark' && <video autoPlay loop muted className="w-full h-full object-cover opacity-20 mix-blend-screen"><source src="/assets/background.mp4" type="video/mp4" /></video>}
        </div>

        <Routes>
          <Route path="/" element={<Home syncState={syncState} />} />
          <Route path="/freedrive" element={<FreeDrive ros={ros} setInterceptor={setInterceptor} globalState={globalState} syncState={syncState} />} />
          <Route path="/mapping" element={<Mapping ros={ros} setInterceptor={setInterceptor} globalState={globalState} syncState={syncState} />} />
          <Route path="/navigation" element={<NavigationPage ros={ros} setInterceptor={setInterceptor} globalState={globalState} syncState={syncState} />} />
          <Route path="/guide" element={<Guide />} />
          <Route path="/about" element={<About />} />
          <Route path="/settings" element={<SettingsPage ros={ros} wifiData={wifiData} sysTelemetry={sysTelemetry} globalState={globalState} syncState={syncState} />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  const [ros, setRos] = useState(null);
  const [connected, setConnected] = useState(false);
  const [isBooting, setIsBooting] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsBooting(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const rosConnection = new ROSLIB.Ros({ url: `ws://${window.location.hostname}:9090` });
    rosConnection.on('connection', () => setConnected(true));
    rosConnection.on('error', () => setConnected(false));
    rosConnection.on('close', () => setConnected(false));
    setRos(rosConnection);
  }, []);

  if (isBooting) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-950 text-white relative">
        <div className="animate-pulse flex flex-col items-center z-10">
          <h1 className="text-5xl md:text-7xl font-black tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 mb-2 drop-shadow-2xl">AEROPORTER</h1>
          <div className="flex items-center gap-2 mb-12 opacity-80"><span className="text-xs tracking-widest text-slate-500">POWERED BY</span><span className="text-sm font-black tracking-widest text-slate-300">HUMYNEX ROBOTICS</span></div>
          <div className="w-64 md:w-80 h-1.5 bg-slate-900 rounded-full overflow-hidden mb-8 shadow-[0_0_20px_rgba(34,211,238,0.2)]"><div className="w-full h-full bg-cyan-400 animate-[scale-x_2.5s_ease-in-out]"></div></div>
        </div>
      </div>
    );
  }

  return <Router><AppContent ros={ros} connected={connected} /></Router>;
}