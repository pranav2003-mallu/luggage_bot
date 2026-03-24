import React from 'react';
import { ChevronLeft, Wrench, Code2, Mail, Phone, Instagram, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function About({ globalState }) {
    const navigate = useNavigate();
    const isDark = !globalState || globalState.theme === 'dark';

    return (
        <div className="h-full flex flex-col items-center relative pb-32 px-2 md:px-6 pt-6 animate-fade-in-up">
            <div className="w-full max-w-5xl flex flex-col gap-6 md:gap-8">

                {/* Header */}
                <div className={`flex items-center justify-between backdrop-blur-md border p-5 md:p-6 rounded-3xl shadow-xl ${isDark ? 'bg-black/60 border-slate-700' : 'bg-white/80 border-slate-300'}`}>
                    <button onClick={() => navigate('/')} className={`p-3 rounded-xl transition-colors active:scale-95 group ${isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200'}`}>
                        <ChevronLeft className={`group-hover:-translate-x-1 transition-transform ${isDark ? 'text-white' : 'text-slate-900'}`} />
                    </button>
                    <div className="flex flex-col text-right">
                        <h2 className={`text-xl md:text-3xl font-black tracking-widest uppercase ${isDark ? 'text-white' : 'text-slate-900'}`}>PROJECT AEROPORTER</h2>
                        <span className="text-slate-500 font-mono text-[9px] md:text-xs tracking-widest">SYSTEM ARCHITECTURE & CREDITS</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">

                    {/* Hardware Team Card */}
                    <div className={`backdrop-blur-md border p-6 md:p-10 rounded-3xl shadow-2xl relative overflow-hidden group ${isDark ? 'bg-slate-900/80 border-slate-700/50' : 'bg-white/90 border-slate-300'}`}>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-bl-[100px] -z-10 group-hover:bg-emerald-500/20 transition-colors"></div>
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 md:p-4 bg-emerald-500/20 rounded-2xl"><Wrench className="text-emerald-500" size={28} /></div>
                            <div>
                                <h3 className={`text-lg md:text-xl font-black tracking-widest ${isDark ? 'text-white' : 'text-slate-900'}`}>HARDWARE & DESIGN</h3>
                                <span className="text-emerald-500 font-mono text-[10px] md:text-xs">MECHANICAL ENGINEERING</span>
                            </div>
                        </div>
                        <p className="text-slate-500 text-xs md:text-sm leading-relaxed mb-6">
                            The physical chassis, 3D printed components, motor driver integration, and power distribution systems were meticulously engineered to handle rigorous airport environments.
                        </p>
                        <div className={`p-4 md:p-5 rounded-2xl space-y-3 ${isDark ? 'bg-black/50 border border-slate-800' : 'bg-slate-50 border border-slate-200'}`}>
                            <div className="flex justify-between items-center"><span className={`font-bold text-xs md:text-sm tracking-wide ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Kiran</span><span className="text-emerald-500 font-mono text-[10px] md:text-xs">Lead Fabricator</span></div>
                            <div className="flex justify-between items-center"><span className={`font-bold text-xs md:text-sm tracking-wide ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Ashique</span><span className="text-emerald-500 font-mono text-[10px] md:text-xs">Systems Designer</span></div>
                            <div className="flex justify-between items-center"><span className={`font-bold text-xs md:text-sm tracking-wide ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Aldrin</span><span className="text-emerald-500 font-mono text-[10px] md:text-xs">Hardware Integration</span></div>
                            <div className="flex justify-between items-center"><span className={`font-bold text-xs md:text-sm tracking-wide ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Jeffin</span><span className="text-emerald-500 font-mono text-[10px] md:text-xs">Power Systems</span></div>
                        </div>
                    </div>

                    {/* Software Team Card */}
                    <div className={`backdrop-blur-md border p-6 md:p-10 rounded-3xl shadow-2xl relative overflow-hidden group flex flex-col ${isDark ? 'bg-slate-900/80 border-slate-700/50' : 'bg-white/90 border-slate-300'}`}>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-bl-[100px] -z-10 group-hover:bg-cyan-500/20 transition-colors"></div>
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 md:p-4 bg-cyan-500/20 rounded-2xl"><Code2 className="text-cyan-500" size={28} /></div>
                            <div>
                                <h3 className={`text-lg md:text-xl font-black tracking-widest ${isDark ? 'text-white' : 'text-slate-900'}`}>SOFTWARE & AUTONOMY</h3>
                                <span className="text-cyan-500 font-mono text-[10px] md:text-xs">ROS 2 FULL STACK</span>
                            </div>
                        </div>
                        <p className="text-slate-500 text-xs md:text-sm leading-relaxed mb-6">
                            The complete software stack—from the low-level embedded C++ on the Pico, to the ROS 2 Nav2 and SLAM Python nodes, up to the high-performance React user interface—was developed by Humynex Robotics. This company also served as the primary project guide and technical mentor.
                        </p>

                        <div className={`mt-auto border p-5 md:p-6 rounded-2xl relative z-10 ${isDark ? 'bg-black/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                            <h4 className={`font-black tracking-widest mb-4 flex items-center gap-2 text-xs md:text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                CONTACT HUMYNEX <ExternalLink size={14} className="text-slate-400" />
                            </h4>
                            <p className="text-slate-500 text-[10px] md:text-xs mb-4">Available for enterprise AI and custom robotics solutions.</p>
                            <div className="flex flex-col gap-4 font-mono text-[10px] md:text-xs">
                                <a href="mailto:humynexrobotics@gmail.com" className="flex items-center gap-3 text-cyan-500 hover:text-cyan-400 transition-colors"><Mail size={16} /> humynexrobotics@gmail.com</a>
                                <a href="tel:+918714358646" className="flex items-center gap-3 text-emerald-500 hover:text-emerald-400 transition-colors"><Phone size={16} /> +91 8714358646</a>
                                <a href="https://instagram.com/humynex_robotics" target="_blank" rel="noreferrer" className="flex items-center gap-3 text-pink-500 hover:text-pink-400 transition-colors"><Instagram size={16} /> @humynex_robotics</a>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}