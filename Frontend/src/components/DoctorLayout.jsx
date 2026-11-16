import React from 'react';
import { LayoutDashboard, CalendarCheck, User, MessageCircle } from 'lucide-react';
import SoftShell from './SoftShell';

const NAV = [
  { path: '/Doctordashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/doctorviewapp', label: 'Appointments', icon: CalendarCheck },
  { path: '/doctorchat', label: 'Messages', icon: MessageCircle },
  { path: '/doctorprofile', label: 'Profile', icon: User },
];

const DoctorLayout = () => <SoftShell nav={NAV} cookieName="emstoken" badge="Doctor portal" />;

export default DoctorLayout;
