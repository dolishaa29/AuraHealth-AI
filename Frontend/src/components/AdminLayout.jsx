import React from 'react';
import { LayoutDashboard, Stethoscope, Users, UserPlus, Calendar } from 'lucide-react';
import SoftShell from './SoftShell';

const NAV = [
  { path: '/Admindashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/Doctorrequest', label: 'Doctor requests', icon: UserPlus },
  { path: '/Viewdoctor', label: 'Doctors', icon: Stethoscope },
  { path: '/Viewusers', label: 'Patients', icon: Users },
  { path: '/ViewAppointment', label: 'Appointments', icon: Calendar },
];

const AdminLayout = () => <SoftShell nav={NAV} cookieName="emtoken" badge="Admin" />;

export default AdminLayout;
