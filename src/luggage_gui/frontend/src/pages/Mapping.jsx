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
import { Map as MapIcon, Plus, Folder, Trash2, Edit2, MapPin, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, StopCircle, Zap, Power, CheckCircle2, AlertTriangle, ChevronLeft, Save, Activity, Radar } from 'lucide-react';

export default function Mapping({ ros, setInterceptor, globalState, syncState }) {
    const navigate = useNavigate();
    const [view, setView] = useState('hub');
    const [systemStatus, setSystemStatus] = useState('idle');
    const [fillProgress, setFillProgress] = useState(0);
    const [currentNodeIdx, setCurrentNodeIdx] = useState(-1);
    const [currentMappingPins, setCurrentMappingPins] = useState([]);
    const [logs, setLogs] = useState([]);
    const [sysTelemetry, setSysTelemetry] = useState({ pico_connected: false, lidar_connected: false });

    const [showSaveModal, setShowSaveModal] = useState(false);
    const [showExitModal, setShowExitModal] = useState(false);
    const [pendingExternalNav, setPendingExternalNav] = useState(null);
    const [newMapName, setNewMapName] = useState('');

    const [pinPrompt, setPinPrompt] = useState(null);
    const [newPinName, setNewPinName] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [renamePrompt, setRenamePrompt] = useState(null);
    const [editNameInput, setEditNameInput] = useState('');

    const [savedMaps, setSavedMaps] = useState([
        { id: 1, name: 'Terminal A - Concourse', date: '2026-03-21', locations: [{ id: 101, name: 'Gate 4', theta: 0 }, { id: 102, name: 'Charging Dock', theta: 90 }] },
        { id: 2, name: 'Baggage Claim North', date: '2026-03-20', locations: [{ id: 103, name: 'Carousel 1', theta: 180 }] }
    ]);
    const [selectedMap, setSelectedMap] = useState(null);
    const [slideIdx, setSlideIdx] = useState(0);

    const viewerRef = useRef(null);
    const poseDataRef = useRef(null);
    const engineRef = useRef(null);

    const bootSequence = ["Initializing SLAM Toolbox...", "Connecting Lidar Scans...", "Generating Occupancy Grid...", "Connecting TF Tree...", "SYSTEM READY"];
    const shutdownSequence = ["Terminating SLAM Nodes...", "Clearing Occupancy Grid...", "Unmounting Visualizer...", "SYSTEM HALTED"];
    const saveSequence = ["Saving Map Data (.yaml)...", "Terminating SLAM Nodes...", "Unmounting Visualizer...", "MAP SAVED SUCCESSFULLY"];

    const isDark = !globalState || globalState.theme === 'dark';

    // 1. DEEP GLOBAL STATE SYNCHRONIZATION
    useEffect(() => {
        if (!globalState) return;
        if (globalState.map_view !== undefined && globalState.map_view !== view) setView(globalState.map_view);
        if (globalState.map_systemStatus !== undefined && globalState.map_systemStatus !== systemStatus) setSystemStatus(globalState.map_systemStatus);
        if (globalState.map_fillProgress !== undefined && globalState.map_fillProgress !== fillProgress) setFillProgress(globalState.map_fillProgress);
        if (globalState.map_currentNodeIdx !== undefined && globalState.map_currentNodeIdx !== currentNodeIdx) setCurrentNodeIdx(globalState.map_currentNodeIdx);
        if (globalState.map_showExitModal !== undefined && globalState.map_showExitModal !== showExitModal) setShowExitModal(globalState.map_showExitModal);
        if (globalState.map_showSaveModal !== undefined && globalState.map_showSaveModal !== showSaveModal) setShowSaveModal(globalState.map_showSaveModal);
    }, [globalState]);

    // Telemetry Listener for Hardware Pre-flight Checks
    useEffect(() => {
        if (!ros) return;
        const telemetryListener = new ROSLIB.Topic({ ros: ros, name: '/gui/system_telemetry', messageType: 'std_msgs/String' });
        telemetryListener.subscribe((msg) => { setSysTelemetry(JSON.parse(msg.data)); });
        return () => telemetryListener.unsubscribe();
    }, [ros]);

    useEffect(() => {
        let timer;
        if (view === 'library' && !selectedMap && savedMaps.length > 0) { timer = setInterval(() => setSlideIdx((prev) => (prev + 1) % savedMaps.length), 4000); }
        return () => clearInterval(timer);
    }, [view, selectedMap, savedMaps.length]);

    // Safety Interceptor
    useEffect(() => {
        if (systemStatus === 'running' && view === 'mapping') {
            setInterceptor({
                message: "You are currently generating a map. Do you want to Discard this mapping run, or Save it before exiting?",
                actions: [
                    { label: 'DISCARD & EXIT', style: 'bg-red-600 hover:bg-red-500 text-white', onClick: (targetPath) => { setPendingExternalNav(targetPath); triggerAbort(); } },
                    { label: 'SAVE & EXIT', style: 'bg-emerald-600 hover:bg-emerald-500 text-white', onClick: (targetPath) => { setPendingExternalNav(targetPath); setShowSaveModal(true); if (syncState) syncState({ map_showSaveModal: true }); } }
                ]
            });
        } else { setInterceptor(null); }
    }, [systemStatus, view, ros, setInterceptor, syncState]);

    useEffect(() => {
        return () => { if (ros && systemStatus === 'running') { new ROSLIB.Topic({ ros: ros, name: '/gui/system_command', messageType: 'std_msgs/String' }).publish({ data: 'KILL' }); } };
    }, [ros, systemStatus]);

    const triggerLaunch = () => {
        if (!sysTelemetry.pico_connected || !sysTelemetry.lidar_connected) {
            setLogs(prev => [...prev, { level: 40, name: 'PRE-FLIGHT', msg: 'HARDWARE DISCONNECTED. Plug in Pico & LiDAR to map.' }]);
            return;
        }

        setSystemStatus('booting'); setFillProgress(0); setCurrentNodeIdx(0); setCurrentMappingPins([]);
        if (syncState) syncState({ map_systemStatus: 'booting', map_fillProgress: 0, map_currentNodeIdx: 0 });

        if (ros) new ROSLIB.Topic({ ros: ros, name: '/gui/system_command', messageType: 'std_msgs/String' }).publish({ data: 'LAUNCH_MAPPING' });

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
                if (syncState) syncState({ map_fillProgress: 100, map_currentNodeIdx: bootSequence.length, map_systemStatus: 'running' });
            } else {
                setFillProgress(progress);
                if (syncState) syncState({ map_fillProgress: progress, map_currentNodeIdx: nodeIndex });
            }
        }, 120);
    };

    const triggerAbort = () => {
        setShowExitModal(false); setSystemStatus('halting'); setFillProgress(0); setCurrentNodeIdx(0);
        if (syncState) syncState({ map_showExitModal: false, map_systemStatus: 'halting', map_fillProgress: 0, map_currentNodeIdx: 0 });

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
                        if (syncState) syncState({ current_path: pendingExternalNav, map_view: 'hub', map_systemStatus: 'idle' });
                        navigate(pendingExternalNav);
                    } else {
                        setView('hub');
                        if (syncState) syncState({ map_view: 'hub', map_systemStatus: 'idle' });
                    }
                    setPendingExternalNav(null);
                }, 1200);
            } else {
                setFillProgress(progress);
                if (syncState) syncState({ map_fillProgress: progress, map_currentNodeIdx: nodeIndex });
            }
        }, 120);
    };

    const triggerSaveAndHalt = () => {
        setShowSaveModal(false); setShowExitModal(false); setSystemStatus('saving'); setFillProgress(0); setCurrentNodeIdx(0);
        if (syncState) syncState({ map_showSaveModal: false, map_showExitModal: false, map_systemStatus: 'saving', map_fillProgress: 0, map_currentNodeIdx: 0 });

        if (ros) {
            new ROSLIB.Topic({ ros: ros, name: '/cmd_vel', messageType: 'geometry_msgs/Twist' }).publish({ linear: { x: 0, y: 0, z: 0 }, angular: { x: 0, y: 0, z: 0 } });
            new ROSLIB.Topic({ ros: ros, name: '/gui/system_command', messageType: 'std_msgs/String' }).publish({ data: 'KILL' });
        }
        const newMap = { id: Date.now(), name: newMapName || `Facility_Map_${savedMaps.length + 1}`, date: new Date().toISOString().split('T')[0], locations: currentMappingPins };
        setSavedMaps([newMap, ...savedMaps]); setNewMapName('');

        let progress = 0; let nodeIndex = -1;
        const interval = setInterval(() => {
            progress += Math.floor(Math.random() * 6) + 2;
            const expectedIndex = Math.floor((progress / 100) * saveSequence.length);
            if (expectedIndex > nodeIndex && expectedIndex < saveSequence.length) {
                nodeIndex = expectedIndex;
                setCurrentNodeIdx(nodeIndex);
            }
            if (progress >= 100) {
                clearInterval(interval);
                setFillProgress(100);
                setCurrentNodeIdx(saveSequence.length);
                setTimeout(() => {
                    setSystemStatus('idle');
                    if (pendingExternalNav) {
                        if (syncState) syncState({ current_path: pendingExternalNav, map_view: 'hub', map_systemStatus: 'idle' });
                        navigate(pendingExternalNav);
                    } else {
                        setView('hub');
                        if (syncState) syncState({ map_view: 'hub', map_systemStatus: 'idle' });
                    }
                    setPendingExternalNav(null);
                }, 1200);
            } else {
                setFillProgress(progress);
                if (syncState) syncState({ map_fillProgress: progress, map_currentNodeIdx: nodeIndex });
            }
        }, 120);
    };

    // 3D Canvas initialization
    useEffect(() => {
        if ((view !== 'mapping' && view !== 'inspector') || !viewerRef.current) return;
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

        engineRef.current = { scene, camera, renderer, rosSpace, robotContainer, controls, animationFrameId, mapMesh: null };

        return () => {
            cancelAnimationFrame(animationFrameId);
            renderer.dispose();
            engineRef.current = null;
        };
    }, [view]);

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

    // URDF, Maps, Pose Injector
    useEffect(() => {
        if (systemStatus !== 'running' || !ros || !engineRef.current) return;

        const { rosSpace, robotContainer } = engineRef.current;
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
            if (loadedModel) robotContainer.remove(loadedModel);
            if (engineRef.current && engineRef.current.mapMesh) {
                rosSpace.remove(engineRef.current.mapMesh);
                engineRef.current.mapMesh.geometry.dispose();
                engineRef.current.mapMesh.material.dispose();
                engineRef.current.mapMesh = null;
            }
        };
    }, [systemStatus, ros]);

    useEffect(() => {
        if (!ros || view !== 'mapping') return;
        const rosoutListener = new ROSLIB.Topic({ ros: ros, name: '/rosout', messageType: 'rcl_interfaces/Log' });
        rosoutListener.subscribe((msg) => { setLogs(prev => [...prev, msg].slice(-20)); });
        return () => rosoutListener.unsubscribe();
    }, [ros, view]);

    const initDropPin = () => { if (systemStatus !== 'running') return; setPinPrompt({ id: Date.now(), theta: Math.floor(Math.random() * 360) }); setNewPinName(`Location_${currentMappingPins.length + 1}`); };
    const confirmDropPin = () => { setCurrentMappingPins([...currentMappingPins, { ...pinPrompt, name: newPinName }]); setPinPrompt(null); };

    const handleBackToHub = () => {
        if (systemStatus === 'running') {
            setPendingExternalNav(null);
            setShowExitModal(true);
            if (syncState) syncState({ map_showExitModal: true });
        } else {
            setView('hub');
            if (syncState) syncState({ map_view: 'hub' });
        }
    };

    const moveRobot = (linearDir, angularDir) => { if (!ros || systemStatus !== 'running') return; new ROSLIB.Topic({ ros: ros, name: '/cmd_vel', messageType: 'geometry_msgs/Twist' }).publish({ linear: { x: linearDir * 0.5, y: 0, z: 0 }, angular: { x: 0, y: 0, z: angularDir * 0.5 } }); };
    const stopRobot = () => { if (!ros || systemStatus !== 'running') return; new ROSLIB.Topic({ ros: ros, name: '/cmd_vel', messageType: 'geometry_msgs/Twist' }).publish({ linear: { x: 0, y: 0, z: 0 }, angular: { x: 0, y: 0, z: 0 } }); };

    const executeRename = () => {
        if (!renamePrompt || !editNameInput.trim()) return;
        if (renamePrompt.type === 'map') { setSavedMaps(savedMaps.map(m => m.id === renamePrompt.id ? { ...m, name: editNameInput } : m)); }
        else if (renamePrompt.type === 'location' && selectedMap) {
            const updatedMap = { ...selectedMap, locations: selectedMap.locations.map(l => l.id === renamePrompt.id ? { ...l, name: editNameInput } : l) };
            setSelectedMap(updatedMap); setSavedMaps(savedMaps.map(m => m.id === updatedMap.id ? updatedMap : m));
        }
        setRenamePrompt(null);
    };

    const executeDelete = () => {
        if (!deleteConfirm) return;
        if (deleteConfirm.type === 'map') { setSavedMaps(savedMaps.filter(m => m.id !== deleteConfirm.id)); if (selectedMap && selectedMap.id === deleteConfirm.id) setSelectedMap(null); }
        else if (deleteConfirm.type === 'location' && selectedMap) {
            const updatedMap = { ...selectedMap, locations: selectedMap.locations.filter(l => l.id !== deleteConfirm.id) };
            setSelectedMap(updatedMap); setSavedMaps(savedMaps.map(m => m.id === updatedMap.id ? updatedMap : m));
        }
        setDeleteConfirm(null);
    };

    const renderModals = () => (
        <>
            {showSaveModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-4">
                    <div className={`border p-6 md:p-8 rounded-3xl shadow-2xl max-w-md w-full ${isDark ? 'bg-slate-900 border-emerald-500/50 shadow-[0_0_40px_rgba(16,185,129,0.2)]' : 'bg-white border-emerald-300'}`}>
                        <h2 className={`text-lg md:text-xl font-bold tracking-widest mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}><Save className="text-emerald-500" /> SAVE FACILITY MAP</h2>
                        <p className="text-slate-500 text-xs font-mono mb-4">Enter a name for this map. Includes {currentMappingPins.length} saved locations.</p>
                        <input autoFocus type="text" placeholder="e.g. Terminal A" value={newMapName} onChange={(e) => setNewMapName(e.target.value)} className={`w-full border px-4 py-3 rounded-xl font-mono text-sm focus:outline-none focus:border-emerald-500 mb-6 ${isDark ? 'bg-slate-950 border-slate-700 text-emerald-400' : 'bg-slate-50 border-slate-300 text-emerald-600'}`} />
                        <div className="flex gap-3 md:gap-4 w-full">
                            <button onClick={() => { setShowSaveModal(false); setPendingExternalNav(null); if (syncState) syncState({ map_showSaveModal: false }); }} className={`flex-1 py-3 rounded-xl font-bold text-xs md:text-sm transition-all ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}`}>CANCEL</button>
                            <button onClick={triggerSaveAndHalt} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold text-xs md:text-sm shadow-lg transition-all">SAVE & EXIT</button>
                        </div>
                    </div>
                </div>
            )}

            {showExitModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-4">
                    <div className={`border p-6 md:p-8 rounded-3xl shadow-2xl max-w-lg w-full flex flex-col items-center text-center ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}>
                        <AlertTriangle className="text-yellow-500 mb-4 w-10 h-10 md:w-12 md:h-12 animate-pulse" />
                        <h2 className={`text-lg md:text-xl font-bold tracking-widest mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>ACTIVE MAPPING SESSION</h2>
                        <p className="text-slate-500 text-xs md:text-sm font-mono mb-6 md:mb-8">Do you want to discard this mapping run, or save it to the database before exiting?</p>
                        <div className="flex flex-col md:flex-row gap-3 md:gap-4 w-full">
                            <button onClick={() => { setShowExitModal(false); if (syncState) syncState({ map_showExitModal: false }); }} className={`flex-1 py-3 rounded-xl font-bold tracking-widest text-xs md:text-sm transition-all ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}`}>CANCEL</button>
                            <button onClick={triggerAbort} className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl font-bold tracking-widest text-xs md:text-sm shadow-lg transition-all">DISCARD</button>
                            <button onClick={() => { setShowExitModal(false); setShowSaveModal(true); if (syncState) syncState({ map_showExitModal: false, map_showSaveModal: true }); }} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold tracking-widest text-xs md:text-sm shadow-lg transition-all">SAVE</button>
                        </div>
                    </div>
                </div>
            )}

            {pinPrompt && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-4">
                    <div className={`border p-6 md:p-8 rounded-3xl shadow-2xl max-w-md w-full ${isDark ? 'bg-slate-900 border-blue-500/50 shadow-[0_0_40px_rgba(59,130,246,0.2)]' : 'bg-white border-blue-300'}`}>
                        <h2 className={`text-lg md:text-xl font-bold tracking-widest mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}><MapPin className="text-blue-500" /> NAME LOCATION</h2>
                        <input autoFocus type="text" value={newPinName} onChange={(e) => setNewPinName(e.target.value)} className={`w-full border px-4 py-3 rounded-xl font-mono text-sm focus:outline-none focus:border-blue-500 mb-6 ${isDark ? 'bg-slate-950 border-slate-700 text-blue-400' : 'bg-slate-50 border-slate-300 text-blue-600'}`} />
                        <div className="flex gap-3 md:gap-4 w-full">
                            <button onClick={() => setPinPrompt(null)} className={`flex-1 py-3 rounded-xl font-bold text-xs md:text-sm transition-all ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}`}>CANCEL</button>
                            <button onClick={confirmDropPin} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold text-xs md:text-sm shadow-lg transition-all">DROP PIN</button>
                        </div>
                    </div>
                </div>
            )}

            {renamePrompt && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-4">
                    <div className={`border p-6 md:p-8 rounded-3xl shadow-2xl max-w-md w-full ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}>
                        <h2 className={`text-lg md:text-xl font-bold tracking-widest mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>RENAME {renamePrompt.type.toUpperCase()}</h2>
                        <input autoFocus type="text" value={editNameInput} onChange={(e) => setEditNameInput(e.target.value)} className={`w-full border px-4 py-3 rounded-xl font-mono text-sm focus:outline-none focus:border-cyan-500 mb-6 ${isDark ? 'bg-slate-950 border-slate-700 text-cyan-400' : 'bg-slate-50 border-slate-300 text-cyan-600'}`} />
                        <div className="flex gap-3 md:gap-4 w-full">
                            <button onClick={() => setRenamePrompt(null)} className={`flex-1 py-3 rounded-xl font-bold text-xs md:text-sm transition-all ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}`}>CANCEL</button>
                            <button onClick={executeRename} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold text-xs md:text-sm transition-all">SAVE</button>
                        </div>
                    </div>
                </div>
            )}

            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-4">
                    <div className={`border p-6 md:p-8 rounded-3xl shadow-2xl max-w-md w-full flex flex-col items-center text-center ${isDark ? 'bg-slate-900 border-red-900/50 shadow-[0_0_40px_rgba(220,38,38,0.2)]' : 'bg-white border-red-300'}`}>
                        <AlertTriangle size={48} className="text-red-500 mb-4 animate-pulse" />
                        <h2 className={`text-lg md:text-xl font-bold tracking-widest mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>CONFIRM DELETION</h2>
                        <p className="text-slate-500 text-xs md:text-sm mb-8">This action is permanent and cannot be undone. Are you sure?</p>
                        <div className="flex gap-3 md:gap-4 w-full">
                            <button onClick={() => setDeleteConfirm(null)} className={`flex-1 py-3 rounded-xl font-bold text-xs md:text-sm transition-all ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}`}>CANCEL</button>
                            <button onClick={executeDelete} className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl font-bold text-xs md:text-sm transition-all shadow-lg">DELETE</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );

    const activeErrors = logs.filter(l => l.level >= 30);
    const normalLogs = logs.filter(l => l.level < 30).slice(-4);

    return (
        <div className="h-full relative animate-fade-in-up pb-10">
            {renderModals()}
            {view === 'hub' && (
                <div className="h-full flex items-center justify-center relative px-2">
                    <div className={`backdrop-blur-md border p-6 md:p-12 rounded-[2rem] md:rounded-[3rem] shadow-2xl flex flex-col items-center max-w-3xl w-full ${isDark ? 'bg-black/60 border-slate-700/50' : 'bg-white/80 border-slate-300'}`}>
                        <div className="flex items-center gap-3 md:gap-4 mb-8 md:mb-10">
                            <MapIcon className="text-emerald-500 w-8 h-8 md:w-10 md:h-10" />
                            <h2 className={`text-xl md:text-3xl font-black tracking-widest uppercase ${isDark ? 'text-white' : 'text-slate-900'}`}>FACILITY MAPPING</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 w-full">
                            <button onClick={() => { setView('mapping'); setSystemStatus('idle'); setCurrentMappingPins([]); if (syncState) syncState({ map_view: 'mapping', map_systemStatus: 'idle' }); }} className={`group active:scale-95 border p-5 md:p-8 rounded-2xl md:rounded-3xl flex flex-col items-center gap-3 md:gap-4 transition-all hover:border-emerald-500 shadow-lg ${isDark ? 'bg-slate-800/80 hover:bg-slate-700 border-slate-600/50' : 'bg-slate-100 hover:bg-white border-slate-300'}`}>
                                <div className="bg-emerald-500/20 p-3 md:p-4 rounded-full group-hover:scale-110 transition-transform"><Plus className="text-emerald-500 w-8 h-8 md:w-12 md:h-12" /></div>
                                <span className={`font-bold tracking-widest text-sm md:text-lg mt-1 md:mt-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>CREATE NEW MAP</span>
                                <span className="text-slate-500 text-[10px] md:text-xs font-mono text-center">Boot SLAM & Teleop</span>
                            </button>
                            <button onClick={() => { setView('library'); setSelectedMap(null); if (syncState) syncState({ map_view: 'library' }); }} className={`group active:scale-95 border p-5 md:p-8 rounded-2xl md:rounded-3xl flex flex-col items-center gap-3 md:gap-4 transition-all hover:border-blue-500 shadow-lg ${isDark ? 'bg-slate-800/80 hover:bg-slate-700 border-slate-600/50' : 'bg-slate-100 hover:bg-white border-slate-300'}`}>
                                <div className="bg-blue-500/20 p-3 md:p-4 rounded-full group-hover:scale-110 transition-transform"><Folder className="text-blue-500 w-8 h-8 md:w-12 md:h-12" /></div>
                                <span className={`font-bold tracking-widest text-sm md:text-lg mt-1 md:mt-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>SAVED MAPS</span>
                                <span className="text-slate-500 text-[10px] md:text-xs font-mono text-center">Manage & Edit Locations</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {view === 'mapping' && (
                <div className="h-full flex flex-col items-center relative animate-fade-in-up">
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
                                <span className="text-emerald-500 font-bold tracking-widest font-mono text-[10px] md:text-sm flex items-center gap-2 md:gap-3 animate-pulse"><Activity size={14} /> SLAM ACTIVE</span>
                                <span className="text-slate-500 font-mono text-[9px] md:text-xs">PINS: <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentMappingPins.length}</span></span>
                            </div>

                            <div id="urdf-canvas" ref={viewerRef} className="w-full h-full flex items-center justify-center cursor-move"></div>

                            <div className={`absolute bottom-4 right-4 backdrop-blur-sm border px-3 md:px-4 py-2 rounded-xl shadow-lg z-20 flex items-center gap-2 ${isDark ? 'bg-black/70 border-slate-700' : 'bg-white/80 border-slate-300'}`}>
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                <span ref={poseDataRef} className="text-emerald-500 font-mono text-[10px] md:text-sm tracking-widest font-bold">POS: [ 0.00 , 0.00 ]</span>
                            </div>

                            {/* Smart Diagnostics Focus-Scroll */}
                            <div className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 w-[90%] md:w-[80%] pointer-events-none flex flex-col items-center justify-end h-24 md:h-32 overflow-hidden" style={{ maskImage: 'linear-gradient(to top, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)', WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)' }}>
                                {normalLogs.length === 0 && <span className="text-slate-500 font-mono text-[9px] md:text-xs italic mb-1 md:mb-2">Awaiting telemetry...</span>}
                                {normalLogs.map((log, i) => {
                                    const isLast = i === normalLogs.length - 1;
                                    return (
                                        <div key={i} className={`font-mono tracking-wide text-center transition-all duration-300 w-full truncate ${isLast ? 'text-[10px] md:text-[12px] opacity-100 mb-1 md:mb-2 drop-shadow-md ' + (isDark ? 'text-slate-300' : 'text-slate-700') : 'text-[8px] md:text-[10px] text-slate-500 opacity-40 mb-0.5 md:mb-1'}`}>
                                            <span className="text-emerald-500 mr-1 md:mr-2">[{log.name}]</span>{log.msg}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* RIGHT: CONTROL PANEL */}
                        <div className={`w-full md:w-[40%] flex flex-col gap-3 md:gap-4 h-full transition-opacity duration-500 ${systemStatus === 'running' || systemStatus === 'idle' ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                            <div className="flex gap-2 shrink-0">
                                <button onClick={handleBackToHub} className={`flex-1 backdrop-blur-md border p-3 rounded-xl flex items-center justify-center gap-2 transition-all group active:scale-95 shadow-lg ${isDark ? 'bg-slate-900/80 border-slate-700/50 hover:bg-slate-800 text-slate-300' : 'bg-white/80 border-slate-300 hover:bg-white text-slate-700'}`}>
                                    <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /><span className="font-bold tracking-widest text-[9px] md:text-xs">HUB</span>
                                </button>
                                <button onClick={() => { setShowSaveModal(true); if (syncState) syncState({ map_showSaveModal: true }); }} disabled={systemStatus !== 'running'} className={`flex-[2] border p-3 rounded-xl flex items-center justify-center gap-2 transition-all ${systemStatus === 'running' ? (isDark ? 'bg-emerald-600/80 backdrop-blur-md border-emerald-400 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-emerald-500 text-white shadow-lg') : (isDark ? 'bg-slate-900 border-slate-700 text-slate-500 opacity-50' : 'bg-slate-200 border-slate-300 text-slate-400 opacity-50')}`}>
                                    <Save size={14} /><span className="font-black tracking-widest text-[9px] md:text-xs">FINISH & SAVE</span>
                                </button>
                            </div>

                            <button onClick={initDropPin} disabled={systemStatus !== 'running'} className={`flex-none border p-3 md:p-5 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all ${systemStatus === 'running' ? (isDark ? 'bg-blue-900/40 backdrop-blur-md border-blue-500/50 hover:bg-blue-800/60 text-blue-400' : 'bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-600') : (isDark ? 'bg-slate-900 border-slate-700 text-slate-500 opacity-50' : 'bg-slate-200 border-slate-300 text-slate-400 opacity-50')}`}>
                                <MapPin size={20} className="md:w-6 md:h-6" />
                                <span className={`font-bold tracking-widest text-center text-[10px] md:text-sm ${systemStatus === 'running' ? (isDark ? 'text-white' : 'text-slate-900') : ''}`}>DROP LOCATION PIN</span>
                                <span className="font-mono text-[8px] md:text-[10px] opacity-80">Saves current X, Y, Theta</span>
                            </button>

                            <div className={`flex-1 backdrop-blur-md border py-4 md:p-6 rounded-2xl md:rounded-3xl flex flex-col items-center justify-center min-h-[160px] md:min-h-[220px] transition-all shadow-xl ${systemStatus === 'running' ? (isDark ? 'bg-black/40 border-slate-700/50' : 'bg-white/60 border-slate-300') : (isDark ? 'bg-slate-900 border-slate-800 opacity-50' : 'bg-slate-200 border-slate-300 opacity-50')}`}>
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
                                    <button onClick={triggerLaunch} className="w-full py-3 md:py-4 bg-emerald-600/20 backdrop-blur-md border-2 border-emerald-500 rounded-2xl md:rounded-3xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:bg-emerald-600/30">
                                        <Zap size={16} className="text-emerald-500 md:w-5 md:h-5" /><span className={`font-sans font-black text-[10px] md:text-sm tracking-[0.2em] uppercase ${isDark ? 'text-white' : 'text-emerald-700'}`}>BOOT MAPPING</span>
                                    </button>
                                )}
                                {systemStatus === 'running' && (
                                    <button onClick={triggerAbort} className="w-full py-3 md:py-4 bg-red-600/90 backdrop-blur-md border-2 border-red-500 text-white rounded-2xl md:rounded-3xl font-black text-[10px] md:text-sm tracking-[0.2em] shadow-[0_0_20px_rgba(220,38,38,0.5)] hover:bg-red-500 active:scale-95 transition-all flex items-center justify-center gap-2">
                                        <Power size={16} className="md:w-5 md:h-5" /> STOP
                                    </button>
                                )}
                                {(systemStatus === 'booting' || systemStatus === 'halting' || systemStatus === 'saving') && (
                                    <div className="w-full flex flex-col items-center gap-1.5 md:gap-2">
                                        <div className={`relative w-full h-10 md:h-12 border rounded-xl md:rounded-2xl overflow-hidden shadow-inner ${isDark ? 'bg-slate-900 border-slate-600' : 'bg-slate-200 border-slate-400'}`}>
                                            <div className={`absolute left-0 top-0 h-full transition-all duration-150 ease-out flex items-center justify-center ${systemStatus === 'halting' ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${fillProgress}%` }}>
                                                <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)50%,rgba(255,255,255,0.15)75%,transparent_75%,transparent)] bg-[length:1rem_1rem] opacity-30"></div>
                                            </div>
                                            <div className="absolute inset-0 z-10 flex items-center justify-center"><span className="font-sans font-bold text-white tracking-[0.2em] uppercase text-[8px] md:text-[10px]">{systemStatus === 'halting' ? 'ABORTING...' : systemStatus === 'saving' ? 'SAVING...' : 'INITIALIZING SLAM...'}</span></div>
                                        </div>
                                        {currentNodeIdx >= 0 && (
                                            <div className={`flex items-center gap-1.5 font-mono tracking-widest text-[7px] md:text-[8px] px-3 py-1 rounded-full ${isDark ? 'bg-black/60 text-slate-300' : 'bg-white/80 text-slate-700 shadow-sm'}`}>
                                                <CheckCircle2 size={10} className={systemStatus === 'halting' ? "text-red-500" : "text-emerald-500"} />
                                                <span>{systemStatus === 'halting' ? (currentNodeIdx >= shutdownSequence.length ? 'SYSTEM HALTED' : shutdownSequence[currentNodeIdx]) : systemStatus === 'saving' ? (currentNodeIdx >= saveSequence.length ? 'SAVED' : saveSequence[currentNodeIdx]) : (currentNodeIdx >= bootSequence.length ? 'SYSTEM READY' : bootSequence[currentNodeIdx])}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {(view === 'library' || view === 'inspector') && (
                <div className="h-full flex flex-col items-center relative animate-fade-in-up">
                    <div className="w-full flex flex-col md:flex-row gap-3 md:gap-6 h-auto md:h-full max-w-[1800px]">
                        <div className={`w-full md:w-[60%] min-h-[40vh] md:min-h-0 flex flex-col backdrop-blur-md border rounded-[1.5rem] md:rounded-[2.5rem] shadow-2xl overflow-hidden relative group shrink-0 ${isDark ? 'bg-slate-950/80 border-slate-700/50' : 'bg-slate-100/90 border-slate-300'}`}>
                            <div className={`absolute top-0 w-full backdrop-blur-md p-3 md:p-5 flex justify-between items-center z-10 border-b ${isDark ? 'bg-black/50 border-slate-700/50' : 'bg-white/60 border-slate-300'}`}>
                                <span className="text-blue-500 font-bold tracking-widest font-mono text-[10px] md:text-sm flex items-center gap-2"><MapIcon size={14} /> {selectedMap ? 'INSPECTING MAP' : 'MAP DATABASE'}</span>
                                <span className={`font-mono text-[9px] md:text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{selectedMap ? `PINS: ${selectedMap.locations.length}` : `TOTAL RECORDS: ${savedMaps.length}`}</span>
                            </div>

                            {!selectedMap ? (
                                <div className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden">
                                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/graphy.png')] opacity-30 filter blur-sm scale-110 mix-blend-screen"></div>
                                    <div className="absolute top-0 left-0 w-full h-1 bg-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.8)] animate-[scan_4s_ease-in-out_infinite]"></div>
                                    {savedMaps.length > 0 ? (
                                        <div className={`z-10 flex flex-col items-center animate-fade-in-up backdrop-blur-md p-6 md:p-10 rounded-[1.5rem] md:rounded-[2rem] border shadow-2xl m-4 ${isDark ? 'bg-black/40 border-slate-700/50' : 'bg-white/80 border-slate-300'}`} key={slideIdx}>
                                            <MapIcon size={48} className="md:w-16 md:h-16 text-slate-500 mb-4 md:mb-6" />
                                            <h2 className={`text-xl md:text-3xl font-black tracking-widest mb-2 text-center px-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>{savedMaps[slideIdx].name}</h2>
                                            <span className="text-blue-500 font-mono text-[10px] md:text-xs tracking-widest bg-blue-500/10 px-3 py-1.5 rounded-full border border-blue-500/30">[{savedMaps[slideIdx].locations.length} SAVED LOCATIONS]</span>
                                        </div>
                                    ) : (<div className="z-10 text-slate-500 font-mono tracking-widest text-[10px] md:text-xs">NO MAPS IN DATABASE</div>)}
                                </div>
                            ) : (
                                <div className={`w-full h-full relative flex items-center justify-center ${isDark ? 'bg-slate-900' : 'bg-slate-200'}`}>
                                    <div className="text-slate-500 font-mono tracking-widest flex flex-col items-center gap-3">
                                        <MapIcon size={36} className="md:w-12 md:h-12 text-blue-500/50" />
                                        <span className="text-[10px] md:text-xs text-center">[STATIC MAP RENDERER OFFLINE]</span>
                                    </div>
                                    {selectedMap.locations.map((loc, i) => {
                                        const top = `${25 + ((loc.id * 17) % 50)}%`; const left = `${25 + ((loc.id * 23) % 50)}%`;
                                        return (
                                            <div key={loc.id} style={{ top, left }} className="absolute flex flex-col items-center animate-bounce">
                                                <div className="bg-blue-600 p-1.5 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.8)] border-2 border-white z-20"><MapPin size={12} className="text-white" /></div>
                                                <div className="w-0.5 md:w-1 h-4 md:h-6 bg-blue-600/50 -mt-1 z-10"></div>
                                                <div className={`mt-1 border px-2 py-1 rounded-md font-bold text-[8px] md:text-[10px] shadow-lg whitespace-nowrap z-20 ${isDark ? 'bg-slate-900 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900'}`}>{loc.name}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="w-full md:w-[40%] flex flex-col gap-3 md:gap-4 h-full">
                            <button onClick={() => { selectedMap ? setSelectedMap(null) : setView('hub'); if (syncState) syncState({ map_view: selectedMap ? 'library' : 'hub' }); }} className={`flex-none backdrop-blur-md border p-3 md:p-5 rounded-2xl md:rounded-3xl flex items-center gap-2 transition-all group active:scale-95 shadow-lg ${isDark ? 'bg-slate-900/80 border-slate-700/50 hover:bg-slate-800 text-slate-300' : 'bg-white/80 border-slate-300 hover:bg-white text-slate-700'}`}>
                                <ChevronLeft size={16} className="md:w-5 md:h-5 group-hover:-translate-x-1 transition-transform" /><span className="font-bold tracking-widest text-[10px] md:text-sm">{selectedMap ? 'BACK TO MAPS LIST' : 'BACK TO HUB'}</span>
                            </button>
                            <div className={`flex-1 backdrop-blur-md border rounded-[1.5rem] md:rounded-[2rem] shadow-xl flex flex-col overflow-hidden min-h-[200px] md:min-h-[300px] ${isDark ? 'bg-black/40 border-slate-700/50' : 'bg-white/60 border-slate-300'}`}>
                                <div className={`px-4 md:px-6 py-3 md:py-5 border-b flex justify-between items-center ${isDark ? 'bg-slate-900/80 border-slate-700/50' : 'bg-white/80 border-slate-300'}`}><span className={`text-[9px] md:text-sm font-bold tracking-widest flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedMap ? <><MapPin size={14} className="text-blue-500" /> SAVED LOCATIONS</> : <><Folder size={14} className="text-blue-500" /> SAVED MAPS</>}</span></div>
                                <div className="flex-1 overflow-y-auto p-3 md:p-5 flex flex-col gap-2 md:gap-4">
                                    {!selectedMap && (
                                        savedMaps.length === 0 ? (<div className="text-center text-slate-500 font-mono py-8 md:py-10 text-[9px] md:text-xs">DATABASE EMPTY</div>) : (
                                            savedMaps.map(map => (
                                                <div key={map.id} onClick={() => setSelectedMap(map)} className={`border p-3 md:p-5 rounded-xl md:rounded-2xl flex flex-col gap-2 group hover:border-blue-500/50 transition-colors cursor-pointer shadow ${isDark ? 'bg-slate-800/50 border-slate-600/50' : 'bg-white border-slate-200'}`}>
                                                    <div className="flex items-center justify-between"><span className={`font-bold tracking-wide text-xs md:text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>{map.name}</span><span className="text-emerald-500 font-mono text-[8px] md:text-[11px] tracking-widest flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded"><MapPin size={8} className="md:w-3 md:h-3" /> {map.locations.length}</span></div>
                                                    <div className="flex justify-between items-center"><span className="text-slate-500 font-mono text-[8px] md:text-[10px] tracking-widest">{map.date}</span><div className="flex gap-1 md:gap-2"><button onClick={(e) => { e.stopPropagation(); setEditNameInput(map.name); setRenamePrompt({ id: map.id, type: 'map', currentName: map.name }); }} className={`p-1.5 md:p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-900'}`}><Edit2 size={12} className="md:w-4 md:h-4" /></button><button onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ id: map.id, type: 'map' }); }} className={`p-1.5 md:p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-red-900/50 text-slate-400 hover:text-red-400' : 'hover:bg-red-100 text-slate-500 hover:text-red-500'}`}><Trash2 size={12} className="md:w-4 md:h-4" /></button></div></div>
                                                </div>
                                            ))
                                        )
                                    )}
                                    {selectedMap && (
                                        selectedMap.locations.length === 0 ? (<div className="text-center text-slate-500 font-mono py-8 md:py-10 text-[9px] md:text-xs">NO LOCATIONS SAVED</div>) : (
                                            selectedMap.locations.map((loc, i) => (
                                                <div key={loc.id} className={`border p-3 md:p-5 rounded-xl md:rounded-2xl flex items-center justify-between group hover:border-blue-500/50 transition-colors shadow ${isDark ? 'bg-slate-800/50 border-slate-600/50' : 'bg-white border-slate-200'}`}>
                                                    <div className="flex flex-col"><span className={`font-bold tracking-wide text-xs md:text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>{loc.name}</span><span className="text-slate-500 font-mono text-[8px] md:text-[10px] mt-1.5 md:mt-2">THETA: {loc.theta}° | POS: [{i + 1}]</span></div>
                                                    <div className="flex gap-1 md:gap-2"><button onClick={() => { setEditNameInput(loc.name); setRenamePrompt({ id: loc.id, type: 'location', currentName: loc.name }); }} className={`p-1.5 md:p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-900'}`}><Edit2 size={12} className="md:w-4 md:h-4" /></button><button onClick={() => setDeleteConfirm({ id: loc.id, type: 'location' })} className={`p-1.5 md:p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-red-900/50 text-slate-400 hover:text-red-400' : 'hover:bg-red-100 text-slate-500 hover:text-red-500'}`}><Trash2 size={12} className="md:w-4 md:h-4" /></button></div>
                                                </div>
                                            ))
                                        )
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}