import { Routes, Route, Navigate } from 'react-router-dom';
import Landing from '../pages/Landing.jsx';
import NotFound from '../pages/NotFound.jsx';
import Unauthorized from '../pages/Unauthorized.jsx';

import StudentLogin from '../pages/auth/StudentLogin.jsx';
import StudentRegister from '../pages/auth/StudentRegister.jsx';
import FacultyLogin from '../pages/auth/FacultyLogin.jsx';
import AdminLogin from '../pages/auth/AdminLogin.jsx';

import DashboardLayout from '../layouts/DashboardLayout.jsx';

// Student pages
import StudentDashboard from '../pages/student/Dashboard.jsx';
import StudentSubjects from '../pages/student/Subjects.jsx';
import StudentMarks from '../pages/student/Marks.jsx';
import StudentAssignments from '../pages/student/Assignments.jsx';
import StudentNotes from '../pages/student/Notes.jsx';
import StudentMaterials from '../pages/student/Materials.jsx';
import StudentTimetable from '../pages/student/Timetable.jsx';
import StudentExams from '../pages/student/Exams.jsx';
import StudentNotifications from '../pages/student/Notifications.jsx';
import StudentProfile from '../pages/student/Profile.jsx';
import StudentContactAdmin from '../pages/student/ContactAdmin.jsx';

// Faculty pages
import FacultyDashboard from '../pages/faculty/Dashboard.jsx';
import FacultySubjects from '../pages/faculty/Subjects.jsx';
import FacultyMarks from '../pages/faculty/Marks.jsx';
 import FacultyMaterials from '../pages/faculty/Materials.jsx';
import FacultyTimetable from '../pages/faculty/Timetable.jsx';
import FacultyExams from '../pages/faculty/Exams.jsx';
import FacultyNotifications from '../pages/faculty/Notifications.jsx';

// Admin pages
import AdminDashboard from '../pages/admin/Dashboard.jsx';
import AdminStudents from '../pages/admin/Students.jsx';
import AdminFaculty from '../pages/admin/Faculty.jsx';
import AdminSubjects from '../pages/admin/Subjects.jsx';
 import AdminMaterials from '../pages/admin/Materials.jsx';
import AdminNotes from '../pages/admin/Notes.jsx';
import AdminMarks from '../pages/admin/Marks.jsx';
import AdminTimetable from '../pages/admin/Timetable.jsx';
import AdminExams from '../pages/admin/Exams.jsx';
import AdminNotifications from '../pages/admin/Notifications.jsx';
import AdminAuditLogs from '../pages/admin/AuditLogs.jsx';
import BulkStudents from '../pages/admin/BulkStudents.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import AdminMessages from '../pages/admin/Messages.jsx';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/auth/student/login" element={<StudentLogin />} />
      <Route path="/auth/student/register" element={<StudentRegister />} />
      <Route path="/auth/faculty/login" element={<FacultyLogin />} />
      <Route path="/auth/admin/login" element={<AdminLogin />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* STUDENT */}
      <Route
        path="/student"
        element={
          <ProtectedRoute roles={['STUDENT']}>
            <DashboardLayout role="STUDENT" />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<StudentDashboard />} />
        <Route path="subjects" element={<StudentSubjects />} />
        <Route path="marks" element={<StudentMarks />} />
        <Route path="assignments" element={<StudentAssignments />} />
       <Route path="materials" element={<StudentMaterials />} />
        <Route path="notes" element={<StudentNotes />} />
        <Route path="timetable" element={<StudentTimetable />} />
        <Route path="exams" element={<StudentExams />} />
        <Route path="notifications" element={<StudentNotifications />} />
        <Route path="contact-admin" element={<StudentContactAdmin />} /> 
        <Route path="profile" element={<StudentProfile />} />
      </Route>

      {/* FACULTY */}
      <Route
        path="/faculty"
        element={
          <ProtectedRoute roles={['FACULTY']}>
            <DashboardLayout role="FACULTY" />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<FacultyDashboard />} />
        <Route path="subjects" element={<FacultySubjects />} />
        <Route path="marks" element={<FacultyMarks />} />
       <Route path="materials" element={<FacultyMaterials />} />
        <Route path="timetable" element={<FacultyTimetable />} />
        <Route path="exams" element={<FacultyExams />} />
        <Route path="notifications" element={<FacultyNotifications />} />
      </Route>

      {/* ADMIN */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={['ADMIN']}>
            <DashboardLayout role="ADMIN" />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="students" element={<AdminStudents />} />
        <Route path="faculty" element={<AdminFaculty />} />
        <Route path="subjects" element={<AdminSubjects />} />
        <Route path="notes" element={<AdminNotes />} />
        <Route path="materials" element={<AdminMaterials />} />
        <Route path="marks" element={<AdminMarks />} />
        <Route path="timetable" element={<AdminTimetable />} />
        <Route path="bulk-students" element={<BulkStudents />} />
        <Route path="exams" element={<AdminExams />} />
        <Route path="messages" element={<AdminMessages />} /> 
        <Route path="notifications" element={<AdminNotifications />} />
        <Route path="audit-logs" element={<AdminAuditLogs />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}