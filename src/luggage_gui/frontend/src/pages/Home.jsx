import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Gamepad2, Map as MapIcon, Navigation, Info, BookOpen, Settings } from 'lucide-react';

export default function Home({ globalState, syncState }) {
    const navigate = useNavigate();

    // Read the current theme from the Global Synchronizer
    const isDark = !globalState || globalState.theme === 'dark';

    const handleNavigation = (path) => {
        // MAGIC FIX: Broadcast the page change to the Python Master Brain 
        // so the laptop and phone switch pages at the exact same time!
        if (syncState) {
            syncState({ current_path: path });
        }
        navigate(path);
    };

    const menuItems = [
        { title: 'FREE DRIVE', icon: <Gamepad2 size={56} className="md:w-16 md:h-16" />, color: 'text-cyan-500', glow: 'group-hover:shadow-[0_0_40px_rgba(6,182,212,0.4)]', bgGlow: 'from-cyan-500/10', desc: 'Manual Teleop Control', path: '/freedrive' },
        { title: 'FACILITY MAPPING', icon: <MapIcon size={56} className="md:w-16 md:h-16" />, color: 'text-emerald-500', glow: 'group-hover:shadow-[0_0_40px_rgba(16,185,129,0.4)]', bgGlow: 'from-emerald-500/10', desc: 'Generate SLAM Maps', path: '/mapping' },
        { title: 'LOGISTICS NAV', icon: <Navigation size={56} className="md:w-16 md:h-16" />, color: 'text-blue-500', glow: 'group-hover:shadow-[0_0_40px_rgba(59,130,246,0.4)]', bgGlow: 'from-blue-500/10', desc: 'Autonomous Waypoints', path: '/navigation' },
        { title: 'CONTROL PANEL', icon: <Settings size={56} className="md:w-16 md:h-16" />, color: 'text-indigo-500', glow: 'group-hover:shadow-[0_0_40px_rgba(99,102,241,0.4)]', bgGlow: 'from-indigo-500/10', desc: 'System Configuration', path: '/settings' },
        { title: 'SYSTEM GUIDE', icon: <BookOpen size={56} className="md:w-16 md:h-16" />, color: isDark ? 'text-slate-300' : 'text-slate-600', glow: 'group-hover:shadow-[0_0_40px_rgba(148,163,184,0.4)]', bgGlow: 'from-slate-500/10', desc: 'Operator Manual', path: '/guide' },
        { title: 'ABOUT US', icon: <Info size={56} className="md:w-16 md:h-16" />, color: isDark ? 'text-slate-300' : 'text-slate-600', glow: 'group-hover:shadow-[0_0_40px_rgba(148,163,184,0.4)]', bgGlow: 'from-slate-500/10', desc: 'Humynex Robotics', path: '/about' },
    ];

    return (
        <div className="min-h-full flex flex-col justify-center items-center max-w-7xl mx-auto space-y-8 md:space-y-12 px-4 py-8 animate-fade-in-up pb-24">

            <div className="text-center mb-4 md:mb-8">
                <h2 className={`font-mono tracking-[0.3em] text-[10px] md:text-sm uppercase mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Select Operations Module
                </h2>
            </div>

            {/* Massive, buttery smooth 3x2 grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10 w-full px-2">
                {menuItems.map((item, index) => (
                    <button
                        key={index}
                        onClick={() => handleNavigation(item.path)}
                        className={`group relative border p-8 md:p-14 rounded-[2.5rem] flex flex-col items-center justify-center space-y-6 transition-all duration-500 ease-out hover:-translate-y-2 active:scale-95 overflow-hidden ${item.glow} ${isDark ? 'bg-black/40 backdrop-blur-xl border-slate-700/50 hover:border-slate-400 shadow-2xl' : 'bg-white/80 backdrop-blur-xl border-slate-200 hover:border-slate-400 shadow-xl'}`}
                    >
                        {/* Glow Effect Background on Hover */}
                        <div className={`absolute inset-0 bg-gradient-to-t ${item.bgGlow} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700`}></div>

                        <div className={`${item.color} z-10 transform transition-all duration-500 group-hover:scale-110 group-hover:-translate-y-2 drop-shadow-2xl`}>
                            {item.icon}
                        </div>

                        <div className="flex flex-col items-center z-10 transition-transform duration-500 group-hover:translate-y-1">
                            <h2 className={`text-xl md:text-2xl font-black tracking-widest text-center mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                {item.title}
                            </h2>
                            <p className={`font-mono text-[10px] md:text-xs text-center uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                {item.desc}
                            </p>
                        </div>

                        {/* Subtle bottom accent line that expands on hover */}
                        <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-1 w-0 group-hover:w-1/2 transition-all duration-500 rounded-t-full ${item.color.replace('text-', 'bg-')}`}></div>
                    </button>
                ))}
            </div>
        </div>
    );
}