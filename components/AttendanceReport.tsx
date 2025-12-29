import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { CalendarDays, Filter, BarChart3, Clock, ArrowDown, ArrowUp, Download } from 'lucide-react';
import { AttendanceStatus } from '../types';

export const AttendanceReport: React.FC = () => {
  const { entities, students, timeSlots, attendanceRecords } = useData();
  
  const classes = entities.filter(e => e.type === 'CLASS');
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<'daily' | 'subject'>('daily');

  const selectedClass = entities.find(e => e.id === selectedClassId);
  const classStudents = useMemo(() => students.filter(s => s.classId === selectedClassId), [students, selectedClassId]);

  // Derived Unique Subjects List (Columns)
  const subjectsList = useMemo(() => {
     if (!selectedClass || !selectedClass.schedule) return [];
     const set = new Set<string>();
     Object.values(selectedClass.schedule).forEach(day => {
        if (!day) return;
        Object.values(day).forEach(slot => {
            if (slot?.subject) set.add(slot.subject.toUpperCase());
        });
     });
     return Array.from(set).sort();
  }, [selectedClass]);

  // Subject-wise calculation for each student
  const studentStats = useMemo(() => {
    if (!selectedClass) return [];
    
    return classStudents.map(student => {
        // Initialize stats container
        const stats: Record<string, { present: number; total: number }> = {};
        subjectsList.forEach(sub => stats[sub] = { present: 0, total: 0 });

        // Filter records for this student in this class
        const studentRecords = attendanceRecords.filter(
            r => r.entityId === selectedClassId && r.studentId === student.id
        );

        studentRecords.forEach(rec => {
            // Safe Date Parsing for Day of Week (Treat string as UTC date)
            const dateObj = new Date(rec.date);
            const dayIndex = dateObj.getUTCDay(); // 0-6 (Sun-Sat)
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const dayName = days[dayIndex];
            
            // Look up subject in schedule to attribute this record to a subject
            const daySchedule = selectedClass.schedule?.[dayName as any];
            
            if (daySchedule) {
                const entry = daySchedule[rec.period];
                if (entry && entry.subject) {
                    const subjectKey = entry.subject.toUpperCase();
                    
                    // Only count if this subject is in our known columns
                    if (stats[subjectKey]) {
                        stats[subjectKey].total++;
                        // Count Present, Late, Excused as "Attended" (or positive attendance)
                        if (['PRESENT', 'LATE', 'EXCUSED'].includes(rec.status)) {
                            stats[subjectKey].present++;
                        }
                    }
                }
            }
        });

        // Flatten to array based on subjectsList order
        const statsArray = subjectsList.map(sub => ({
            subject: sub,
            ...stats[sub]
        }));

        // Calculate Overall
        const overallTotal = statsArray.reduce((acc, curr) => acc + curr.total, 0);
        const overallPresent = statsArray.reduce((acc, curr) => acc + curr.present, 0);

        return { 
            student, 
            stats: statsArray,
            overall: { present: overallPresent, total: overallTotal }
        };
    });
  }, [selectedClass, attendanceRecords, classStudents, selectedClassId, subjectsList]);

  // Calculate Class Averages per subject
  const classAverages = useMemo(() => {
    if (studentStats.length === 0) return null;

    const averages = subjectsList.map(subject => {
        let totalPresent = 0;
        let totalSessions = 0;

        studentStats.forEach(stat => {
            const subStat = stat.stats.find(s => s.subject === subject);
            if (subStat) {
                totalPresent += subStat.present;
                totalSessions += subStat.total;
            }
        });

        return {
            subject,
            percentage: totalSessions > 0 ? Math.round((totalPresent / totalSessions) * 100) : 0,
            totalSessions // Total session slots across all students
        };
    });

    // Overall Class Average
    let grandTotalPresent = 0;
    let grandTotalSessions = 0;
    studentStats.forEach(stat => {
        grandTotalPresent += stat.overall.present;
        grandTotalSessions += stat.overall.total;
    });

    return {
        subjects: averages,
        overall: grandTotalSessions > 0 ? Math.round((grandTotalPresent / grandTotalSessions) * 100) : 0
    };
  }, [studentStats, subjectsList]);

  const handleExportCSV = () => {
    if (!selectedClass) return;

    let csvContent = "data:text/csv;charset=utf-8,";

    if (viewMode === 'daily') {
        // Daily Report CSV
        // Header: Student Name, Roll No, P1, P2...
        const header = ["Student Name", "Roll Number", ...timeSlots.map(s => `Period ${s.period}`)];
        csvContent += header.join(",") + "\n";

        classStudents.forEach(student => {
            const row = [
                `"${student.name}"`,
                student.rollNumber,
                ...timeSlots.map(slot => {
                    const rec = attendanceRecords.find(r => r.date === selectedDate && r.entityId === selectedClassId && r.studentId === student.id && r.period === slot.period);
                    return rec ? rec.status : 'N/A';
                })
            ];
            csvContent += row.join(",") + "\n";
        });
    } else {
        // Subject Report CSV
        // Header: Student Name, Roll No, Subject 1 %, ..., Overall %
        const header = ["Student Name", "Roll Number", ...subjectsList, "Overall %"];
        csvContent += header.join(",") + "\n";

        studentStats.forEach(({ student, stats, overall }) => {
            const row = [
                `"${student.name}"`,
                student.rollNumber,
                ...stats.map(s => s.total > 0 ? `${Math.round((s.present / s.total) * 100)}%` : '0%'),
                overall.total > 0 ? `${Math.round((overall.present / overall.total) * 100)}%` : '0%'
            ];
            csvContent += row.join(",") + "\n";
        });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${selectedClass.name}_Attendance_${viewMode}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full space-y-6 text-gray-900">
      <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-2 p-1 bg-gray-100 rounded-lg w-fit shrink-0 shadow-inner">
              <button onClick={() => setViewMode('daily')} className={`flex items-center px-4 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'daily' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`}>
                  <Clock className="w-4 h-4 mr-2" /> Daily Matrix
              </button>
              <button onClick={() => setViewMode('subject')} className={`flex items-center px-4 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'subject' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`}>
                  <BarChart3 className="w-4 h-4 mr-2" /> Subject Analytics
              </button>
          </div>
          
          <button 
            onClick={handleExportCSV}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-green-700 transition-colors"
          >
              <Download className="w-4 h-4 mr-2" /> Export CSV
          </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Target Class</label>
                  <select 
                      value={selectedClassId}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      className="w-full p-2 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-accent outline-none"
                  >
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      {classes.length === 0 && <option value="">No classes available</option>}
                  </select>
              </div>
              {viewMode === 'daily' && (
                  <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Register Date</label>
                      <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full p-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-accent outline-none" />
                  </div>
              )}
          </div>
      </div>

      <div className="flex-1 bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col">
          {viewMode === 'daily' ? (
              <div className="overflow-auto flex-1">
                  <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 text-[10px] text-gray-400 uppercase tracking-wider sticky top-0 z-10">
                          <tr>
                              <th className="p-4 border-b w-64">Student</th>
                              {timeSlots.map(s => <th key={s.period} className="p-2 border-b text-center min-w-[60px]">P{s.period}</th>)}
                          </tr>
                      </thead>
                      <tbody className="divide-y">
                          {classStudents.map(student => (
                              <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                                  <td className="p-4 font-bold text-gray-800">
                                      {student.name}
                                      <div className="text-[10px] text-gray-400 font-medium">Roll: {student.rollNumber}</div>
                                  </td>
                                  {timeSlots.map(slot => {
                                      const rec = attendanceRecords.find(r => r.date === selectedDate && r.entityId === selectedClassId && r.studentId === student.id && r.period === slot.period);
                                      return (
                                          <td key={slot.period} className="p-2 text-center">
                                              <span className={`inline-block w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black shadow-sm border transition-transform hover:scale-110 ${
                                                  rec?.status === 'PRESENT' ? 'bg-green-100 text-green-700 border-green-200' : 
                                                  rec?.status === 'ABSENT' ? 'bg-red-100 text-red-700 border-red-200' : 
                                                  rec?.status === 'LATE' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                                                  rec?.status === 'EXCUSED' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-300 border-transparent'
                                              }`}>
                                                  {rec?.status ? rec.status.substring(0,3) : '-'}
                                              </span>
                                          </td>
                                      );
                                  })}
                              </tr>
                          ))}
                          {classStudents.length === 0 && (
                              <tr><td colSpan={timeSlots.length + 1} className="p-10 text-center text-gray-400">No students registered in this class.</td></tr>
                          )}
                      </tbody>
                  </table>
              </div>
          ) : (
              <div className="overflow-auto flex-1">
                  <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 text-[10px] text-gray-400 uppercase tracking-wider sticky top-0 z-10">
                          <tr>
                              <th className="p-4 border-b w-64">Student</th>
                              {subjectsList.map((sub) => <th key={sub} className="p-4 border-b text-center min-w-[100px]">{sub}</th>)}
                              <th className="p-4 border-b text-right min-w-[100px] bg-gray-100/50">Overall %</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y">
                          {studentStats.map(({ student, stats, overall }) => {
                              return (
                                <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4 font-bold text-gray-800">
                                        {student.name}
                                        <div className="text-[10px] text-gray-400">Roll: {student.rollNumber}</div>
                                    </td>
                                    {stats.map((stat) => {
                                        const pct = stat.total > 0 ? Math.round((stat.present / stat.total) * 100) : null;
                                        return (
                                            <td key={stat.subject} className="p-4 text-center">
                                                {pct !== null ? (
                                                    <div className="flex flex-col items-center">
                                                        <span className={`text-sm font-bold ${pct < 75 ? 'text-red-600' : 'text-green-600'}`}>{pct}%</span>
                                                        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">{stat.present}/{stat.total} Attended</div>
                                                    </div>
                                                ) : <span className="text-gray-300">-</span>}
                                            </td>
                                        );
                                    })}
                                    <td className="p-4 text-right bg-gray-50/30">
                                        {overall.total > 0 ? (
                                            <div className="inline-flex flex-col items-end">
                                                <span className={`text-base font-black ${ (overall.present/overall.total)*100 < 75 ? 'text-red-600' : 'text-primary'}`}>
                                                    {Math.round((overall.present / overall.total) * 100)}%
                                                </span>
                                            </div>
                                        ) : '-'}
                                    </td>
                                </tr>
                              );
                          })}
                          
                          {/* Class Average Row */}
                          {classAverages && (
                              <tr className="bg-gray-100 border-t-2 border-gray-200">
                                  <td className="p-4 font-black text-gray-800 uppercase tracking-wider text-xs">Class Average</td>
                                  {classAverages.subjects.map(avg => (
                                      <td key={avg.subject} className="p-4 text-center">
                                          {avg.totalSessions > 0 ? (
                                            <span className={`text-sm font-black ${avg.percentage < 75 ? 'text-red-600' : 'text-green-700'}`}>
                                                {avg.percentage}%
                                            </span>
                                          ) : '-'}
                                      </td>
                                  ))}
                                  <td className="p-4 text-right">
                                      <span className={`text-lg font-black ${classAverages.overall < 75 ? 'text-red-600' : 'text-primary'}`}>
                                          {classAverages.overall}%
                                      </span>
                                  </td>
                              </tr>
                          )}

                          {studentStats.length === 0 && (
                              <tr><td colSpan={subjectsList.length + 2} className="p-10 text-center text-gray-400">No data available for subject analysis.</td></tr>
                          )}
                      </tbody>
                  </table>
              </div>
          )}
      </div>
    </div>
  );
};