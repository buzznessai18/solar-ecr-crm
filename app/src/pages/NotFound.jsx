import { Lock, MapPinOff } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/ui'

export default function NotFound() {
  return (
    <div className="panel">
      <EmptyState icon={MapPinOff} title="This page or record does not exist" action={<Link to="/" className="btn btn-primary">Go to dashboard</Link>}>
        Check the ID in the address bar, or search for the client from the top bar.
      </EmptyState>
    </div>
  )
}

export function NoAccess({ what = 'record' }) {
  return (
    <div className="panel">
      <EmptyState icon={Lock} title={`You don’t have access to this ${what}`} action={<Link to="/" className="btn btn-primary">Go to dashboard</Link>}>
        It isn’t assigned to you. Ask an admin to assign it, or to add you to one of its tasks.
      </EmptyState>
    </div>
  )
}
