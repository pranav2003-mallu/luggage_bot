/*
 * Developed by Humynex Robotics - We make your ideas into reality
 * Email: humynexrobotics@gmail.com
 * Phone: 8714358646
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as ROSLIB from 'roslib';
import * as THREE from 'three';
import URDFLoader from 'urdf-loader';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, StopCircle, Gauge, Cpu, MonitorPlay, Zap, CheckCircle2, Power, AlertTriangle, ChevronLeft, Gamepad2 } from 'lucide-react';

export default function FreeDrive({ ros, setInterceptor, globalState, syncState }) {
    const navigate = useNavigate();
    const [appState, setAppState] = useState('select_mode');
    const [selectedMode, setSelectedMode] = useState(null);
    const [systemStatus, setSystemStatus] = useState('idle');
    const [fillProgress, setFillProgress] = useState(0);
    const [currentNodeIdx, setCurrentNodeIdx] = useState(-1);

    const [speedLimit, setSpeedLimit] = useState(50);
    const [logs, setLogs] = useState([]);
    const [sysTelemetry, setSysTelemetry] = useState({ pico_connected: false, lidar_connected: false });

    const viewerRef = useRef(null);
    const engineRef = useRef(null);

    const [showExitModal, setShowExitModal] = useState(false);
    const [pendingExternalNav, setPendingExternalNav] = useState(null);

    const bootSequence = ["Establishing ROS 2 Bridge...", "Initializing Hardware Drivers...", "Spawning URDF Model...", "Connecting TF Tree...", "Verifying Teleop Nodes..."];
    const shutdownSequence = ["Halting Motor Commands...", "Destroying Teleop Nodes...", "Terminating TF Tree...", "Unmounting URDF Model...", "Closing Connections..."];

    // 1. DEEP GLOBAL STATE SYNCHRONIZATION (The Mirroring Magic)
    useEffect(() => {
        if (!globalState) return;

        // Instantly mirror all UI changes, popups, and progress bars from the Master Brain
        if (globalState.fd_view !== undefined && globalState.fd_view !== appState) setAppState(globalState.fd_view);
        if (globalState.fd_mode !== undefined && globalState.fd_mode !== selectedMode) setSelectedMode(globalState.fd_mode);
        if (globalState.fd_systemStatus !== undefined && globalState.fd_systemStatus !== systemStatus) setSystemStatus(globalState.fd_systemStatus);
        if (globalState.fd_fillProgress !== undefined && globalState.fd_fillProgress !== fillProgress) setFillProgress(globalState.fd_fillProgress);
        if (globalState.fd_currentNodeIdx !== undefined && globalState.fd_currentNodeIdx !== currentNodeIdx) setCurrentNodeIdx(globalState.fd_currentNodeIdx);
        if (globalState.fd_speedLimit !== undefined && globalState.fd_speedLimit !== speedLimit) setSpeedLimit(globalState.fd_speedLimit);
        if (globalState.fd_showExitModal !== undefined && globalState.fd_showExitModal !== showExitModal) setShowExitModal(globalState.fd_showExitModal);

    }, [globalState]);

    // Telemetry Listener for Hardware Pre-flight Checks
    useEffect(() => {
        if (!ros) return;
        const telemetryListener = new ROSLIB.Topic({ ros: ros, name: '/gui/system_telemetry', messageType: 'std_msgs/String' });
        telemetryListener.subscribe((msg) => { setSysTelemetry(JSON.parse(msg.data)); });
        return () => telemetryListener.unsubscribe();
    }, [ros]);

    // Interceptor for navigating away while running
    useEffect(() => {
        if (systemStatus === 'running' && appState === 'dashboard') {
            setInterceptor({
                message: "You are currently running Free Drive nodes. Do you want to terminate them and exit?",
                actions: [{ label: 'STOP & EXIT', style: 'bg-red-600 hover:bg-red-500 text-white', onClick: (targetPath) => { setPendingExternalNav(targetPath); triggerStop(); } }]
            });
        } else { setInterceptor(null); }
    }, [systemStatus, appState, ros, setInterceptor]);

    useEffect(() => {
        return () => { if (ros && systemStatus === 'running') { new ROSLIB.Topic({ ros: ros, name: '/gui/system_command', messageType: 'std_msgs/String' }).publish({ data: 'KILL' }); } };
    }, [ros, systemStatus]);

    const triggerLaunch = () => {
        if (selectedMode === 'HW' && !sysTelemetry.pico_connected) {
            setLogs(prev => [...prev, { level: 40, name: 'PRE-FLIGHT', msg: 'HARDWARE DISCONNECTED. Plug in the Motor MCU (Pico) to drive.' }]);
            return;
        }

        // Lock out other devices by instantly broadcasting the "booting" state
        setSystemStatus('booting'); setFillProgress(0); setCurrentNodeIdx(0);
        if (syncState) syncState({ fd_systemStatus: 'booting', fd_fillProgress: 0, fd_currentNodeIdx: 0 });

        if (ros) { new ROSLIB.Topic({ ros: ros, name: '/gui/system_command', messageType: 'std_msgs/String' }).publish({ data: selectedMode === 'SIM' ? 'LAUNCH_SIM' : 'LAUNCH_HW' }); }

        let progress = 0; let nodeIndex = -1;
        const interval = setInterval(() => {
            progress += Math.floor(Math.random() * 6) + 2;
            const expectedIndex = Math.floor((progress / 100) * bootSequence.length);
            if (expectedIndex > nodeIndex && expectedIndex < bootSequence.length) {
                nodeIndex = expectedIndex;
                setCurrentNodeIdx(nodeIndex);
            }
            if (progress >= 100) {
                clearInterval(interval);
                setFillProgress(100);
                setCurrentNodeIdx(bootSequence.length);
                setSystemStatus('running');
                // Finalize Boot Sync
                if (syncState) syncState({ fd_fillProgress: 100, fd_currentNodeIdx: bootSequence.length, fd_systemStatus: 'running' });
            } else {
                setFillProgress(progress);
                // Stream the loading bar to other devices
                if (syncState) syncState({ fd_fillProgress: progress, fd_currentNodeIdx: nodeIndex });
            }
        }, 120);
    };

    const triggerStop = () => {
        setShowExitModal(false); setSystemStatus('halting'); setFillProgress(0); setCurrentNodeIdx(0);

        // Broadcast the halt instantly to hide modals and lock buttons on other screens
        if (syncState) syncState({ fd_showExitModal: false, fd_systemStatus: 'halting', fd_fillProgress: 0, fd_currentNodeIdx: 0 });

        if (ros) {
            new ROSLIB.Topic({ ros: ros, name: '/cmd_vel', messageType: 'geometry_msgs/Twist' }).publish({ linear: { x: 0, y: 0, z: 0 }, angular: { x: 0, y: 0, z: 0 } });
            new ROSLIB.Topic({ ros: ros, name: '/gui/system_command', messageType: 'std_msgs/String' }).publish({ data: 'KILL' });
        }
        let progress = 0; let nodeIndex = -1;
        const interval = setInterval(() => {
            progress += Math.floor(Math.random() * 6) + 2;
            const expectedIndex = Math.floor((progress / 100) * shutdownSequence.length);
            if (expectedIndex > nodeIndex && expectedIndex < shutdownSequence.length) {
                nodeIndex = expectedIndex;
                setCurrentNodeIdx(nodeIndex);
            }
            if (progress >= 100) {
                clearInterval(interval);
                setFillProgress(100);
                setCurrentNodeIdx(shutdownSequence.length);

                setTimeout(() => {
                    setSystemStatus('idle');
                    if (pendingExternalNav) {
                        if (syncState) syncState({ current_path: pendingExternalNav, fd_view: 'select_mode', fd_systemStatus: 'idle' });
                        navigate(pendingExternalNav);
                    } else {
                        setAppState('select_mode');
                        if (syncState) syncState({ fd_view: 'select_mode', fd_systemStatus: 'idle' });
                    }
                    setPendingExternalNav(null);
                }, 1200);
            } else {
                setFillProgress(progress);
                if (syncState) syncState({ fd_fillProgress: progress, fd_currentNodeIdx: nodeIndex });
            }
        }, 120);
    };

    // Initialize 3D Engine
    useEffect(() => {
        if (appState !== 'dashboard' || !viewerRef.current) return;
        if (engineRef.current) return;

        viewerRef.current.innerHTML = '';
        const scene = new THREE.Scene();
        scene.background = null;

        const camera = new THREE.PerspectiveCamera(50, viewerRef.current.clientWidth / viewerRef.current.clientHeight, 0.1, 100);
        camera.position.set(3, 3, 2);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(viewerRef.current.clientWidth, viewerRef.current.clientHeight);
        viewerRef.current.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;

        scene.add(new THREE.AmbientLight(0xffffff, 1.0));
        const dirLight = new THREE.DirectionalLight(0xffffff, 2);
        dirLight.position.set(5, 10, 5);
        scene.add(dirLight);

        const rosSpace = new THREE.Group();
        rosSpace.rotation.x = -Math.PI / 2;
        scene.add(rosSpace);

        const grid = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
        grid.rotation.x = Math.PI / 2;
        rosSpace.add(grid);

        const robotContainer = new THREE.Group();
        rosSpace.add(robotContainer);

        let animationFrameId;
        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        engineRef.current = { scene, camera, renderer, robotContainer, controls, animationFrameId };

        return () => {
            cancelAnimationFrame(animationFrameId);
            renderer.dispose();
            engineRef.current = null;
        };
    }, [appState]);

    // Handle Window Resize for 3D Map
    useEffect(() => {
        const handleResize = () => {
            if (engineRef.current && viewerRef.current) {
                const { camera, renderer } = engineRef.current;
                camera.aspect = viewerRef.current.clientWidth / viewerRef.current.clientHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(viewerRef.current.clientWidth, viewerRef.current.clientHeight);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Load URDF and Listen to Pose
    useEffect(() => {
        if (systemStatus !== 'running' || !ros || !engineRef.current) return;
        const { robotContainer } = engineRef.current;
        let loadedModel = null;

        const urdfListener = new ROSLIB.Topic({ ros: ros, name: '/robot_description', messageType: 'std_msgs/String' });
        urdfListener.subscribe((msg) => {
            urdfListener.unsubscribe();
            const manager = new THREE.LoadingManager();
            const loader = new URDFLoader(manager);

            // DYNAMIC HOSTNAME FIX FOR MOBILE SPAWNING!
            loader.packages = { 'luggage_description': `http://${window.location.hostname}:8080/luggage_description` };

            loader.loadMeshCb = (path, manager, done) => {
                new STLLoader(manager).load(path, (geometry) => {
                    geometry.computeVertexNormals();
                    done(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.6 })));
                });
            };
            loadedModel = loader.parse(msg.data);
            robotContainer.add(loadedModel);
        });

        const poseListener = new ROSLIB.Topic({ ros: ros, name: '/gui/robot_pose', messageType: 'geometry_msgs/PoseStamped' });
        poseListener.subscribe((poseMsg) => {
            robotContainer.position.set(poseMsg.pose.position.x, poseMsg.pose.position.y, poseMsg.pose.position.z);
            robotContainer.quaternion.set(poseMsg.pose.orientation.x, poseMsg.pose.orientation.y, poseMsg.pose.orientation.z, poseMsg.pose.orientation.w);
        });

        return () => {
            urdfListener.unsubscribe();
            poseListener.unsubscribe();
            if (loadedModel) robotContainer.remove(loadedModel);
        };
    }, [systemStatus, ros]);

    // Diagnostic Logs
    useEffect(() => {
        if (!ros || appState !== 'dashboard') return;
        const rosoutListener = new ROSLIB.Topic({ ros: ros, name: '/rosout', messageType: 'rcl_interfaces/Log' });
        rosoutListener.subscribe((msg) => { setLogs(prev => [...prev, msg].slice(-20)); });
        return () => rosoutListener.unsubscribe();
    }, [ros, appState]);

    // Movement Commands (Only broadcasts to ROS, no UI sync needed for arrows)
    const moveRobot = (linearDir, angularDir) => {
        if (!ros || systemStatus !== 'running') return;
        new ROSLIB.Topic({ ros: ros, name: '/cmd_vel', messageType: 'geometry_msgs/Twist' }).publish({ linear: { x: linearDir * (speedLimit / 100.0), y: 0, z: 0 }, angular: { x: 0, y: 0, z: angularDir * (speedLimit / 100.0) } });
    };
    const stopRobot = () => {
        if (!ros || systemStatus !== 'running') return;
        new ROSLIB.Topic({ ros: ros, name: '/cmd_vel', messageType: 'geometry_msgs/Twist' }).publish({ linear: { x: 0, y: 0, z: 0 }, angular: { x: 0, y: 0, z: 0 } });
    };

    const activeErrors = logs.filter(l => l.level >= 30);
    const normalLogs = logs.filter(l => l.level < 30).slice(-4);
    const isDark = !globalState || globalState.theme === 'dark';

    // ---------------------------------------------------------
    // RENDER: SELECT MODE
    // ---------------------------------------------------------
    if (appState === 'select_mode') {
        return (
            <div className="h-full flex items-center justify-center relative px-2">
                <div className={`backdrop-blur-md border p-6 md:p-12 rounded-[2rem] md:rounded-[3rem] shadow-2xl flex flex-col items-center max-w-3xl w-full animate-fade-in-up ${isDark ? 'bg-black/60 border-slate-700/50' : 'bg-white/80 border-slate-300'}`}>
                    <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-10">
                        <Gamepad2 className="text-cyan-500 w-8 h-8 md:w-10 md:h-10" />
                        <h2 className={`text-xl md:text-3xl font-black tracking-widest uppercase ${isDark ? 'text-white' : 'text-slate-900'}`}>SELECT DRIVE MODE</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 w-full">
                        <button onClick={() => {
                            setSelectedMode('SIM');
                            setAppState('dashboard');
                            if (syncState) syncState({ fd_view: 'dashboard', fd_mode: 'SIM' }); // Broadcast Sync
                        }} className={`group active:scale-95 border p-5 md:p-8 rounded-2xl md:rounded-3xl flex flex-col items-center gap-3 md:gap-4 transition-all hover:border-cyan-500 shadow-lg ${isDark ? 'bg-slate-800/80 hover:bg-slate-700 border-slate-600/50' : 'bg-slate-100 hover:bg-white border-slate-300'}`}>
                            <div className="bg-cyan-500/20 p-3 md:p-4 rounded-full group-hover:scale-110 transition-transform"><MonitorPlay className="text-cyan-500 w-8 h-8 md:w-12 md:h-12" /></div>
                            <span className={`font-bold tracking-widest text-sm md:text-lg mt-1 md:mt-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>SIMULATION</span>
                            <span className="text-slate-500 text-[10px] md:text-xs font-mono text-center">Uses Fake Odometry</span>
                        </button>
                        <button onClick={() => {
                            setSelectedMode('HW');
                            setAppState('dashboard');
                            if (syncState) syncState({ fd_view: 'dashboard', fd_mode: 'HW' }); // Broadcast Sync
                        }} className={`group active:scale-95 border p-5 md:p-8 rounded-2xl md:rounded-3xl flex flex-col items-center gap-3 md:gap-4 transition-all hover:border-emerald-500 shadow-lg ${isDark ? 'bg-slate-800/80 hover:bg-slate-700 border-slate-600/50' : 'bg-slate-100 hover:bg-white border-slate-300'}`}>
                            <div className="bg-emerald-500/20 p-3 md:p-4 rounded-full group-hover:scale-110 transition-transform"><Cpu className="text-emerald-500 w-8 h-8 md:w-12 md:h-12" /></div>
                            <span className={`font-bold tracking-widest text-sm md:text-lg mt-1 md:mt-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>HARDWARE</span>
                            <span className="text-slate-500 text-[10px] md:text-xs font-mono text-center">Live Motor Output</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ---------------------------------------------------------
    // RENDER: DASHBOARD
    // ---------------------------------------------------------
    return (
        <div className="h-full flex flex-col items-center relative animate-fade-in-up pb-10">

            {/* Safety Exit Modal (Synced) */}
            {showExitModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-4">
                    <div className={`border p-6 md:p-8 rounded-3xl shadow-2xl max-w-lg w-full flex flex-col items-center text-center ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}>
                        <AlertTriangle className="text-yellow-500 mb-4 w-10 h-10 md:w-12 md:h-12" />
                        <h2 className={`text-lg md:text-xl font-bold tracking-widest mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>ACTIVE DRIVE SESSION</h2>
                        <p className="text-slate-500 text-xs md:text-sm font-mono mb-6 md:mb-8">Do you want to terminate the active ROS 2 nodes before exiting?</p>
                        <div className="flex gap-3 md:gap-4 w-full">
                            <button onClick={() => {
                                setShowExitModal(false);
                                if (syncState) syncState({ fd_showExitModal: false }); // Hide on all screens
                            }} className={`flex-1 py-3 rounded-xl font-bold tracking-widest text-xs md:text-sm transition-all ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}`}>CANCEL</button>
                            <button onClick={triggerStop} className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl font-bold tracking-widest text-xs md:text-sm shadow-[0_0_15px_rgba(220,38,38,0.5)] transition-all">STOP & EXIT</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="w-full flex flex-col md:flex-row gap-3 md:gap-6 h-auto md:h-full max-w-[1800px]">

                {/* LEFT: 3D CANVAS */}
                <div className={`w-full md:w-[60%] min-h-[40vh] md:min-h-0 flex flex-col backdrop-blur-md border rounded-[1.5rem] md:rounded-[2.5rem] shadow-2xl overflow-hidden relative shrink-0 ${isDark ? 'bg-slate-950/80 border-slate-700/50' : 'bg-slate-100/90 border-slate-300'}`}>

                    {activeErrors.length > 0 && (
                        <div className="absolute top-12 md:top-16 left-0 w-full bg-red-900/90 backdrop-blur-md border-b border-red-500 p-2 md:p-3 z-20 animate-slide-down shadow-xl">
                            <div className="flex flex-col items-center text-center">
                                <span className="text-red-300 font-bold font-mono text-[10px] md:text-xs tracking-widest flex items-center gap-2"><AlertTriangle size={12} /> SYSTEM ALERT</span>
                                <span className="text-white font-mono text-[10px] md:text-xs mt-1">{activeErrors[activeErrors.length - 1].msg}</span>
                            </div>
                        </div>
                    )}

                    <div className={`absolute top-0 w-full backdrop-blur-md p-3 md:p-5 flex justify-between items-center z-10 border-b ${isDark ? 'bg-black/40 border-slate-700/50' : 'bg-white/60 border-slate-300'}`}>
                        <span className="text-cyan-500 font-bold tracking-widest font-mono text-[10px] md:text-sm flex items-center gap-2">
                            {selectedMode === 'SIM' ? <MonitorPlay size={14} /> : <Cpu size={14} />}{selectedMode === 'SIM' ? 'SIMULATION' : 'HARDWARE'}
                        </span>
                        <span className={`font-mono text-[9px] md:text-xs font-bold tracking-widest ${systemStatus === 'running' ? 'text-emerald-500 animate-pulse' : 'text-slate-500'}`}>[{systemStatus.toUpperCase()}]</span>
                    </div>

                    <div id="urdf-canvas" ref={viewerRef} className="w-full h-full flex items-center justify-center"></div>

                    {/* Smart Diagnostics Focus-Scroll */}
                    <div className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 w-[90%] pointer-events-none flex flex-col items-center justify-end h-24 md:h-32 overflow-hidden" style={{ maskImage: 'linear-gradient(to top, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)', WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)' }}>
                        {normalLogs.length === 0 && <span className="text-slate-500 font-mono text-[9px] md:text-xs italic mb-1 md:mb-2">Awaiting telemetry...</span>}
                        {normalLogs.map((log, i) => {
                            const isLast = i === normalLogs.length - 1;
                            return (
                                <div key={i} className={`font-mono tracking-wide text-center transition-all duration-300 w-full truncate ${isLast ? 'text-[10px] md:text-[12px] opacity-100 mb-1 md:mb-2 drop-shadow-md ' + (isDark ? 'text-slate-300' : 'text-slate-700') : 'text-[8px] md:text-[10px] text-slate-500 opacity-40 mb-0.5 md:mb-1'}`}>
                                    <span className="text-cyan-500 mr-1 md:mr-2">[{log.name}]</span>{log.msg}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* RIGHT: CONTROL PANEL */}
                <div className={`w-full md:w-[40%] flex flex-col gap-3 md:gap-4 h-full transition-opacity duration-500 ${systemStatus === 'running' || systemStatus === 'idle' ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                    <button onClick={() => {
                        if (systemStatus === 'running') {
                            setPendingExternalNav(null);
                            setShowExitModal(true);
                            if (syncState) syncState({ fd_showExitModal: true }); // Show modal on all screens
                        } else {
                            setAppState('select_mode');
                            if (syncState) syncState({ fd_view: 'select_mode' });
                        }
                    }} className={`flex-none backdrop-blur-md border p-3 md:p-5 rounded-2xl md:rounded-3xl flex items-center gap-2 transition-all group active:scale-95 shadow-lg ${isDark ? 'bg-slate-900/80 border-slate-700/50 hover:bg-slate-800 text-slate-300' : 'bg-white/80 border-slate-300 hover:bg-white text-slate-700'}`}>
                        <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" /><span className="font-bold tracking-widest text-[10px] md:text-sm">BACK TO HUB</span>
                    </button>

                    <div className={`flex-none backdrop-blur-md border p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-xl flex flex-col gap-3 md:gap-4 ${isDark ? 'bg-black/40 border-slate-700/50' : 'bg-white/60 border-slate-300'}`}>
                        <div className="flex justify-between items-center w-full">
                            <h3 className="text-slate-500 font-bold tracking-widest flex items-center gap-1.5 md:gap-2 text-[9px] md:text-xs"><Gauge size={14} className="text-cyan-500" /> OUTPUT LIMITER</h3>
                            <div className={`flex items-center gap-1 border rounded-md md:rounded-lg p-1 shadow-inner ${isDark ? 'bg-slate-900 border-slate-600' : 'bg-slate-100 border-slate-300'}`}>
                                <input type="number" value={speedLimit} onChange={(e) => {
                                    let v = parseInt(e.target.value);
                                    v = isNaN(v) ? 0 : v > 100 ? 100 : v < 0 ? 0 : v;
                                    setSpeedLimit(v);
                                    if (syncState) syncState({ fd_speedLimit: v }); // Sync slider adjustments!
                                }} className={`w-10 md:w-12 bg-transparent text-cyan-500 text-center font-mono font-bold text-[10px] md:text-sm focus:outline-none appearance-none m-0`} style={{ MozAppearance: 'textfield' }} />
                                <span className="text-slate-500 font-mono text-[9px] md:text-[10px] pr-1">%</span>
                            </div>
                        </div>
                        <input type="range" min="10" max="100" value={speedLimit} onChange={(e) => {
                            let v = parseInt(e.target.value);
                            setSpeedLimit(v);
                            if (syncState) syncState({ fd_speedLimit: v });
                        }} className="w-full h-1.5 md:h-2 bg-slate-400 dark:bg-slate-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 md:[&::-webkit-slider-thumb]:w-6 md:[&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-cyan-500 [&::-webkit-slider-thumb]:rounded-full" />
                    </div>

                    <div className={`flex-1 backdrop-blur-md border py-4 md:py-6 rounded-2xl md:rounded-3xl flex flex-col items-center justify-center min-h-[160px] md:min-h-[220px] transition-all shadow-xl ${systemStatus === 'running' ? (isDark ? 'bg-black/40 border-slate-700/50' : 'bg-white/60 border-slate-300') : (isDark ? 'bg-slate-900 border-slate-800 opacity-50' : 'bg-slate-200 border-slate-300 opacity-50')}`}>
                        <button onMouseDown={() => moveRobot(1, 0)} onMouseUp={stopRobot} onMouseLeave={stopRobot} onTouchStart={() => moveRobot(1, 0)} onTouchEnd={stopRobot} onTouchCancel={stopRobot} disabled={systemStatus !== 'running'} className={`w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 border-2 rounded-xl md:rounded-2xl flex items-center justify-center text-cyan-500 active:scale-90 active:bg-cyan-500 active:text-white transition-all shadow-lg mb-1.5 md:mb-3 disabled:opacity-50 ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-300'}`}><ArrowUp className="w-6 h-6 md:w-8 md:h-8 lg:w-10 lg:h-10" /></button>
                        <div className="flex gap-1.5 md:gap-3">
                            <button onMouseDown={() => moveRobot(0, 1)} onMouseUp={stopRobot} onMouseLeave={stopRobot} onTouchStart={() => moveRobot(0, 1)} onTouchEnd={stopRobot} onTouchCancel={stopRobot} disabled={systemStatus !== 'running'} className={`w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 border-2 rounded-xl md:rounded-2xl flex items-center justify-center text-cyan-500 active:scale-90 active:bg-cyan-500 active:text-white transition-all shadow-lg disabled:opacity-50 ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-300'}`}><ArrowLeft className="w-6 h-6 md:w-8 md:h-8 lg:w-10 lg:h-10" /></button>
                            <button onClick={stopRobot} disabled={systemStatus !== 'running'} className={`w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 border-2 rounded-xl md:rounded-2xl flex items-center justify-center text-red-500 active:scale-90 active:bg-red-500 active:text-white transition-all shadow-lg disabled:opacity-50 ${isDark ? 'bg-red-900/50 border-red-500/50' : 'bg-red-100 border-red-300'}`}><StopCircle className="w-6 h-6 md:w-8 md:h-8" /></button>
                            <button onMouseDown={() => moveRobot(0, -1)} onMouseUp={stopRobot} onMouseLeave={stopRobot} onTouchStart={() => moveRobot(0, -1)} onTouchEnd={stopRobot} onTouchCancel={stopRobot} disabled={systemStatus !== 'running'} className={`w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 border-2 rounded-xl md:rounded-2xl flex items-center justify-center text-cyan-500 active:scale-90 active:bg-cyan-500 active:text-white transition-all shadow-lg disabled:opacity-50 ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-300'}`}><ArrowRight className="w-6 h-6 md:w-8 md:h-8 lg:w-10 lg:h-10" /></button>
                        </div>
                        <button onMouseDown={() => moveRobot(-1, 0)} onMouseUp={stopRobot} onMouseLeave={stopRobot} onTouchStart={() => moveRobot(-1, 0)} onTouchEnd={stopRobot} onTouchCancel={stopRobot} disabled={systemStatus !== 'running'} className={`w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 border-2 rounded-xl md:rounded-2xl flex items-center justify-center text-cyan-500 active:scale-90 active:bg-cyan-500 active:text-white transition-all shadow-lg mt-1.5 md:mt-3 disabled:opacity-50 ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-300'}`}><ArrowDown className="w-6 h-6 md:w-8 md:h-8 lg:w-10 lg:h-10" /></button>
                    </div>

                    {/* BIG BUTTONS */}
                    <div className="flex-none w-full mt-auto pt-1 md:pt-2">
                        {systemStatus === 'idle' && (
                            <button onClick={triggerLaunch} className="w-full py-3 md:py-4 bg-cyan-600/20 backdrop-blur-md border-2 border-cyan-500 rounded-2xl md:rounded-3xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] hover:bg-cyan-600/30">
                                <Zap size={18} className="text-cyan-500" /><span className="font-sans font-black text-[10px] md:text-sm text-white tracking-[0.2em] uppercase">INITIATE LAUNCH</span>
                            </button>
                        )}

                        {systemStatus === 'running' && (
                            <button onClick={triggerStop} className="w-full py-3 md:py-4 bg-red-600/80 backdrop-blur-md border-2 border-red-500 text-white rounded-2xl md:rounded-3xl font-black text-[10px] md:text-sm tracking-[0.2em] shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:bg-red-500 active:scale-95 transition-all flex items-center justify-center gap-2">
                                <Power size={18} /> STOP
                            </button>
                        )}

                        {(systemStatus === 'booting' || systemStatus === 'halting') && (
                            <div className="w-full flex flex-col items-center gap-1.5 md:gap-2">
                                <div className={`relative w-full h-10 md:h-12 border rounded-xl md:rounded-2xl overflow-hidden shadow-inner ${isDark ? 'bg-slate-900 border-slate-600' : 'bg-slate-200 border-slate-400'}`}>
                                    <div className={`absolute left-0 top-0 h-full transition-all duration-150 ease-out flex items-center justify-center ${systemStatus === 'halting' ? 'bg-red-500' : 'bg-cyan-500'}`} style={{ width: `${fillProgress}%` }}>
                                        <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)50%,rgba(255,255,255,0.15)75%,transparent_75%,transparent)] bg-[length:1rem_1rem] opacity-30"></div>
                                    </div>
                                    <div className="absolute inset-0 z-10 flex items-center justify-center"><span className="font-sans font-bold text-white tracking-[0.2em] uppercase text-[8px] md:text-[10px]">{systemStatus === 'halting' ? 'SHUTTING DOWN...' : 'INITIALIZING...'}</span></div>
                                </div>
                                {currentNodeIdx >= 0 && (
                                    <div className={`flex items-center gap-1.5 font-mono tracking-widest text-[7px] md:text-[8px] px-3 py-1 rounded-full ${isDark ? 'bg-black/60 text-slate-300' : 'bg-white/80 text-slate-700 shadow-sm'}`}>
                                        <CheckCircle2 size={10} className={systemStatus === 'halting' ? "text-red-500" : "text-cyan-500"} />
                                        <span>{systemStatus === 'halting' ? (currentNodeIdx >= shutdownSequence.length ? 'SYSTEM HALTED' : shutdownSequence[currentNodeIdx]) : (currentNodeIdx >= bootSequence.length ? 'SYSTEM READY' : bootSequence[currentNodeIdx])}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}