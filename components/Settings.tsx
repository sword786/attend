import React, { useState, useRef, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { Trash2, Plus, FileText, Sparkles, Loader2, FileUp, Check, X, Upload, AlertCircle, ArrowRight, Pencil, Clock } from 'lucide-react';
import { EntityProfile, TimeSlot } from '../types';

type SettingsTab = 'general' | 'timetable' | 'teachers' | 'classes' | 'students' | 'import';

export const Settings: React.FC = () => {
  const { 
    schoolName, updateSchoolName, 
    academicYear, updateAcademicYear,
    entities, addEntity, deleteEntity, updateEntity,
    students, addStudent, deleteStudent,
    timeSlots, updateTimeSlots,
    resetData,
    aiImportStatus, aiImportResult, startAiImport, cancelAiImport, finalizeAiImport
  } = useData();

  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [bulkStudentInput, setBulkStudentInput] = useState('');
  const [targetClassId, setTargetClassId] = useState('');
  const [aiTimetableInput, setAiTimetableInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Resolution State
  const [mappings, setMappings] = useState<Record<string, string>>({});

  // State for inline entity adding
  const [isAddingEntity, setIsAddingEntity] = useState<'TEACHER' | 'CLASS' | null>(null);
  const [newEntityName, setNewEntityName] = useState('');
  const [newEntityCode, setNewEntityCode] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // State for Editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');

  // Time Slot Editing
  const [localTimeSlots, setLocalTimeSlots] = useState<TimeSlot[]>([]);
  const [isEditingSlots, setIsEditingSlots] = useState(false);
  
  const classes = useMemo(() => entities.filter(e => e.type === 'CLASS'), [entities]);

  const handleAddEntity = (type: 'TEACHER' | 'CLASS') => {
    if (!newEntityName.trim()) return;
    let finalCode = newEntityCode.trim();
    if (!finalCode) {
        finalCode = newEntityName.trim().substring(0, 3).toUpperCase();
        if (finalCode.length < 2) finalCode = newEntityName.toUpperCase() + Math.floor(Math.random() * 10);
    }
    addEntity({
      id: `${type.toLowerCase()}-${Date.now()}`,
      name: newEntityName.trim(),
      shortCode: finalCode,
      type,
      schedule: {} as any
    });
    setNewEntityName('');
    setNewEntityCode('');
    setIsAddingEntity(null);
  };

  const startEditing = (entity: EntityProfile) => {
    setEditingId(entity.id);
    setEditName(entity.name);
    setEditCode(entity.shortCode || '');
    setConfirmDeleteId(null);
  };

  const saveEdit = () => {
    if (editingId && editName.trim()) {
        updateEntity(editingId, { 
            name: editName.trim(), 
            shortCode: editCode.trim().toUpperCase() 
        });
        setEditingId(null);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleBulkStudentImport = () => {
    if (!targetClassId) return;
    const lines = bulkStudentInput.split('\n');
    let count = 0;
    const now = Date.now();
    lines.forEach((line, index) => {
      const parts = line.split(',').map(p => p.trim());
      if (parts.length >= 2) {
        addStudent({
          id: `stu-${now}-${index}`,
          rollNumber: parts[0],
          name: parts[1],
          classId: targetClassId
        });
        count++;
      }
    });
    setBulkStudentInput('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        await startAiImport(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleTextImport = async () => {
      if (aiTimetableInput.trim()) {
          await startAiImport(undefined, aiTimetableInput);
      }
  };

  const handleMappingChange = (code: string, value: string) => {
      setMappings(prev => ({ ...prev, [code]: value }));
  };

  const onFinalize = () => {
      finalizeAiImport(mappings);
      setMappings({});
      setAiTimetableInput('');
  };

  // Time Slot Handlers
  const startEditingSlots = () => {
    setLocalTimeSlots(JSON.parse(JSON.stringify(timeSlots)));
    setIsEditingSlots(true);
  };

  const updateLocalSlot = (index: number, val: string) => {
    const updated = [...localTimeSlots];
    updated[index].timeRange = val;
    setLocalTimeSlots(updated);
  };

  const addLocalSlot = () => {
      setLocalTimeSlots([...localTimeSlots, {
          period: localTimeSlots.length + 1,
          timeRange: '00:00 - 00:00'
      }]);
  };

  const removeLocalSlot = () => {
      if (localTimeSlots.length > 1) {
          setLocalTimeSlots(localTimeSlots.slice(0, -1));
      }
  };

  const saveSlots = () => {
      updateTimeSlots(localTimeSlots);
      setIsEditingSlots(false);
  };

  const renderEntityList = (type: 'TEACHER' | 'CLASS') => {
    const items = entities.filter(e => e.type === type);
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
          <h3 className="font-bold text-gray-800">{type === 'CLASS' ? 'Classes' : 'Teachers'} List</h3>
          {isAddingEntity !== type ? (
            <button 
              onClick={() => {
                setIsAddingEntity(type);
                setNewEntityName('');
                setNewEntityCode('');
                setConfirmDeleteId(null);
                setEditingId(null);
              }} 
              className="px-3 py-1.5 bg-accent text-white rounded-lg text-sm font-bold flex items-center hover:bg-blue-600 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4 mr-1" /> Add {type === 'CLASS' ? 'Class' : 'Teacher'}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                type="text"
                placeholder={`Name...`}
                value={newEntityName}
                onChange={(e) => setNewEntityName(e.target.value)}
                className="px-3 py-1.5 border border-accent rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-accent/20 w-32 sm:w-48"
              />
               <input
                type="text"
                placeholder="Code"
                value={newEntityCode}
                onChange={(e) => setNewEntityCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddEntity(type)}
                className="px-3 py-1.5 border border-accent rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-accent/20 w-24"
              />
              <button onClick={() => handleAddEntity(type)} className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={() => setIsAddingEntity(null)} className="p-1.5 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
        <div className="divide-y">
          {items.map(item => (
            <div key={item.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors h-[72px]">
              
              {editingId === item.id ? (
                  <div className="flex items-center gap-3 flex-1 animate-in fade-in duration-200">
                      <input 
                        value={editName} 
                        onChange={e => setEditName(e.target.value)}
                        className="flex-1 px-3 py-2 border border-blue-300 rounded-lg text-sm font-medium text-gray-900 bg-white focus:ring-2 focus:ring-blue-100 outline-none"
                        placeholder="Name"
                        autoFocus
                      />
                      <input 
                        value={editCode} 
                        onChange={e => setEditCode(e.target.value)}
                        className="w-24 px-3 py-2 border border-blue-300 rounded-lg text-sm font-bold uppercase text-gray-900 bg-white focus:ring-2 focus:ring-blue-100 outline-none text-center"
                        placeholder="Code"
                      />
                      <div className="flex gap-1">
                          <button onClick={saveEdit} className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 shadow-sm"><Check className="w-4 h-4" /></button>
                          <button onClick={cancelEdit} className="p-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300"><X className="w-4 h-4" /></button>
                      </div>
                  </div>
              ) : (
                  <>
                    <div className="flex items-center gap-4 flex-1">
                        <span className="font-medium text-gray-700 min-w-[150px] truncate">{item.name}</span>
                        <div className="hidden sm:flex items-center gap-2 bg-gray-50 rounded px-2 py-1 border border-gray-100">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Code:</span>
                            <span className="text-sm font-black text-accent w-12 text-center">{item.shortCode || '-'}</span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                        {confirmDeleteId === item.id ? (
                            <div className="flex items-center gap-2 animate-in slide-in-from-right-2 duration-200 bg-red-50 p-1 rounded-lg">
                            <span className="text-[10px] font-bold text-red-500 uppercase ml-1">Sure?</span>
                            <button 
                                onClick={() => {
                                deleteEntity(item.id);
                                setConfirmDeleteId(null);
                                }}
                                className="p-1.5 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors shadow-sm"
                            >
                                <Check className="w-3 h-3" />
                            </button>
                            <button 
                                onClick={() => setConfirmDeleteId(null)}
                                className="p-1.5 bg-white text-gray-600 rounded-md hover:bg-gray-100 border border-gray-200 transition-colors"
                            >
                                <X className="w-3 h-3" />
                            </button>
                            </div>
                        ) : (
                            <>
                                <button 
                                onClick={() => startEditing(item)} 
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                title="Edit"
                                >
                                <Pencil className="w-4 h-4" />
                                </button>
                                <button 
                                onClick={() => setConfirmDeleteId(item.id)} 
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                title="Delete"
                                >
                                <Trash2 className="w-4 h-4" />
                                </button>
                            </>
                        )}
                    </div>
                  </>
              )}
            </div>
          ))}
          {items.length === 0 && <div className="p-8 text-center text-gray-400 text-sm">No {type === 'CLASS' ? 'classes' : 'teachers'} found.</div>}
        </div>
      </div>
    );
  };

  if (aiImportStatus === 'REVIEW' && aiImportResult) {
      const isTeacherWise = aiImportResult.detectedType === 'TEACHER_WISE';
      return (
        <div className="max-w-4xl mx-auto pb-10">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
                <div className="bg-indigo-600 p-6 text-white flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold flex items-center">
                            <Sparkles className="w-5 h-5 mr-2" /> AI Extraction Review
                        </h2>
                        <p className="text-indigo-100 text-sm mt-1">
                            Detected <b>{isTeacherWise ? 'Teacher-wise' : 'Class-wise'}</b> timetable. 
                            Found <b>{aiImportResult.profiles.length}</b> {isTeacherWise ? 'teachers' : 'classes'}.
                        </p>
                    </div>
                    <div className="px-4 py-2 bg-white/20 rounded-lg text-xs font-bold uppercase backdrop-blur-sm">
                        Live Preview
                    </div>
                </div>

                <div className="p-8 space-y-8">
                    <div>
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">
                            1. Extracted {isTeacherWise ? 'Teachers' : 'Classes'}
                        </h3>
                        <div className="flex gap-2 flex-wrap">
                            {aiImportResult.profiles.map((p, idx) => (
                                <span key={idx} className="px-3 py-1.5 bg-gray-100 rounded-lg text-sm font-medium text-gray-700 border border-gray-200">
                                    {p.name} <span className="text-gray-400 text-xs ml-1">({Object.keys(p.schedule).length} days)</span>
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100">
                        <h3 className="text-sm font-bold text-indigo-800 uppercase tracking-widest mb-2">
                            2. Resolve {isTeacherWise ? 'Class' : 'Teacher'} Codes
                        </h3>
                        <p className="text-sm text-gray-600 mb-6">
                            The AI found these codes inside the schedule slots. Please map them to real 
                            <b>{isTeacherWise ? ' Class Names' : ' Teacher Names'}</b> to create the interconnections.
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {aiImportResult.unknownCodes.map(code => (
                                <div key={code} className="flex items-center gap-3 bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                                    <div className="w-12 h-10 bg-gray-100 rounded flex items-center justify-center font-black text-gray-500 shrink-0">
                                        {code}
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-gray-300" />
                                    <input 
                                        type="text"
                                        placeholder={isTeacherWise ? "Enter Class Name..." : "Enter Teacher Name..."}
                                        value={mappings[code] || ''}
                                        onChange={(e) => handleMappingChange(code, e.target.value)}
                                        className="flex-1 p-2 border-b-2 border-indigo-100 focus:border-indigo-500 outline-none text-sm font-bold text-gray-800 bg-transparent transition-colors"
                                    />
                                </div>
                            ))}
                            {aiImportResult.unknownCodes.length === 0 && (
                                <div className="col-span-2 text-center text-gray-400 italic">
                                    No unknown codes found to resolve.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button 
                            onClick={cancelAiImport}
                            className="px-6 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-colors"
                        >
                            Cancel Import
                        </button>
                        <button 
                            onClick={onFinalize}
                            className="px-8 py-3 bg-indigo-600 text-white font-black rounded-xl shadow-lg hover:bg-indigo-700 transition-all flex items-center"
                        >
                            <Check className="w-5 h-5 mr-2" /> 
                            SAVE & CONNECT DATA
                        </button>
                    </div>
                </div>
            </div>
        </div>
      );
  }

  return (
    <div className="max-w-5xl mx-auto pb-10">
      <div className="flex gap-1 mb-6 bg-white p-1 rounded-xl border w-fit overflow-x-auto shadow-sm">
        {(['general', 'timetable', 'teachers', 'classes', 'students', 'import'] as const).map(tab => (
          <button 
            key={tab} 
            onClick={() => {
                setActiveTab(tab);
                setConfirmDeleteId(null);
                setEditingId(null);
                setIsEditingSlots(false);
            }} 
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === tab ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {activeTab === 'general' && (
        <div className="bg-white p-6 rounded-xl border shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">School Name</label>
              <input 
                type="text" 
                value={schoolName} 
                onChange={e => updateSchoolName(e.target.value)} 
                className="w-full p-2.5 border border-gray-200 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-accent outline-none font-medium" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Academic Year</label>
              <input 
                type="text" 
                value={academicYear} 
                onChange={e => updateAcademicYear(e.target.value)} 
                className="w-full p-2.5 border border-gray-200 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-accent outline-none font-medium" 
              />
            </div>
          </div>
          <div className="pt-4 border-t">
            {confirmDeleteId === 'FULL_RESET' ? (
                <div className="flex items-center gap-4 bg-red-50 p-4 rounded-xl border border-red-100">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span className="text-sm font-bold text-red-700">Wipe all app data?</span>
                    <div className="flex gap-2">
                        <button onClick={() => { resetData(); setConfirmDeleteId(null); }} className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-black">RESET EVERYTHING</button>
                        <button onClick={() => setConfirmDeleteId(null)} className="px-4 py-2 bg-white text-gray-600 border border-gray-200 rounded-lg text-xs font-bold">CANCEL</button>
                    </div>
                </div>
            ) : (
                <button 
                  onClick={() => setConfirmDeleteId('FULL_RESET')} 
                  className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-bold flex items-center hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Full System Reset
                </button>
            )}
          </div>
        </div>
      )}

      {activeTab === 'timetable' && (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
             <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
                 <div>
                    <h3 className="font-bold text-gray-800 flex items-center">
                        <Clock className="w-5 h-5 mr-2 text-accent" /> Timetable Configuration
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">Configure periods and time durations.</p>
                 </div>
                 {!isEditingSlots ? (
                    <button 
                        onClick={startEditingSlots}
                        className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-100 transition-colors"
                    >
                        Customize Periods
                    </button>
                 ) : (
                    <div className="flex gap-2">
                         <button onClick={() => setIsEditingSlots(false)} className="px-4 py-2 text-gray-500 font-bold hover:bg-gray-100 rounded-lg">Cancel</button>
                         <button onClick={saveSlots} className="px-4 py-2 bg-green-600 text-white font-bold rounded-lg shadow-sm hover:bg-green-700">Save Changes</button>
                    </div>
                 )}
             </div>
             
             <div className="p-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     {(isEditingSlots ? localTimeSlots : timeSlots).map((slot, index) => (
                         <div key={index} className="flex flex-col bg-gray-50 p-4 rounded-xl border border-gray-200">
                             <div className="flex justify-between items-center mb-2">
                                 <span className="text-xs font-black text-gray-400 uppercase">Period {slot.period}</span>
                             </div>
                             {isEditingSlots ? (
                                 <input 
                                    type="text" 
                                    value={slot.timeRange}
                                    onChange={(e) => updateLocalSlot(index, e.target.value)}
                                    className="w-full p-2 bg-white border border-gray-300 rounded-lg text-sm font-bold text-gray-900 focus:ring-2 focus:ring-accent outline-none"
                                 />
                             ) : (
                                 <span className="text-lg font-bold text-gray-800">{slot.timeRange}</span>
                             )}
                         </div>
                     ))}
                     
                     {isEditingSlots && (
                        <div className="flex flex-col gap-2">
                             <button 
                                onClick={addLocalSlot}
                                className="h-full min-h-[80px] border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center text-gray-400 font-bold hover:border-accent hover:text-accent hover:bg-blue-50 transition-all"
                             >
                                 <Plus className="w-5 h-5 mr-2" /> Add Period
                             </button>
                             {localTimeSlots.length > 0 && (
                                <button 
                                    onClick={removeLocalSlot}
                                    className="p-2 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg text-xs font-bold border border-red-100"
                                >
                                    Remove Last Period
                                </button>
                             )}
                        </div>
                     )}
                 </div>
             </div>
        </div>
      )}

      {activeTab === 'teachers' && renderEntityList('TEACHER')}
      {activeTab === 'classes' && renderEntityList('CLASS')}

      {activeTab === 'students' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h3 className="font-bold mb-4 flex items-center text-gray-800"><FileText className="w-5 h-5 mr-2 text-accent" /> Bulk Student Register</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Target Class</label>
                <select 
                  value={targetClassId} 
                  onChange={e => setTargetClassId(e.target.value)}
                  className="w-full p-2.5 border rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-accent outline-none"
                >
                  <option value="">-- Select Class --</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <textarea 
              value={bulkStudentInput}
              onChange={e => setBulkStudentInput(e.target.value)}
              placeholder="1001, John Doe&#10;1002, Jane Smith"
              className="w-full h-32 p-3 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white font-mono mb-4 focus:ring-2 focus:ring-accent outline-none"
            />
            <button 
              onClick={handleBulkStudentImport} 
              disabled={!bulkStudentInput.trim() || !targetClassId} 
              className="px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-black shadow-lg hover:bg-slate-800 disabled:opacity-50 transition-all active:scale-95"
            >
              Import to Register
            </button>
          </div>

          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
              <h3 className="font-bold text-gray-800">Student Database ({students.length})</h3>
            </div>
            <div className="divide-y max-h-[400px] overflow-y-auto">
              {students.map(s => (
                <div key={s.id} className="p-3 flex justify-between items-center text-sm hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-900">{s.name}</span>
                    <div className="flex gap-2 text-[10px] text-gray-500 uppercase font-bold">
                      <span className="text-accent">Roll: {s.rollNumber}</span>
                      <span>•</span>
                      <span>Class: {entities.find(e => e.id === s.classId)?.name || 'Unknown'}</span>
                    </div>
                  </div>
                  
                  {confirmDeleteId === s.id ? (
                      <div className="flex items-center gap-2 animate-in slide-in-from-right-2">
                        <button onClick={() => { deleteStudent(s.id); setConfirmDeleteId(null); }} className="p-1.5 bg-red-500 text-white rounded-lg"><Check className="w-4 h-4" /></button>
                        <button onClick={() => setConfirmDeleteId(null)} className="p-1.5 bg-gray-200 text-gray-600 rounded-lg"><X className="w-4 h-4" /></button>
                      </div>
                  ) : (
                      <button 
                        onClick={() => setConfirmDeleteId(s.id)} 
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                      >
                        <Trash2 className="w-4 h-4"/>
                      </button>
                  )}
                </div>
              ))}
              {students.length === 0 && <div className="p-10 text-center text-gray-400">Registry is empty.</div>}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'import' && (
        <div className="bg-white p-8 rounded-xl border shadow-sm space-y-8 relative overflow-hidden">
          {aiImportStatus === 'PROCESSING' && (
              <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-10 flex flex-col items-center justify-center animate-in fade-in">
                  <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
                  <h3 className="text-xl font-black text-indigo-900">AI is Analyzing Timetable...</h3>
                  <p className="text-gray-500 mt-2">You can switch tabs, this will run in background.</p>
              </div>
          )}

          <div className="text-center max-w-2xl mx-auto">
            <h3 className="text-xl font-bold mb-2 flex items-center justify-center text-indigo-600">
              <Sparkles className="w-6 h-6 mr-2" /> AI Timetable Extraction
            </h3>
            <p className="text-sm text-gray-600">
              Upload your official school timetable (PDF/Image) or paste text. 
              Gemini AI will extract schedules automatically.
            </p>
          </div>

          <div className="flex flex-col items-center justify-center border-2 border-dashed border-indigo-200 rounded-2xl p-10 bg-indigo-50/30 transition-all hover:border-indigo-400 hover:bg-indigo-50 group">
            <div className="w-16 h-16 bg-white rounded-full shadow-md flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <FileUp className="w-8 h-8 text-indigo-600" />
            </div>
            <h4 className="font-bold text-gray-800 mb-1 text-sm">Upload Timetable Document</h4>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf,image/*" className="hidden" />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={aiImportStatus === 'PROCESSING'}
              className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black shadow-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center transition-all"
            >
              <Upload className="w-5 h-5 mr-2" />
              SELECT DOCUMENT
            </button>
          </div>

          <div className="flex items-center gap-4 py-4">
            <div className="flex-1 h-px bg-gray-200"></div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">OR PASTE TEXT</span>
            <div className="flex-1 h-px bg-gray-200"></div>
          </div>

          <div className="space-y-4">
            <textarea 
              value={aiTimetableInput}
              onChange={e => setAiTimetableInput(e.target.value)}
              placeholder="Paste extracted text here..."
              className="w-full h-40 p-4 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
            <button 
              onClick={handleTextImport} 
              disabled={aiImportStatus === 'PROCESSING' || !aiTimetableInput.trim()}
              className="w-full py-3 bg-white border-2 border-indigo-600 text-indigo-600 rounded-xl text-sm font-black flex items-center justify-center hover:bg-indigo-50 disabled:opacity-50 transition-all"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              PROCESS TEXT CONTENT
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
