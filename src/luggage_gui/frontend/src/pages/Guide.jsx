/*
 * Developed by Humynex Robotics - We make your ideas into reality
 * Email: humynexrobotics@gmail.com
 * Phone: 8714358646
 */

import React, { useState } from 'react';
import { ChevronLeft, BookOpen, Gamepad2, Map as MapIcon, Navigation, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Guide({ globalState }) {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('drive');

    const isDark = !globalState || globalState.theme === 'dark';

    const guideContent = {
        drive: {
            title: "FREE DRIVE MODE",
            icon: <Gamepad2 className="text-cyan-500" size={32} />,
            sections: [
                { label: "Hardware vs Simulation", desc: "Select 'Simulation' to test the UI with fake odometry without sending power to the motors. 'Hardware' engages the physical motor drivers via the Pico." },
                { label: "Smart Diagnostics", desc: "Standard system telemetry will smoothly scroll at the bottom of the 3D viewport. If a critical failure occurs, a red alert banner will drop down from the top of the map." },
                { label: "Teleop Controls", desc: "The D-Pad is equipped with a dead-man's switch. The robot will only move while a button is actively held down on the tablet. If your finger slips off, the motors immediately halt." }
            ]
        },
        mapping: {
            title: "FACILITY MAPPING (SLAM)",
            icon: <MapIcon className="text-emerald-500" size={32} />,
            sections: [
                { label: "Creating a Map", desc: "Drive the robot manually through the environment. The Lidar will dynamically build a high-resolution 2D occupancy grid on the screen in real-time." },
                { label: "Dropping Pins", desc: "Click 'Drop Location Pin' to save the robot's current X, Y, and Theta (rotation) coordinates. You will be prompted to name the location (e.g., 'Gate 4')." },
                { label: "Saving vs Discarding", desc: "If you attempt to leave the page while mapping, a safety modal will ask you to save or discard. Clicking 'Finish & Save' permanently commits the YAML map to the ROS database." }
            ]
        },
        nav: {
            title: "AUTONOMOUS NAVIGATION",
            icon: <Navigation className="text-blue-500" size={32} />,
            sections: [
                { label: "Initialization & Panning", desc: "The map interface functions like Google Maps. You can left-click and drag the mouse to pan around the map. Use the scroll wheel to zoom in and out of tight corridors." },
                { label: "Single Target Dispatch", desc: "Select a saved location from the dropdown, or enter manual X/Y coordinates, and click 'Dispatch Robot' to send the robot immediately using the Nav2 stack." },
                { label: "Mission Builder", desc: "Switch to the 'Mission Queue' tab to chain multiple stops together. You can set the robot to loop infinitely or wait for a specific timer at each stop." }
            ]
        },
        settings: {
            title: "CONTROL PANEL & SETUP",
            icon: <Settings className="text-indigo-500" size={32} />,
            sections: [
                { label: "Mobile Device Access", desc: "Open the Control Panel to see the robot's local IP Address (e.g. http://192.168.X.X:5173). Type this exact address into your phone's browser to control the robot remotely over WiFi." },
                { label: "Dynamic Port Detection", desc: "The Settings page actively scans the Linux OS for connected USB devices. If a LiDAR or Pico is unplugged, the UI will report it as disconnected." },
                { label: "Developer Mode", desc: "Toggling Developer Mode on will unlock advanced engineering tools, such as forcing Global Localization and manually setting the Home Pose in the Navigation module." },
                { label: "Hardware Shutdown", desc: "Always use the red 'Power Off System' button in the Control Panel to safely kill the ROS nodes and power down the Ubuntu machine to prevent SD card corruption." }
            ]
        }
    };

    return (
        <div className="h-full flex flex-col items-center relative pb-32 pt-6 px-2 md:px-6 animate-fade-in-up">
            <div className="w-full max-w-[1400px] flex flex-col gap-6 h-auto lg:h-[80vh]">

                <div className={`flex items-center justify-between backdrop-blur-md border p-5 md:p-6 rounded-3xl shadow-xl shrink-0 ${isDark ? 'bg-black/40 border-slate-700/50' : 'bg-white/80 border-slate-300'}`}>
                    <button onClick={() => navigate('/')} className={`p-3 rounded-xl transition-all active:scale-95 group shadow-lg ${isDark ? 'bg-slate-800/80 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200'}`}>
                        <ChevronLeft className={`group-hover:-translate-x-1 transition-transform ${isDark ? 'text-white' : 'text-slate-900'}`} />
                    </button>
                    <div className="flex items-center gap-3 md:gap-4">
                        <BookOpen className={isDark ? 'text-slate-400' : 'text-slate-500'} size={28} />
                        <div className="flex flex-col text-right">
                            <h2 className={`text-xl md:text-3xl font-black tracking-widest uppercase ${isDark ? 'text-white' : 'text-slate-900'}`}>OPERATOR MANUAL</h2>
                            <span className="text-slate-500 font-mono text-[9px] md:text-xs tracking-widest uppercase">SYSTEM GUIDE & DOCUMENTATION</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
                    <div className="lg:w-1/3 flex flex-col gap-3">
                        {Object.keys(guideContent).map((key) => (
                            <button
                                key={key}
                                onClick={() => setActiveTab(key)}
                                className={`p-4 md:p-6 rounded-3xl border text-left transition-all duration-300 flex items-center gap-3 md:gap-4 ${activeTab === key ? (isDark ? 'bg-slate-800/80 border-slate-400 shadow-[0_0_20px_rgba(255,255,255,0.1)] scale-[1.02]' : 'bg-white border-slate-400 shadow-[0_0_20px_rgba(0,0,0,0.1)] scale-[1.02]') : (isDark ? 'bg-black/40 border-slate-800 hover:bg-slate-900/80 hover:border-slate-600' : 'bg-slate-100/50 border-slate-200 hover:bg-white hover:border-slate-300')}`}
                            >
                                <div className={`shrink-0 p-3 md:p-4 rounded-2xl shadow-inner ${isDark ? 'bg-slate-950' : 'bg-slate-100'}`}>{guideContent[key].icon}</div>
                                <span className={`font-bold tracking-widest text-xs md:text-sm ${activeTab === key ? (isDark ? 'text-white' : 'text-slate-900') : 'text-slate-500'}`}>
                                    {guideContent[key].title}
                                </span>
                            </button>
                        ))}
                    </div>

                    <div className={`lg:w-2/3 backdrop-blur-xl border rounded-[2.5rem] shadow-2xl p-6 md:p-10 overflow-y-auto ${isDark ? 'bg-slate-900/60 border-slate-700/50' : 'bg-white/90 border-slate-300'}`}>
                        <div className={`flex items-center gap-3 md:gap-4 mb-6 md:mb-8 pb-6 border-b ${isDark ? 'border-slate-800/50' : 'border-slate-200'}`}>
                            {guideContent[activeTab].icon}
                            <h2 className={`text-xl md:text-3xl font-black tracking-widest ${isDark ? 'text-white' : 'text-slate-900'}`}>{guideContent[activeTab].title}</h2>
                        </div>

                        <div className="flex flex-col gap-4 md:gap-6">
                            {guideContent[activeTab].sections.map((sec, idx) => (
                                <div key={idx} className={`border p-5 md:p-8 rounded-3xl shadow-inner ${isDark ? 'bg-black/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                                    <h3 className={`font-bold tracking-widest mb-3 md:mb-4 flex items-center gap-3 text-sm md:text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                        <span className={`w-7 h-7 md:w-8 md:h-8 rounded-xl flex items-center justify-center text-xs md:text-sm font-black border shadow-inner shrink-0 ${isDark ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-white text-slate-500 border-slate-300'}`}>{idx + 1}</span>
                                        {sec.label}
                                    </h3>
                                    <p className="text-slate-500 text-xs md:text-sm leading-relaxed pl-10 md:pl-11">{sec.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}