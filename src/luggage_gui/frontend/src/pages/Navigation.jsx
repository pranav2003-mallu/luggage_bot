/*
 * Developed by Humynex Robotics - We make your ideas into reality
 * Email: humynexrobotics@gmail.com
 * Phone: 8714358646
 */

import React, { useState, useEffect, useRef } from 'react';
import * as ROSLIB from 'roslib';
import * as THREE from 'three';
import URDFLoader from 'urdf-loader';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Navigation as NavIcon, MapPin, ListOrdered, Play, Settings2, Target, Route, ChevronDown, ChevronRight, ChevronLeft, Zap, Power, CheckCircle2, AlertTriangle, Trash2, Clock, RotateCw, Radar, Home as HomeIcon, CornerDownLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Navigation({ ros, setInterceptor, globalState, syncState }) {
    const navigate = useNavigate();
    const [appState, setAppState] = useState('select_map');
    const [systemStatus, setSystemStatus] = useState('idle');
    const [activeTab, setActiveTab] = useState('single');
    const [fillProgress, setFillProgress] = useState(0);
    const [currentNodeIdx, setCurrentNodeIdx] = useState(-1);
    const [logs, setLogs] = useState([]);
    const [sysTelemetry, setSysTelemetry] = useState({ pico_connected: false, lidar_connected: false });

    const savedMaps = [
        { id: 1, name: 'Terminal A - Concourse', locations: [{ id: 101, name: 'Gate 4', x: 2.0, y: 1.5, theta: 0 }, { id: 102, name: 'Charging Dock', x: -1.0, y: -2.0, theta: 90 }] },
        { id: 2, name: 'Baggage Claim North', locations: [{ id: 103, name: 'Carousel 1', x: 5.0, y: 0.0, theta: 180 }] }
    ];
    const [selectedMapId, setSelectedMapId] = useState(savedMaps[0].id);
    const selectedMap = savedMaps.find(m => m.id === selectedMapId);

    const [selectedTargetId, setSelectedTargetId] = useState('');
    const [showManualCoords, setShowManualCoords] = useState(false);
    const [manualCoords, setManualCoords] = useState({ x: 0, y: 0, theta: 0 });

    const [missionQueue, setMissionQueue] = useState([]);
    const [isLooping, setIsLooping] = useState(false);
    const [waitMode, setWaitMode] = useState('timer');
    const [waitTime, setWaitTime] = useState(10);

    const viewerRef = useRef(null);
    const poseDataRef = useRef(null);
    const engineRef = useRef(null);

    const bootSequence = ["Loading Costmaps...", "Initializing AMCL...", "Starting Nav2 Planners...", "Connecting Behavior Trees...", "NAV2 READY"];
    const shutdownSequence = ["Canceling Active Goals...", "Halting Motor Output...", "Terminating Nav2 Stack...", "SYSTEM HALTED"];

    const isDark = !globalState || globalState.theme === 'dark';
    const devMode = globalState?.dev_mode === true;

    // 1. DEEP GLOBAL STATE SYNCHRONIZATION
    useEffect(() => {
        if (!globalState) return;
        if (globalState.nav_view !== undefined && globalState.nav_view !== appState) setAppState(globalState.nav_view);
        if (globalState.nav_systemStatus !== undefined && globalState.nav_systemStatus !== systemStatus) setSystemStatus(globalState.nav_systemStatus);
        if (globalState.nav_activeTab !== undefined && globalState.nav_activeTab !== activeTab) setActiveTab(globalState.nav_activeTab);
        if (globalState.nav_fillProgress !== undefined && globalState.nav_fillProgress !== fillProgress) setFillProgress(globalState.nav_fillProgress);
        if (globalState.nav_currentNodeIdx !== undefined && globalState.nav_currentNodeIdx !== currentNodeIdx) setCurrentNodeIdx(globalState.nav_currentNodeIdx);
    }, [globalState]);

    // Telemetry Listener for Hardware Pre-flight Checks
    useEffect(() => {
        if (!ros) return;
        const telemetryListener = new ROSLIB.Topic({ ros: ros, name: '/gui/system_telemetry', messageType: 'std_msgs/String' });
        telemetryListener.subscribe((msg) => { setSysTelemetry(JSON.parse(msg.data)); });
        return () => telemetryListener.unsubscribe();
    }, [ros]);

    // Safety Interceptor
    useEffect(() => {
        if (systemStatus === 'running' && appState === 'dashboard') {
            setInterceptor({
                message: "Nav2 and local planners are currently active. Do you want to cancel the current goal and shut down?",
                onConfirm: () => {
                    if (ros) {
                        new ROSLIB.Topic({ ros: ros, name: '/navigate_to_pose/_action/cancel_goal', messageType: 'action_msgs/CancelGoal' }).publish({});
                        new ROSLIB.Topic({ ros: ros, name: '/gui/system_command', messageType: 'std_msgs/String' }).publish({ data: 'KILL' });
                    }
                }
            });
        } else { setInterceptor(null); }
    }, [systemStatus, appState, ros, setInterceptor]);

    useEffect(() => {
        return () => { if (ros && systemStatus === 'running') { new ROSLIB.Topic({ ros: ros, name: '/gui/system_command', messageType: 'std_msgs/String' }).publish({ data: 'KILL' }); } };
    }, [ros, systemStatus]);

    const triggerLaunch = () => {
        // STRICT HARDWARE PRE-FLIGHT CHECK
        if (!sysTelemetry.pico_connected || !sysTelemetry.lidar_connected) {
            setLogs(prev => [...prev, { level: 40, name: 'PRE-FLIGHT', msg: 'HARDWARE DISCONNECTED. Plug in Pico & LiDAR to boot Nav2.' }]);
            return;
        }

        setSystemStatus('booting'); setFillProgress(0); setCurrentNodeIdx(0);
        if (syncState) syncState({ nav_systemStatus: 'booting', nav_fillProgress: 0, nav_currentNodeIdx: 0 });

        if (ros) new ROSLIB.Topic({ ros: ros, name: '/gui/system_command', messageType: 'std_msgs/String' }).publish({ data: `LAUNCH_NAV|${selectedMap.name}` });

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
                if (syncState) syncState({ nav_fillProgress: 100, nav_currentNodeIdx: bootSequence.length, nav_systemStatus: 'running' });
            } else {
                setFillProgress(progress);
                if (syncState) syncState({ nav_fillProgress: progress, nav_currentNodeIdx: nodeIndex });
            }
        }, 120);
    };

    const triggerAbort = () => {
        setSystemStatus('halting'); setFillProgress(0); setCurrentNodeIdx(0);
        if (syncState) syncState({ nav_systemStatus: 'halting', nav_fillProgress: 0, nav_currentNodeIdx: 0 });

        if (ros) {
            new ROSLIB.Topic({ ros: ros, name: '/navigate_to_pose/_action/cancel_goal', messageType: 'action_msgs/CancelGoal' }).publish({});
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
                    setAppState('select_map');
                    if (syncState) syncState({ nav_systemStatus: 'idle', nav_view: 'select_map' });
                }, 1200);
            } else {
                setFillProgress(progress);
                if (syncState) syncState({ nav_fillProgress: progress, nav_currentNodeIdx: nodeIndex });
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
        camera.position.set(0, 15, 0);
        camera.up.set(1, 0, 0);
        camera.lookAt(0, 0, 0);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(viewerRef.current.clientWidth, viewerRef.current.clientHeight);
        viewerRef.current.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.enableRotate = false;
        controls.enablePan = true;
        controls.enableZoom = true;
        controls.screenSpacePanning = true;
        controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };

        scene.add(new THREE.AmbientLight(0xffffff, 1.0));
        const dirLight = new THREE.DirectionalLight(0xffffff, 2);
        dirLight.position.set(5, 10, 5);
        scene.add(dirLight);

        const rosSpace = new THREE.Group();
        rosSpace.rotation.x = -Math.PI / 2;
        scene.add(rosSpace);

        const grid = new THREE.GridHelper(40, 40, 0x444444, 0x222222);
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

        engineRef.current = { scene, camera, renderer, rosSpace, robotContainer, controls, animationFrameId, mapMesh: null, pathMesh: null };

        return () => {
            cancelAnimationFrame(animationFrameId);
            renderer.dispose();
            engineRef.current = null;
        };
    }, [appState]);

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

    // URDF, Map, Path, and Pose Loading
    useEffect(() => {
        if (systemStatus !== 'running' || !ros || !engineRef.current) return;

        const { rosSpace, robotContainer } = engineRef.current;
        let loadedModel = null;

        const urdfListener = new ROSLIB.Topic({ ros: ros, name: '/robot_description', messageType: 'std_msgs/String' });
        urdfListener.subscribe((msg) => {
            urdfListener.unsubscribe();
            const manager = new THREE.LoadingManager();
            const loader = new URDFLoader(manager);
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

        const mapListener = new ROSLIB.Topic({ ros: ros, name: '/map', messageType: 'nav_msgs/OccupancyGrid' });
        mapListener.subscribe((msg) => {
            const { width, height } = msg.info;
            const resolution = msg.info.resolution;
            const origin = msg.info.origin.position;

            const canvas = document.createElement('canvas');
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            const imgData = ctx.createImageData(width, height);

            for (let row = 0; row < height; row++) {
                for (let col = 0; col < width; col++) {
                    const mapIdx = row * width + col;
                    const canvasIdx = ((height - 1 - row) * width + col) * 4;
                    const val = msg.data[mapIdx];

                    if (val === -1) {
                        imgData.data[canvasIdx] = 15; imgData.data[canvasIdx + 1] = 23; imgData.data[canvasIdx + 2] = 42; imgData.data[canvasIdx + 3] = 0;
                    } else if (val >= 0 && val < 50) {
                        imgData.data[canvasIdx] = 255; imgData.data[canvasIdx + 1] = 255; imgData.data[canvasIdx + 2] = 255; imgData.data[canvasIdx + 3] = 100;
                    } else {
                        imgData.data[canvasIdx] = 34; imgData.data[canvasIdx + 1] = 211; imgData.data[canvasIdx + 2] = 238; imgData.data[canvasIdx + 3] = 255;
                    }
                }
            }
            ctx.putImageData(imgData, 0, 0);
            const texture = new THREE.CanvasTexture(canvas);
            texture.minFilter = THREE.NearestFilter;
            texture.magFilter = THREE.NearestFilter;

            if (engineRef.current.mapMesh) {
                engineRef.current.mapMesh.material.map.dispose();
                engineRef.current.mapMesh.material.map = texture;
                engineRef.current.mapMesh.material.needsUpdate = true;
            } else {
                const geom = new THREE.PlaneGeometry(width * resolution, height * resolution);
                const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide });
                const mesh = new THREE.Mesh(geom, mat);
                mesh.position.set(origin.x + (width * resolution) / 2, origin.y + (height * resolution) / 2, -0.05);
                rosSpace.add(mesh);
                engineRef.current.mapMesh = mesh;
            }
        });

        const pathListener = new ROSLIB.Topic({ ros: ros, name: '/plan', messageType: 'nav_msgs/Path' });
        pathListener.subscribe((msg) => {
            const points = msg.poses.map(p => new THREE.Vector3(p.pose.position.x, p.pose.position.y, 0.05));
            if (points.length === 0) return;

            const geom = new THREE.BufferGeometry().setFromPoints(points);

            if (engineRef.current.pathMesh) {
                engineRef.current.pathMesh.geometry.dispose();
                engineRef.current.pathMesh.geometry = geom;
            } else {
                const mat = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 3 });
                const line = new THREE.Line(geom, mat);
                rosSpace.add(line);
                engineRef.current.pathMesh = line;
            }
        });

        const poseListener = new ROSLIB.Topic({ ros: ros, name: '/gui/robot_pose', messageType: 'geometry_msgs/PoseStamped' });
        poseListener.subscribe((poseMsg) => {
            robotContainer.position.set(poseMsg.pose.position.x, poseMsg.pose.position.y, poseMsg.pose.position.z);
            robotContainer.quaternion.set(poseMsg.pose.orientation.x, poseMsg.pose.orientation.y, poseMsg.pose.orientation.z, poseMsg.pose.orientation.w);
            if (poseDataRef.current) poseDataRef.current.innerText = `POS: [ ${poseMsg.pose.position.x.toFixed(2)} , ${poseMsg.pose.position.y.toFixed(2)} ]`;
        });

        return () => {
            urdfListener.unsubscribe();
            poseListener.unsubscribe();
            mapListener.unsubscribe();
            pathListener.unsubscribe();
            if (loadedModel) robotContainer.remove(loadedModel);
            if (engineRef.current && engineRef.current.mapMesh) {
                rosSpace.remove(engineRef.current.mapMesh);
                engineRef.current.mapMesh.geometry.dispose();
                engineRef.current.mapMesh.material.dispose();
                engineRef.current.mapMesh = null;
            }
            if (engineRef.current && engineRef.current.pathMesh) {
                rosSpace.remove(engineRef.current.pathMesh);
                engineRef.current.pathMesh.geometry.dispose();
                engineRef.current.pathMesh.material.dispose();
                engineRef.current.pathMesh = null;
            }
        };
    }, [systemStatus, ros]);

    useEffect(() => {
        if (!ros || appState !== 'dashboard') return;
        const rosoutListener = new ROSLIB.Topic({ ros: ros, name: '/rosout', messageType: 'rcl_interfaces/Log' });
        rosoutListener.subscribe((msg) => { setLogs(prev => [...prev, msg].slice(-20)); });
        return () => rosoutListener.unsubscribe();
    }, [ros, appState]);

    const triggerGlobalLocalize = () => {
        if (!ros || systemStatus !== 'running') return;
        new ROSLIB.Topic({ ros: ros, name: '/gui/system_command', messageType: 'std_msgs/String' }).publish({ data: 'LOCALIZE_GLOBAL' });
    };

    const triggerSetHome = () => {
        if (!ros || systemStatus !== 'running') return;
        new ROSLIB.Topic({ ros: ros, name: '/gui/system_command', messageType: 'std_msgs/String' }).publish({ data: 'SET_HOME_POSE' });
    };

    const sendNavGoal = (x, y, theta) => {
        if (!ros || systemStatus !== 'running') return;
        const rad = theta * (Math.PI / 180);
        const qz = Math.sin(rad / 2.0); const qw = Math.cos(rad / 2.0);
        const goalTopic = new ROSLIB.Topic({ ros: ros, name: '/goal_pose', messageType: 'geometry_msgs/PoseStamped' });
        const pose = new ROSLIB.Message({ header: { frame_id: 'map' }, pose: { position: { x, y, z: 0 }, orientation: { x: 0, y: 0, z: qz, w: qw } } });
        goalTopic.publish(pose);
    };

    const dispatchSingleTarget = () => {
        if (showManualCoords) { sendNavGoal(parseFloat(manualCoords.x), parseFloat(manualCoords.y), parseFloat(manualCoords.theta)); }
        else { const loc = selectedMap.locations.find(l => l.id === parseInt(selectedTargetId)); if (loc) sendNavGoal(loc.x, loc.y, loc.theta); }
    };

    const returnToBase = () => {
        sendNavGoal(0, 0, 0);
    };

    const addToMission = (locId) => {
        const loc = selectedMap.locations.find(l => l.id === parseInt(locId));
        if (loc) setMissionQueue([...missionQueue, { ...loc, queueId: Date.now() }]);
    };

    const activeErrors = logs.filter(l => l.level >= 30);
    const normalLogs = logs.filter(l => l.level < 30).slice(-4);

    if (appState === 'select_map') {
        return (
            <div className="h-full flex items-center justify-center relative px-2">
                <div className={`backdrop-blur-md border p-6 md:p-12 rounded-[2rem] md:rounded-[3rem] shadow-2xl flex flex-col items-center max-w-2xl w-full animate-fade-in-up ${isDark ? 'bg-black/60 border-slate-700/50' : 'bg-white/80 border-slate-300'}`}>
                    <div className="flex flex-col items-center gap-2 mb-6 md:mb-8 text-center"><NavIcon size={48} className="text-blue-500 mb-2" /><h2 className={`text-xl md:text-3xl font-black tracking-widest uppercase ${isDark ? 'text-white' : 'text-slate-900'}`}>AUTONOMOUS NAVIGATION</h2><p className="text-slate-500 font-mono text-[10px] md:text-sm">Select a facility map to load the Nav2 Stack.</p></div>
                    <div className="w-full flex flex-col gap-2 mb-6 md:mb-8">
                        <label className="text-slate-500 font-mono text-[9px] md:text-xs tracking-widest pl-2">DATABASE SELECTION</label>
                        <div className="relative">
                            <select value={selectedMapId} onChange={(e) => setSelectedMapId(parseInt(e.target.value))} className={`w-full border px-4 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl font-bold tracking-widest text-xs md:text-base appearance-none focus:outline-none focus:border-blue-500 shadow-inner ${isDark ? 'bg-slate-900 border-slate-600 text-blue-400' : 'bg-slate-100 border-slate-300 text-blue-600'}`}>
                                {savedMaps.map(m => <option key={m.id} value={m.id}>{m.name.toUpperCase()}</option>)}
                            </select>
                            <ChevronDown className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                        </div>
                    </div>
                    <button onClick={() => {
                        setAppState('dashboard');
                        if (syncState) syncState({ nav_view: 'dashboard' });
                    }} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black tracking-widest text-xs md:text-lg py-3 md:py-4 rounded-xl md:rounded-2xl shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all active:scale-95 flex items-center justify-center gap-2 md:gap-3"><Target size={20} className="md:w-6 md:h-6" /> LOAD MISSION CONTROL</button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col items-center relative animate-fade-in-up pb-10">

            <div className="w-full flex flex-col md:flex-row gap-3 md:gap-6 h-auto md:h-full max-w-[1800px]">

                {/* LEFT: 3D CANVAS (60% Width on Landscape Mobile/PC) */}
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
                        <span className="text-blue-500 font-bold tracking-widest font-mono text-[10px] md:text-sm flex items-center gap-2 animate-pulse"><NavIcon size={14} /> NAV2 ACTIVE: {selectedMap.name.toUpperCase()}</span>
                        <span className={`font-mono text-[9px] md:text-xs font-bold tracking-widest ${systemStatus === 'running' ? 'text-emerald-500' : 'text-slate-500'}`}>[{systemStatus.toUpperCase()}]</span>
                    </div>

                    <div id="urdf-canvas" ref={viewerRef} className="w-full h-full flex items-center justify-center cursor-move"></div>

                    <div className={`absolute bottom-4 right-4 backdrop-blur-sm border px-2 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl shadow-lg z-20 flex items-center gap-2 ${isDark ? 'bg-black/70 border-slate-700' : 'bg-white/80 border-slate-300'}`}>
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                        <span ref={poseDataRef} className="text-blue-500 font-mono text-[9px] md:text-sm tracking-widest font-bold">POS: [ 0.00 , 0.00 ]</span>
                    </div>

                    <div className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 w-[90%] md:w-[80%] pointer-events-none flex flex-col items-center justify-end h-24 md:h-32 overflow-hidden" style={{ maskImage: 'linear-gradient(to top, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)', WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)' }}>
                        {normalLogs.length === 0 && <span className="text-slate-500 font-mono text-[9px] md:text-xs italic mb-1 md:mb-2">Awaiting telemetry...</span>}
                        {normalLogs.map((log, i) => {
                            const isLast = i === normalLogs.length - 1;
                            return (
                                <div key={i} className={`font-mono tracking-wide text-center transition-all duration-300 w-full truncate ${isLast ? 'text-[10px] md:text-[12px] opacity-100 mb-1 md:mb-2 drop-shadow-md ' + (isDark ? 'text-slate-300' : 'text-slate-700') : 'text-[8px] md:text-[10px] text-slate-500 opacity-40 mb-0.5 md:mb-1'}`}>
                                    <span className="text-blue-500 mr-1 md:mr-2">[{log.name}]</span>{log.msg}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* RIGHT: CONTROL PANEL (40% Width) */}
                <div className={`w-full md:w-[40%] flex flex-col gap-3 md:gap-4 h-full transition-opacity duration-500 ${systemStatus === 'running' || systemStatus === 'idle' ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                    <button onClick={() => {
                        setAppState('select_map');
                        if (syncState) syncState({ nav_view: 'select_map' });
                    }} className={`flex-none backdrop-blur-md border p-3 md:p-5 rounded-2xl md:rounded-3xl flex items-center gap-2 md:gap-3 transition-all group active:scale-95 shadow-lg ${isDark ? 'bg-slate-900/80 border-slate-700/50 hover:bg-slate-800 text-slate-300' : 'bg-white/80 border-slate-300 hover:bg-white text-slate-700'}`}>
                        <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" /><span className="font-bold tracking-widest text-[10px] md:text-sm">BACK TO MAP SELECT</span>
                    </button>

                    {/* Developer Options Hidden securely behind devMode */}
                    {devMode && (
                        <div className="flex gap-2 shrink-0 animate-fade-in-up">
                            <button onClick={triggerGlobalLocalize} disabled={systemStatus !== 'running'} className={`flex-1 p-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all font-bold tracking-widest text-[8px] md:text-[10px] shadow-lg active:scale-95 ${systemStatus === 'running' ? (isDark ? 'bg-indigo-900/40 border border-indigo-500/50 hover:bg-indigo-800/60 text-indigo-300' : 'bg-indigo-100 border border-indigo-300 hover:bg-indigo-200 text-indigo-600') : (isDark ? 'bg-slate-900 border border-slate-700 text-slate-500' : 'bg-slate-200 border border-slate-300 text-slate-400')}`}><Radar size={14} /> AUTO LOCALIZE</button>
                            <button onClick={triggerSetHome} disabled={systemStatus !== 'running'} className={`flex-1 p-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all font-bold tracking-widest text-[8px] md:text-[10px] shadow-lg active:scale-95 ${systemStatus === 'running' ? (isDark ? 'bg-emerald-900/40 border border-emerald-500/50 hover:bg-emerald-800/60 text-emerald-300' : 'bg-emerald-100 border border-emerald-300 hover:bg-emerald-200 text-emerald-600') : (isDark ? 'bg-slate-900 border border-slate-700 text-slate-500' : 'bg-slate-200 border border-slate-300 text-slate-400')}`}><HomeIcon size={14} /> SET AS HOME</button>
                        </div>
                    )}

                    <div className={`flex border rounded-xl md:rounded-2xl p-1 md:p-1.5 shrink-0 shadow-inner ${isDark ? 'bg-slate-900/80 border-slate-700/50' : 'bg-slate-200 border-slate-300'}`}>
                        <button onClick={() => { setActiveTab('single'); if (syncState) syncState({ nav_activeTab: 'single' }); }} className={`flex-1 py-2 md:py-3 rounded-lg md:rounded-xl font-bold tracking-widest text-[9px] md:text-xs transition-all flex items-center justify-center gap-1.5 md:gap-2 ${activeTab === 'single' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}><Target size={14} /> SINGLE POINT</button>
                        <button onClick={() => { setActiveTab('mission'); if (syncState) syncState({ nav_activeTab: 'mission' }); }} className={`flex-1 py-2 md:py-3 rounded-lg md:rounded-xl font-bold tracking-widest text-[9px] md:text-xs transition-all flex items-center justify-center gap-1.5 md:gap-2 ${activeTab === 'mission' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}><Route size={14} /> MISSION QUEUE</button>
                    </div>

                    {activeTab === 'single' && (
                        <div className={`flex-1 backdrop-blur-md border rounded-2xl md:rounded-3xl shadow-xl flex flex-col overflow-hidden min-h-[250px] md:min-h-[300px] ${isDark ? 'bg-black/40 border-slate-700/50' : 'bg-white/60 border-slate-300'}`}>
                            <div className="p-3 md:p-5 flex-1 overflow-y-auto flex flex-col gap-3 md:gap-4">
                                <div className="flex flex-col gap-1 md:gap-2">
                                    <label className="text-slate-500 font-mono text-[8px] md:text-[10px] tracking-widest">SAVED LOCATION</label>
                                    <div className="relative">
                                        <select value={selectedTargetId} onChange={(e) => { setSelectedTargetId(e.target.value); setShowManualCoords(false); }} className={`w-full border px-3 md:px-4 py-2 md:py-3 rounded-lg md:rounded-xl font-bold tracking-widest appearance-none focus:outline-none focus:border-blue-500 text-[10px] md:text-sm cursor-pointer shadow-inner ${isDark ? 'bg-slate-900 border-slate-600 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'}`}>
                                            <option value="" disabled>-- Select Destination --</option>{selectedMap.locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={14} />
                                    </div>
                                </div>

                                <div className={`border rounded-lg md:rounded-xl overflow-hidden mt-1 md:mt-4 shadow-lg ${isDark ? 'border-slate-700' : 'border-slate-300'}`}>
                                    <button onClick={() => setShowManualCoords(!showManualCoords)} className={`w-full p-2.5 md:p-4 flex items-center justify-between transition-colors ${isDark ? 'bg-slate-800/50 hover:bg-slate-800' : 'bg-slate-100 hover:bg-slate-200'}`}><span className="text-slate-500 font-mono text-[8px] md:text-[10px] tracking-widest flex items-center gap-1.5 md:gap-2"><Settings2 size={12} /> ADVANCED: MANUAL COORDS</span>{showManualCoords ? <ChevronDown size={12} className="text-slate-500" /> : <ChevronRight size={12} className="text-slate-500" />}</button>
                                    {showManualCoords && (
                                        <div className={`p-2.5 md:p-4 grid grid-cols-3 gap-2 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
                                            <div className="flex flex-col"><label className="text-[7px] md:text-[9px] font-mono text-slate-500 mb-1">X (m)</label><input type="number" step="0.1" value={manualCoords.x} onChange={e => setManualCoords({ ...manualCoords, x: e.target.value })} className={`border p-1.5 md:p-2 rounded-md md:rounded-lg text-center font-mono text-[10px] md:text-sm focus:outline-none focus:border-cyan-500 ${isDark ? 'bg-black border-slate-600 text-cyan-400' : 'bg-white border-slate-300 text-cyan-600'}`} /></div>
                                            <div className="flex flex-col"><label className="text-[7px] md:text-[9px] font-mono text-slate-500 mb-1">Y (m)</label><input type="number" step="0.1" value={manualCoords.y} onChange={e => setManualCoords({ ...manualCoords, y: e.target.value })} className={`border p-1.5 md:p-2 rounded-md md:rounded-lg text-center font-mono text-[10px] md:text-sm focus:outline-none focus:border-cyan-500 ${isDark ? 'bg-black border-slate-600 text-cyan-400' : 'bg-white border-slate-300 text-cyan-600'}`} /></div>
                                            <div className="flex flex-col"><label className="text-[7px] md:text-[9px] font-mono text-slate-500 mb-1">THETA (°)</label><input type="number" value={manualCoords.theta} onChange={e => setManualCoords({ ...manualCoords, theta: e.target.value })} className={`border p-1.5 md:p-2 rounded-md md:rounded-lg text-center font-mono text-[10px] md:text-sm focus:outline-none focus:border-emerald-500 ${isDark ? 'bg-black border-slate-600 text-emerald-400' : 'bg-white border-slate-300 text-emerald-600'}`} /></div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className={`p-3 md:p-5 border-t flex gap-2 ${isDark ? 'border-slate-700/50 bg-slate-900/30' : 'border-slate-300 bg-slate-100/50'}`}>
                                <button onClick={dispatchSingleTarget} disabled={(!showManualCoords && !selectedTargetId) || systemStatus !== 'running'} className="flex-[2] bg-blue-600 hover:bg-blue-500 disabled:bg-slate-400 disabled:text-slate-200 text-white font-black tracking-widest py-2 md:py-4 rounded-xl flex items-center justify-center gap-1.5 md:gap-3 transition-all active:scale-95 shadow-[0_0_20px_rgba(59,130,246,0.3)] text-[10px] md:text-sm"><Play size={14} className="md:w-4 md:h-4" /> DISPATCH</button>
                                <button onClick={returnToBase} disabled={systemStatus !== 'running'} className={`flex-1 font-bold tracking-widest py-2 md:py-4 rounded-xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 text-[8px] md:text-[10px] ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300 disabled:bg-slate-800 disabled:text-slate-600' : 'bg-slate-300 hover:bg-slate-400 text-slate-700 disabled:bg-slate-200 disabled:text-slate-400'}`}><CornerDownLeft size={12} className="md:w-4 md:h-4" /> RETURN HOME</button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'mission' && (
                        <div className={`flex-1 backdrop-blur-md border rounded-2xl md:rounded-3xl shadow-xl flex flex-col overflow-hidden min-h-[250px] md:min-h-[300px] ${isDark ? 'bg-black/40 border-slate-700/50' : 'bg-white/60 border-slate-300'}`}>
                            <div className="p-3 md:p-5 flex-1 overflow-y-auto flex flex-col gap-3 md:gap-4">
                                <div className="flex flex-col gap-1.5 md:gap-2">
                                    <label className="text-slate-500 font-mono text-[8px] md:text-[10px] tracking-widest flex items-center justify-between">ITINERARY QUEUE <span className="text-blue-500 font-bold bg-blue-500/10 px-1.5 md:px-2 py-0.5 rounded">{missionQueue.length} STOPS</span></label>
                                    <div className={`min-h-[60px] md:min-h-[100px] border rounded-lg md:rounded-xl p-1.5 md:p-2 flex flex-col gap-1.5 md:gap-2 shadow-inner ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-100 border-slate-300'}`}>
                                        {missionQueue.length === 0 ? <div className="h-full flex items-center justify-center text-slate-500 font-mono text-[9px] md:text-xs italic">Add locations below...</div> :
                                            missionQueue.map((stop, idx) => (
                                                <div key={stop.queueId} className={`p-1.5 md:p-3 rounded-md md:rounded-lg flex items-center justify-between group shadow ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                                                    <div className="flex items-center gap-1.5 md:gap-3"><span className="w-4 h-4 md:w-6 md:h-6 bg-blue-500/20 text-blue-500 rounded flex items-center justify-center font-bold text-[8px] md:text-xs border border-blue-500/30">{idx + 1}</span><span className={`text-[10px] md:text-sm font-bold tracking-wide ${isDark ? 'text-white' : 'text-slate-900'}`}>{stop.name}</span></div>
                                                    <button onClick={() => setMissionQueue(missionQueue.filter(s => s.queueId !== stop.queueId))} className="text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={12} className="md:w-4 md:h-4" /></button>
                                                </div>
                                            ))
                                        }
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <select id="quickAdd" className={`flex-1 border px-2 md:px-4 py-1.5 md:py-3 rounded-lg md:rounded-xl font-mono text-[9px] md:text-xs focus:outline-none cursor-pointer ${isDark ? 'bg-slate-900 border-slate-600 text-slate-300' : 'bg-white border-slate-300 text-slate-700'}`} defaultValue="">
                                        <option value="" disabled>Add Stop...</option>{selectedMap.locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                    </select>
                                    <button onClick={() => { const el = document.getElementById('quickAdd'); if (el.value) addToMission(el.value); el.value = ''; }} className={`px-3 md:px-5 rounded-lg md:rounded-xl font-bold text-white text-sm md:text-xl active:scale-95 ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-400 hover:bg-slate-500'}`}>+</button>
                                </div>

                                {/* RESTORED MISSION SETTINGS */}
                                <div className={`border rounded-lg md:rounded-xl p-2.5 md:p-4 flex flex-col gap-2 md:gap-3 shadow-inner ${isDark ? 'bg-slate-900/50 border-slate-700/50' : 'bg-slate-100 border-slate-300'}`}>
                                    <span className="text-slate-500 font-mono text-[8px] md:text-[10px] tracking-widest">MISSION PARAMETERS</span>
                                    <div className="flex items-center justify-between"><span className={`text-[9px] md:text-xs font-bold flex items-center gap-1.5 md:gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}><RotateCw size={12} className="text-emerald-500 md:w-4 md:h-4" /> CONTINUOUS LOOP</span><input type="checkbox" checked={isLooping} onChange={() => setIsLooping(!isLooping)} className="toggle-checkbox w-3 h-3 md:w-4 md:h-4" /></div>
                                    <div className={`h-px w-full ${isDark ? 'bg-slate-700/50' : 'bg-slate-300'}`}></div>
                                    <div className="flex flex-col gap-2 md:gap-3">
                                        <div className="flex items-center justify-between">
                                            <span className={`text-[9px] md:text-xs font-bold flex items-center gap-1.5 md:gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}><Clock size={12} className="text-yellow-500 md:w-4 md:h-4" /> IDLE BEHAVIOR</span>
                                            <select value={waitMode} onChange={(e) => setWaitMode(e.target.value)} className={`border text-[9px] md:text-xs p-1 md:p-1.5 rounded-md md:rounded-lg ${isDark ? 'bg-black border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}><option value="timer">Timed Wait</option><option value="manual">Await Operator</option></select>
                                        </div>
                                        {waitMode === 'timer' && (
                                            <div className="flex items-center gap-2 md:gap-3"><input type="range" min="5" max="120" value={waitTime} onChange={(e) => setWaitTime(e.target.value)} className="flex-1 h-1 bg-slate-400 dark:bg-slate-700 rounded-full appearance-none" /><span className="text-yellow-600 dark:text-yellow-500 font-mono text-[9px] md:text-xs w-6 md:w-8 text-right">{waitTime}s</span></div>
                                        )}
                                    </div>
                                </div>

                            </div>
                            <div className={`p-3 md:p-5 border-t ${isDark ? 'border-slate-700/50 bg-slate-900/30' : 'border-slate-300 bg-slate-100/50'}`}>
                                <button disabled={missionQueue.length === 0 || systemStatus !== 'running'} className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-400 disabled:text-slate-200 text-white font-black tracking-widest py-2.5 md:py-4 rounded-xl flex items-center justify-center gap-1.5 md:gap-3 transition-all active:scale-95 shadow-[0_0_20px_rgba(59,130,246,0.3)] text-[10px] md:text-sm"><ListOrdered size={14} className="md:w-4 md:h-4" /> START MISSION</button>
                            </div>
                        </div>
                    )}

                    {/* BIG BUTTONS */}
                    <div className="flex-none w-full mt-auto pt-1 md:pt-2">
                        {systemStatus === 'idle' && (
                            <button onClick={triggerLaunch} className="w-full py-3 md:py-4 bg-blue-600/20 backdrop-blur-md border-2 border-blue-500 rounded-2xl md:rounded-3xl flex items-center justify-center gap-1.5 md:gap-3 active:scale-95 transition-all shadow-[0_0_20px_rgba(59,130,246,0.2)] hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] hover:bg-blue-600/30">
                                <Zap size={16} className="text-blue-500 md:w-5 md:h-5" /><span className={`font-sans font-black text-[10px] md:text-sm tracking-[0.2em] uppercase ${isDark ? 'text-white' : 'text-blue-700'}`}>BOOT NAV2 STACK</span>
                            </button>
                        )}

                        {systemStatus === 'running' && (
                            <button onClick={triggerAbort} className="w-full py-3 md:py-4 bg-red-600/90 backdrop-blur-md border-2 border-red-500 text-white rounded-2xl md:rounded-3xl font-black text-[10px] md:text-sm tracking-[0.2em] shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:bg-red-500 active:scale-95 transition-all flex items-center justify-center gap-1.5 md:gap-3">
                                <Power size={16} className="md:w-5 md:h-5" /> STOP
                            </button>
                        )}

                        {(systemStatus === 'booting' || systemStatus === 'halting') && (
                            <div className="w-full flex flex-col items-center gap-1.5 md:gap-2">
                                <div className={`relative w-full h-10 md:h-12 border rounded-xl md:rounded-2xl overflow-hidden shadow-inner ${isDark ? 'bg-slate-900 border-slate-600' : 'bg-slate-200 border-slate-400'}`}>
                                    <div className={`absolute left-0 top-0 h-full transition-all duration-150 ease-out flex items-center justify-center ${systemStatus === 'halting' ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${fillProgress}%` }}>
                                        <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)50%,rgba(255,255,255,0.15)75%,transparent_75%,transparent)] bg-[length:1rem_1rem] opacity-30"></div>
                                    </div>
                                    <div className="absolute inset-0 z-10 flex items-center justify-center"><span className="font-sans font-bold text-white tracking-[0.2em] uppercase text-[8px] md:text-[10px]">{systemStatus === 'halting' ? 'SHUTTING DOWN...' : 'INITIALIZING...'}</span></div>
                                </div>
                                {currentNodeIdx >= 0 && (
                                    <div className={`flex items-center gap-1.5 font-mono tracking-widest text-[7px] md:text-[8px] px-3 py-1 rounded-full ${isDark ? 'bg-black/60 text-slate-300' : 'bg-white/80 text-slate-700 shadow-sm'}`}>
                                        <CheckCircle2 size={10} className={systemStatus === 'halting' ? "text-red-500" : "text-blue-500"} />
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