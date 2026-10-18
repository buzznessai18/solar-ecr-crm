import { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { useMe } from '@/lib/store'
import { isAdmin } from '@/lib/utils'
import SignIn from '@/pages/SignIn'
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Leads = lazy(() => import('@/pages/Leads'))
const LeadDetail = lazy(() => import('@/pages/LeadDetail'))
const Projects = lazy(() => import('@/pages/Projects'))
const ProjectDetail = lazy(() => import('@/pages/ProjectDetail'))
const Tasks = lazy(() => import('@/pages/Tasks'))
const Approvals = lazy(() => import('@/pages/Approvals'))
const Drive = lazy(() => import('@/pages/Drive'))
const Settings = lazy(() => import('@/pages/Settings'))
const Activity = lazy(() => import('@/pages/Activity'))
const NotFound = lazy(() => import('@/pages/NotFound'))

export default function App() {
  const me = useMe()
  if (!me) return <SignIn />
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="leads" element={<Leads />} />
        <Route path="leads/:id" element={<LeadDetail />} />
        <Route path="projects" element={<Projects />} />
        <Route path="projects/:id" element={<ProjectDetail />} />
        <Route path="projects/:id/:tab" element={<ProjectDetail />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="approvals" element={<Approvals />} />
        <Route path="drive" element={<Drive />} />
        <Route path="settings" element={<Settings />} />
        <Route path="settings/:tab" element={<Settings />} />
        <Route path="activity" element={isAdmin(me) ? <Activity /> : <Navigate to="/" replace />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
