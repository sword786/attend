import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TimetableGrid } from './components/TimetableGrid';
import { AttendanceModal } from './components/AttendanceModal';
import { ScheduleEditorModal } from './components/ScheduleEditorModal';
import { Assistant } from './components/Assistant';
import { Settings } from './components/Settings';
import { AttendanceReport } from './components/AttendanceReport';
import { DashboardHome } from './components/DashboardHome';
import { PasswordModal } from './components/PasswordModal';
import { Menu, Search, Filter, Pencil, Eye } from 'lucide-react';
import { TimetableEntry } from './types';
import { DataProvider, useData } from './contexts/DataContext';

// Inner Component to use the Context
const DashboardLayout: React.FC = () => {
  const { entities, updateSchedule, academicYear } = useData();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  
  // Selection State
  const [selectedEntityId, setSelectedEntityId] = useState<string>('');

  // Auto-select first entity when switching to list views
  useEffect(() => {
    if ((activeTab === 'classes' || activeTab === 'teachers') && entities.length > 0) {
        const type = activeTab === 'classes' ? 'CLASS' : 'TEACHER';
        const filtered = entities.filter(e => e.type === type);
        
        // Only reset selection if current selection is invalid for the new tab
        const currentSelectionValid = filtered.find(e => e.id === selectedEntityId);
        
        if (!currentSelectionValid && filtered.length > 0) {
            setSelectedEntityId(filtered[0].id);
        }
    }
  }, [activeTab, entities, selectedEntityId]);

  // Modals State
  const [attendanceModal, setAttendanceModal] = useState<{
    isOpen: boolean;
    day: string;
    period: number;
    entry: TimetableEntry | null;
  }>({ isOpen: false, day: '', period: 0, entry: null });

  const [editorModal, setEditorModal] = useState<{
    isOpen: boolean;
    day: string;
    period: number;
    entry: TimetableEntry | null;
  }>({ isOpen: false, day: '', period: 0, entry: null });

  const handleEntitySelect = (id: string) => {
    setSelectedEntityId(id);
  };

  const handleSlotClick = (day: string, period: number, entry: TimetableEntry | null) => {
    if (isEditMode) {
        setEditorModal({ isOpen: true, day, period, entry });
    } else if (entry) {
        setAttendanceModal({ isOpen: true, day, period, entry });
    }
  };

  const handleScheduleSave = (entry: TimetableEntry | null) => {
    if (selectedEntityId) {
        updateSchedule(selectedEntityId, editorModal.day, editorModal.period, entry);
    }
  };

  const handleToggleEditMode = () => {
    if (isEditMode) {
      // Always allow turning OFF edit mode
      setIsEditMode(false);
    } else {
      // Require password to turn ON edit mode
      setIsPasswordOpen(true);
    }
  };

  const selectedEntity = entities.find(d => d.id === selectedEntityId);

  // Filter Data List based on active tab
  const listData = entities.filter(d => 
    (activeTab === 'classes' ? d.type === 'CLASS' : d.type === 'TEACHER') &&
    d.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPageTitle = () => {
      switch (activeTab) {
          case 'dashboard': return 'Live Dashboard';
          case 'assistant': return 'AI Assistant';
          case 'settings': return 'App Settings';
          case 'attendance': return 'Attendance Reports';
          case 'classes': return selectedEntity ? `${selectedEntity.name} Timetable` : 'Class Management';
          case 'teachers': return selectedEntity ? `${selectedEntity.name} Schedule` : 'Teacher Management';
          default: return 'Dashboard';
      }
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden text-gray-900">
      <PasswordModal 
        isOpen={isPasswordOpen} 
        onClose={() => setIsPasswordOpen(false)} 
        onSuccess={() => setIsEditMode(true)}
        title="Enable Editing"
      />

      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      <div className="flex-1 flex flex-col h-full w-full relative overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-8 z-10 shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMobileOpen(true)}
              className="p-2 -ml-2 text-gray-600 rounded-lg lg:hidden hover:bg-gray-100"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold text-gray-800 hidden sm:block">
              {getPageTitle()}
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="hidden md:flex items-center text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
                <span>Academic Year {academicYear}</span>
             </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-hidden p-4 lg:p-6">
          {activeTab === 'dashboard' ? (
              <DashboardHome />
          ) : activeTab === 'assistant' ? (
            <Assistant />
          ) : activeTab === 'settings' ? (
            <div className="h-full overflow-y-auto">
                <Settings />
            </div>
          ) : activeTab === 'attendance' ? (
             <AttendanceReport />
          ) : (
            <div className="flex flex-col h-full gap-6">
              
              {/* Controls & Filter Bar (Only for Classes/Teachers) */}
              <div className="flex flex-col sm:flex-row gap-4 justify-between shrink-0">
                <div className="flex gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg leading-5 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent sm:text-sm shadow-sm"
                        placeholder={`Search ${activeTab}...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    </div>
                </div>
                
                {/* Entity Selector (Horizontal Scroll) */}
                <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide max-w-full sm:max-w-xl">
                   {listData.length > 0 ? listData.map(item => (
                       <button
                         key={item.id}
                         onClick={() => handleEntitySelect(item.id)}
                         className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                             selectedEntityId === item.id 
                             ? 'bg-primary text-white shadow-lg shadow-blue-900/20' 
                             : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                         }`}
                       >
                           {item.name}
                       </button>
                   )) : (
                       <div className="text-sm text-gray-400 py-2 italic">No {activeTab} found. Check settings.</div>
                   )}
                </div>
              </div>

              {/* Timetable View */}
              {selectedEntity ? (
                  <div className="flex-1 flex flex-col rounded-xl border border-gray-200 shadow-sm bg-white overflow-hidden">
                      {/* Toolbar */}
                      <div className="p-3 bg-gray-50 border-b border-gray-100 flex justify-end">
                        <button 
                            onClick={handleToggleEditMode}
                            className={`flex items-center px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                                isEditMode 
                                ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' 
                                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            {isEditMode ? (
                                <>
                                    <Pencil className="w-3 h-3 mr-2" /> Editing Mode On
                                </>
                            ) : (
                                <>
                                    <Eye className="w-3 h-3 mr-2" /> View Mode
                                </>
                            )}
                        </button>
                      </div>
                      
                      <div className="flex-1 overflow-auto">
                        <TimetableGrid 
                            data={selectedEntity} 
                            onSlotClick={handleSlotClick} 
                            isEditing={isEditMode}
                        />
                      </div>
                  </div>
              ) : (
                  <div className="flex-1 flex items-center justify-center bg-white rounded-xl border border-dashed border-gray-300">
                      <div className="text-center text-gray-400">
                          <Filter className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>Select a {activeTab === 'teachers' ? 'teacher' : 'class'} to view schedule</p>
                      </div>
                  </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Attendance Modal */}
      {attendanceModal.isOpen && attendanceModal.entry && selectedEntity && (
        <AttendanceModal
          isOpen={attendanceModal.isOpen}
          onClose={() => setAttendanceModal({ ...attendanceModal, isOpen: false })}
          day={attendanceModal.day}
          period={attendanceModal.period}
          entry={attendanceModal.entry}
          entityId={selectedEntity.id}
          classNameOrTeacherName={selectedEntity.name}
        />
      )}

      {/* Editor Modal */}
      {editorModal.isOpen && selectedEntity && (
        <ScheduleEditorModal
          isOpen={editorModal.isOpen}
          onClose={() => setEditorModal({ ...editorModal, isOpen: false })}
          onSave={handleScheduleSave}
          day={editorModal.day}
          period={editorModal.period}
          currentEntry={editorModal.entry}
          entityName={selectedEntity.name}
          entityType={selectedEntity.type}
        />
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <DataProvider>
      <DashboardLayout />
    </DataProvider>
  );
};

export default App;
