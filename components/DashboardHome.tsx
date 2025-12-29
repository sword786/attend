import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { Clock, Calendar, MapPin, User, BookOpen, Coffee, ArrowRight, Activity, Sparkles } from 'lucide-react';
import { DayOfWeek } from '../types';

export const DashboardHome: React.FC = () => {
  const { entities, timeSlots } = useData();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const currentDayName = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[currentTime.getDay()];
  }, [currentTime]);

  const currentMinutes = useMemo(() => {
    return currentTime.getHours() * 60 + currentTime.getMinutes();
  }, [currentTime]);

  const parseTime = (timeStr: string) => {
    const [h, m] = timeStr.trim().split(':').map(Number);
    return h * 60 + m;
  };

  const currentPeriod = useMemo(() => {
    return timeSlots.find(slot => {
      const [start, end] = slot.timeRange.split('-').map(t => parseTime(t));
      return currentMinutes >= start && currentMinutes < end;
    });
  }, [currentMinutes, timeSlots]);

  const nextPeriod = useMemo(() => {
    const sortedSlots = [...timeSlots].sort((a, b) => {
        const startA = parseTime(a.timeRange.split('-')[0]);
        const startB = parseTime(b.timeRange.split('-')[0]);
        return startA - startB;
    });

    return sortedSlots.find(slot => {
        const start = parseTime(slot.timeRange.split('-')[0]);
        return start > currentMinutes;
    });
  }, [currentMinutes, timeSlots]);

  const classes = useMemo(() => entities.filter(e => e.type === 'CLASS'), [entities]);

  const getTeacherName = (code: string | undefined) => {
    if (!code) return 'Unassigned';
    const teacher = entities.find(e => e.type === 'TEACHER' && (e.shortCode === code || e.name === code));
    return teacher ? teacher.name : code;
  };

  const isSchoolDay = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu'].includes(currentDayName);

  return (
    <div className="flex flex-col h-full space-y-6 overflow-y-auto pb-10 scrollbar-hide">
      {/* Live Status Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl pointer-events-none"></div>

        <div className="flex items-center gap-6 z-10">
           <div className="p-4 rounded-2xl bg-white shadow-md border border-slate-100 text-blue-600">
              <Clock className="w-10 h-10" />
           </div>
           <div>
              <h2 className="text-4xl font-black text-slate-800 tracking-tight">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                 <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold text-xs uppercase tracking-wider">
                    {currentTime.toLocaleDateString([], { weekday: 'long' })}
                 </span>
                 <p className="text-slate-500 font-medium text-sm">
                    {currentTime.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
                 </p>
              </div>
           </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto z-10">
            {/* Current Session Box */}
            <div className={`flex-1 md:flex-none min-w-[200px] p-5 rounded-2xl border-2 transition-all bg-white shadow-sm ${
                currentPeriod 
                ? 'border-emerald-100' 
                : 'border-slate-100'
            }`}>
                <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${
                        currentPeriod ? 'text-emerald-500' : 'text-slate-400'
                    }`}>
                        Current
                    </span>
                    {currentPeriod && <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />}
                </div>
                {currentPeriod ? (
                    <>
                        <div className="text-2xl font-black text-slate-800">
                            Period {currentPeriod.period}
                        </div>
                        <div className="text-xs font-bold text-emerald-600 mt-1 flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {currentPeriod.timeRange}
                        </div>
                    </>
                ) : (
                    <div className="text-lg font-bold text-slate-400 flex items-center h-full">
                        {isSchoolDay ? 'Break / Off' : 'Weekend'}
                    </div>
                )}
            </div>

            {/* Next Session Box */}
            {nextPeriod && isSchoolDay && (
                <div className="flex-1 md:flex-none min-w-[200px] p-5 rounded-2xl border-2 border-indigo-50 bg-white shadow-sm group hover:border-indigo-100 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                            Up Next
                        </span>
                        <ArrowRight className="w-4 h-4 text-indigo-300 group-hover:translate-x-1 transition-transform" />
                    </div>
                    <div className="text-2xl font-black text-slate-800">
                        Period {nextPeriod.period}
                    </div>
                    <div className="text-xs font-bold text-indigo-500 mt-1 flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {nextPeriod.timeRange}
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* Live Grid */}
      <div>
        <div className="flex items-center mb-6">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg mr-3">
                <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">
                Live Class Activity
            </h3>
        </div>

        {currentPeriod && isSchoolDay ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {classes.map(cls => {
                    const daySchedule = cls.schedule[currentDayName as DayOfWeek];
                    const entry = daySchedule ? daySchedule[currentPeriod.period] : null;
                    const nextEntry = (nextPeriod && daySchedule) ? daySchedule[nextPeriod.period] : null;

                    return (
                        <div key={cls.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group overflow-hidden flex flex-col">
                            {/* Card Content */}
                            <div className="p-5 flex-1">
                                <div className="flex justify-between items-start mb-4">
                                    <h4 className="text-lg font-black text-slate-800">{cls.name}</h4>
                                    {entry?.room && (
                                        <span className="text-[10px] font-bold bg-slate-50 text-slate-600 px-2.5 py-1 rounded-full flex items-center border border-slate-100">
                                            <MapPin className="w-3 h-3 mr-1" /> {entry.room}
                                        </span>
                                    )}
                                </div>

                                {entry ? (
                                    <div className="space-y-4">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm shrink-0">
                                                {entry.subject.slice(0, 3)}
                                            </div>
                                            <div>
                                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Current Subject</div>
                                                <div className="font-bold text-slate-800 leading-tight text-sm">{entry.subject}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                             <div className="w-10 h-10 rounded-full bg-slate-50 text-slate-500 flex items-center justify-center shrink-0">
                                                <User className="w-5 h-5" />
                                             </div>
                                             <div>
                                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Teacher</div>
                                                <div className="font-bold text-slate-700 text-sm">{getTeacherName(entry.teacherOrClass)}</div>
                                             </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-6 text-slate-300 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                                        <Coffee className="w-6 h-6 mb-2 opacity-50" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">Free Period</span>
                                    </div>
                                )}
                            </div>

                            {/* Up Next Footer */}
                            {nextEntry ? (
                                <div className="bg-indigo-50/30 p-3 border-t border-indigo-50 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest bg-white px-1.5 py-0.5 rounded border border-indigo-100">
                                            NEXT
                                        </span>
                                        <span className="text-xs font-bold text-slate-700">{nextEntry.subject}</span>
                                    </div>
                                    <div className="flex items-center text-[10px] font-medium text-slate-500">
                                        {nextEntry.teacherOrClass && <span>{nextEntry.teacherOrClass}</span>}
                                        <ArrowRight className="w-3 h-3 ml-1 text-indigo-300" />
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-slate-50 p-3 border-t border-slate-100 flex items-center justify-center">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">End of Day</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        ) : (
            <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-16 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 shadow-sm">
                    <BookOpen className="w-10 h-10 text-slate-300" />
                </div>
                <h4 className="text-2xl font-bold text-slate-800 mb-2">No Active Classes</h4>
                <p className="text-slate-500 text-base max-w-md">
                    School is currently out of session or in between periods. Check the full timetable in the Classes tab.
                </p>
            </div>
        )}
      </div>
    </div>
  );
};