/**
 * Faculty SGPA/CGPA page.
 * Shows activation controls only when Admin has granted canManageSgpa permission.
 * If not permitted, shows a clear info message.
 */
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ShieldOff, TrendingUp } from 'lucide-react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';

// Re-export the full admin component when we know permission is granted
import AdminSgpaCgpa from '../admin/SgpaCgpa.jsx';

export default function FacultySgpaCgpa() {
  const [permitted, setPermitted] = useState(null); // null=loading, true/false=resolved
  const [checkDone, setCheckDone] = useState(false);

  useEffect(() => {
    // Check permission by trying to load activations.
    // The backend returns 403 if faculty lacks canManageSgpa.
    api.get('/faculty/me')
      .then((r) => {
        const fac = r.data.data;
        setPermitted(!!fac.canManageSgpa);
      })
      .catch(() => setPermitted(false))
      .finally(() => setCheckDone(true));
  }, []);

  if (!checkDone) {
    return <Card><p className="text-sm text-slate-500 py-8 text-center">Loading…</p></Card>;
  }

  if (!permitted) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp size={22} className="text-brand-600" /> SGPA &amp; CGPA
          </h1>
        </div>
        <Card>
          <div className="flex items-start gap-4 py-4">
            <div className="p-3 bg-slate-100 rounded-xl shrink-0">
              <ShieldOff size={24} className="text-slate-400" />
            </div>
            <div>
              <p className="font-semibold text-slate-800">Access not granted</p>
              <p className="text-sm text-slate-500 mt-1">
                You do not have permission to manage SGPA &amp; CGPA activation.
                Please contact Admin to request access.
              </p>
              <p className="text-xs text-slate-400 mt-2">
                Admin Portal → Permissions → Your Name → SGPA & CGPA Management → ON
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Permission granted — show the full SGPA/CGPA management component
  return <AdminSgpaCgpa />;
}
