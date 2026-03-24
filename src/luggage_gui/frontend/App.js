/*
 * Developed by Humynex Robotics - We make your ideas into reality
 * Email: humynexrobotics@gmail.com
 * Phone: 8714358646
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ROSLIB from 'roslib';
import Home from './pages/Home';
// We will create these pages next!
// import FreeDrive from './pages/FreeDrive'; 
// import Mapping from './pages/Mapping';

export default function App() {
    const [ros, setRos] = useState(null);
    const [connected, setConnected] = useState(false);
    const [eStopActive, setEStopActive] = useState(false);

    // 1. Establish ROSBridge Connection on Startup
    useEffect(() => {
        const rosConnection = new ROSLIB.Ros({ url: 'ws://localhost:9090' });

        rosConnection.on('connection', () => setConnected(true));
        rosConnection.on('error', () => setConnected(false));
        rosConnection.on('close', () => setConnected(false));

        setRos(rosConnection);
    }, []);

    // 2. Global E-Stop Logic
    const handleEStop = () => {
        setEStopActive(!eStopActive);
        if (ros && connected) {
            // Send priority zero-velocity command to the motors
            const cmdVel = new ROSLIB.Topic({ ros: ros, name: '/cmd_vel', messageType: 'geometry_msgs/Twist' });
            const stopMsg = new ROSLIB.Message({ linear: { x: 0, y: 0, z: 0 }, angular: { x: 0, y: 0, z: 0 } });
            cmdVel.publish(stopMsg);

            // Cancel Nav2 goals if active
            const cancelAction = new ROSLIB.Topic({ ros: ros, name: '/navigate_to_pose/_action/cancel_goal', messageType: 'action_msgs/CancelGoal' });
            cancelAction.publish(new ROSLIB.Message({}));
        }
    };

    return (
        <Router>
            {/* BACKGROUND: Tries video first, falls back to image, falls back to dark slate */}
            <div className="fixed inset-0 -z-10 bg-slate-900">
                <video autoPlay loop muted className="w-full h-full object-cover opacity-40">
                    <source src="/assets/background.mp4" type="video/mp4" />
                    <img src="/assets/background.jpg" alt="fallback" className="w-full h-full object-cover opacity-40" />
                </video>
            </div>

            {/* TOP NAVIGATION BAR */}
            <div className="fixed top-0 w-full h-16 bg-black/60 backdrop-blur-md flex items-center justify-between px-6 z-50 border-b border-slate-700">
                <h1 className="text-2xl font-bold tracking-widest text-white uppercase">HUMYNEX<span className="text-cyan-400"> OS</span></h1>

                <div className="flex items-center space-x-6">
                    {/* Connection Status Indicator */}
                    <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full animate-pulse ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className="text-slate-200 font-mono text-sm">{connected ? 'SYSTEM ONLINE' : 'DISCONNECTED'}</span>
                    </div>

                    {/* GLOBAL E-STOP BUTTON */}
                    <button
                        onClick={handleEStop}
                        className={`px-8 py-2 rounded-md font-bold text-lg uppercase transition-all duration-300 transform hover:scale-105 shadow-lg ${eStopActive
                                ? 'bg-yellow-500 text-black shadow-yellow-500/50 animate-bounce'
                                : 'bg-red-600 text-white shadow-red-600/50 hover:bg-red-500'
                            }`}
                    >
                        {eStopActive ? '▶ Resume System' : '🛑 EMERGENCY STOP'}
                    </button>
                </div>
            </div>

            {/* PAGE ROUTING CONTAINER */}
            <div className="pt-20 pb-4 px-6 h-screen overflow-hidden">
                <Routes>
                    <Route path="/" element={<Home ros={ros} connected={connected} />} />
                    {/* <Route path="/freedrive" element={<FreeDrive ros={ros} />} /> */}
                </Routes>
            </div>
        </Router>
    );
}