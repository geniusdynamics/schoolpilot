// ABOUTME: Student exam profile card with photo, basic info, and action buttons
// ABOUTME: Displays student identity and exam performance summary

import React from 'react';
import { cn } from '@/utils/cn';
import { UserCircleIcon, UserIcon, EnvelopeIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

export interface StudentExamProfileProps {
  studentName: string;
  admissionNumber: string;
  stream: string;
  avatarUrl?: string;
  examName: string;
  meanMarks: number;
  totalPoints: number;
  maxPoints: number;
  overallPosition: number;
  totalStudents: number;
  streamPosition: number;
  streamTotal: number;
  meanGrade: string;
  kcpeScore?: number;
  onProfileClick?: () => void;
  onMessageClick?: () => void;
  onNotesClick?: () => void;
  className?: string;
}

const getGradeColor = (grade: string): string => {
  const firstChar = grade.charAt(0);
  switch (firstChar) {
    case 'A':
      return 'text-emerald-600';
    case 'B':
      return 'text-blue-600';
    case 'C':
      return 'text-amber-600';
    case 'D':
    case 'E':
      return 'text-rose-600';
    default:
      return 'text-gray-600';
  }
};

export const StudentExamProfile: React.FC<StudentExamProfileProps> = ({
  studentName,
  admissionNumber,
  stream,
  avatarUrl,
  meanMarks,
  totalPoints,
  maxPoints,
  overallPosition,
  totalStudents,
  streamPosition,
  streamTotal,
  meanGrade,
  kcpeScore,
  onProfileClick,
  onMessageClick,
  onNotesClick,
  className = '',
}) => {
  const gradeColor = getGradeColor(meanGrade);

  return (
    <div className={cn('bg-white rounded-xl border border-gray-200 p-6', className)}>
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Student Profile */}
        <div className="flex items-start gap-4 flex-1">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={studentName}
                className="h-20 w-20 rounded-full object-cover border-2 border-gray-200"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 border-2 border-gray-200">
                <UserCircleIcon className="h-12 w-12 text-gray-400" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-gray-900">{studentName}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {admissionNumber}, {stream}
            </p>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 mt-3">
              {onProfileClick && (
                <button
                  onClick={onProfileClick}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-600 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors"
                >
                  <UserIcon className="h-3.5 w-3.5" />
                  Profile
                </button>
              )}
              {onMessageClick && (
                <button
                  onClick={onMessageClick}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
                >
                  <EnvelopeIcon className="h-3.5 w-3.5" />
                  Message
                </button>
              )}
              {onNotesClick && (
                <button
                  onClick={onNotesClick}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
                >
                  <DocumentTextIcon className="h-3.5 w-3.5" />
                  Notes
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Middle: Exam Performance */}
        <div className="flex-1 grid grid-cols-2 gap-4">
          <div className="col-span-2 text-center pb-4 border-b border-gray-100">
            <p className="text-sm text-gray-500">Exam Performance</p>
          </div>

          {/* Mean Marks */}
          <div className="text-center">
            <p className="text-3xl font-bold text-emerald-600">{meanMarks}%</p>
            <p className="text-xs text-gray-500 mt-1">Mean Marks</p>
            <p className="text-xs text-emerald-600 font-medium mt-0.5">+2 ↗</p>
          </div>

          {/* Total Points */}
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-900">
              {totalPoints} <span className="text-lg text-gray-400">/ {maxPoints}</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">Total Points</p>
            <p className="text-xs text-emerald-600 font-medium mt-0.5">28 ↗</p>
          </div>

          {/* Overall Position */}
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-600">
              {overallPosition} <span className="text-lg text-gray-400">/ {totalStudents}</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">Overall Position</p>
            <p className="text-xs text-rose-600 font-medium mt-0.5">-10 ↘</p>
          </div>

          {/* Stream Position */}
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-600">
              {streamPosition} <span className="text-lg text-gray-400">/ {streamTotal}</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">Stream Position</p>
            <p className="text-xs text-rose-600 font-medium mt-0.5">-2 ↘</p>
          </div>
        </div>

        {/* Right: Grade & KCPE */}
        <div className="flex flex-col items-center justify-center gap-4 px-6 py-4 bg-gray-50 rounded-xl min-w-[140px]">
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Mean Grade</p>
            <p className={cn('text-4xl font-bold', gradeColor)}>{meanGrade}</p>
          </div>
          
          {kcpeScore && (
            <div className="text-center pt-4 border-t border-gray-200 w-full">
              <p className="text-xs text-gray-500 mb-1">KCPE</p>
              <p className="text-2xl font-bold text-gray-900">{kcpeScore}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentExamProfile;
