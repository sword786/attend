import React from 'react';
import { DAYS } from '../constants';
import { useData } from '../contexts/DataContext';
import { EntityProfile, TimetableEntry } from '../types';
import { MapPin, Plus } from 'lucide-react';

interface TimetableGridProps {
  data: EntityProfile;
  onSlotClick: (day: string, period: number, entry: TimetableEntry | null) => void;
  isEditing?: boolean;
}

export const TimetableGrid: React.FC<TimetableGridProps> = ({ data, onSlotClick, isEditing = false }) => {
  const { timeSlots, entities } = useData();
  const isTeacher = data.type === 'TEACHER';

  // Find full name from code
  const resolveNameFromCode = (code: string | undefined): string | undefined => {
      if (!code) return undefined;
      const matched = entities.find(e => e.shortCode === code || e.name === code);
      return matched ? matched.name : code;
  };

  return (
    <div className="overflow-x-auto bg-white rounded-xl border border-gray-300 shadow-sm select-none">
      <div className="min-w-[1000px]">
        {/* Header Row */}
        <div className="grid grid-cols-[100px_repeat(9,1fr)] border-b-2 border-gray-300 bg-gray-50">
          <div className="p-4 flex items-center justify-center border-r-2 border-gray-300">
            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Day / Per</span>
          </div>
          {timeSlots.map((slot) => (
            <div key={slot.period} className="p-3 border-r border-gray-300 last:border-r-0 flex flex-col items-center justify-center text-center relative group">
              <span className="text-3xl font-black text-gray-800 leading-none mb-1">{slot.period}</span>
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">{slot.timeRange}</span>
            </div>
          ))}
        </div>

        {/* Data Rows */}
        {DAYS.map((day) => (
          <div key={day} className="grid grid-cols-[100px_repeat(9,1fr)] border-b border-gray-300 last:border-b-0 hover:bg-gray-50 transition-colors">
            {/* Day Column */}
            <div className="p-4 border-r-2 border-gray-300 bg-white flex items-center justify-center">
              <span className="text-2xl font-bold text-gray-700">{day}</span>
            </div>

            {/* Period Columns */}
            {timeSlots.map((slot) => {
              const entry = data.schedule && data.schedule[day] ? data.schedule[day][slot.period] : null;
              const isClickable = isEditing || entry;

              // Content Logic based on Entity Type (Teacher vs Class)
              
              // 1. Main Center Text
              // Teacher View -> Class Code (e.g. S1)
              // Class View -> Subject Code (e.g. ENG)
              const mainText = isTeacher 
                ? entry?.teacherOrClass 
                : entry?.subject;

              // 2. Secondary Text (Corner)
              // Teacher View -> Subject Code (e.g. ENG)
              // Class View -> Teacher Code (e.g. US)
              const subText = isTeacher 
                ? entry?.subject 
                : entry?.teacherOrClass;

              // 3. Room
              const room = entry?.room;
              
              // Tooltip logic: Resolve full name for the coded entity
              const tooltipName = resolveNameFromCode(entry?.teacherOrClass);
              const tooltipTitle = entry ? `${tooltipName || ''} - ${entry.subject}` : '';

              return (
                <div 
                  key={`${day}-${slot.period}`}
                  title={tooltipTitle}
                  className={`border-r border-gray-300 last:border-r-0 relative min-h-[100px] flex flex-col transition-all ${
                    isClickable 
                      ? 'cursor-pointer hover:bg-blue-50/50' 
                      : ''
                  } ${isEditing ? 'hover:ring-2 ring-inset ring-blue-300' : ''}`}
                  onClick={() => isClickable && onSlotClick(day, slot.period, entry || null)}
                >
                  {entry ? (
                    <div className="flex-1 w-full h-full p-2 flex flex-col relative">
                        
                        {/* Layout for TEACHER View (Subject Top-Left, Room Top-Right) */}
                        {isTeacher && (
                          <>
                            <div className="absolute top-1.5 left-2">
                               <span className="text-[11px] font-bold text-gray-500 uppercase tracking-tight">
                                 {subText || '-'}
                               </span>
                            </div>
                            {room && (
                                 <div className="absolute top-1.5 right-2 flex items-center text-[10px] text-gray-400 font-medium">
                                    <MapPin className="w-3 h-3 mr-0.5" />
                                    {room}
                                 </div>
                            )}
                          </>
                        )}

                        {/* Layout for CLASS View (Teacher Bottom-Right, Room Bottom-Left) */}
                        {!isTeacher && (
                          <>
                            <div className="absolute bottom-1 right-2">
                               <span className="text-[11px] font-bold text-gray-500 uppercase tracking-tight">
                                 {subText || '-'}
                               </span>
                            </div>
                            {room && (
                                <div className="absolute bottom-1 left-2 flex items-center text-[10px] text-gray-400 font-medium uppercase">
                                   {room}
                                </div>
                            )}
                          </>
                        )}

                        {/* Center Main Text (Shared) */}
                        <div className="flex-1 flex items-center justify-center text-center px-1 z-10">
                             <span className={`font-black text-gray-800 leading-tight ${
                                 (mainText?.length || 0) > 6 ? 'text-lg' : 'text-3xl'
                             }`}>
                                 {mainText || <span className="text-gray-300 text-lg">?</span>}
                             </span>
                        </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {isEditing && (
                          <div className="w-8 h-8 rounded-full bg-gray-50 border-2 border-dashed border-gray-300 flex items-center justify-center">
                              <Plus className="w-4 h-4 text-gray-400" />
                          </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};