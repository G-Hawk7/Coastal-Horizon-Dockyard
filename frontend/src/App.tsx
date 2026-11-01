import { useEffect, useState, type FormEvent } from 'react';
import axios from 'axios';
import { fetchBerths, createBerth, deleteBerth, updateBerth, type Berth, type BerthCreate } from './api/berths';
import { Anchor, Plus, Trash2 } from 'lucide-react';

export default function App() {
  const [berths, setBerths] = useState<Berth[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // New Berth Form State
  const [formData, setFormData] = useState<BerthCreate>({
    berth_number: '',
    max_length_meters: 200,
    max_draft_meters: 12,
    status: 'AVAILABLE',
  });

  const loadBerths = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchBerths();
      setBerths(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to fetch berths');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBerths();
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await createBerth(formData);
      setFormData({
        berth_number: '',
        max_length_meters: 200,
        max_draft_meters: 12,
        status: 'AVAILABLE',
      });
      await loadBerths();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        alert(`Error creating berth: ${err.response?.data?.detail || err.message}`);
      } else if (err instanceof Error) {
        alert(`Error creating berth: ${err.message}`);
      }
    }
  };

  const handleToggleStatus = async (berth: Berth) => {
    const nextStatus: Berth['status'] =
      berth.status === 'AVAILABLE'
        ? 'OCCUPIED'
        : berth.status === 'OCCUPIED'
        ? 'UNDER_MAINTENANCE'
        : 'AVAILABLE';

    try {
      await updateBerth(berth.id, { status: nextStatus });
      await loadBerths();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(`Error updating status: ${err.message}`);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this berth?')) return;
    try {
      await deleteBerth(id);
      await loadBerths();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(`Error deleting berth: ${err.message}`);
      }
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '40px auto', fontFamily: 'system-ui, sans-serif', padding: '0 20px' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: '14px', borderBottom: '1px solid #334155', paddingBottom: '20px' }}>
        <Anchor size={40} color="#38bdf8" />
        <div>
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.02em' }}>Coastal Horizon Dockyard</h1>
          <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '14px', fontWeight: 500 }}>Berth Allocation & Operations Console</p>
        </div>
      </header>

      {/* Quick Add Section */}
      <section style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', margin: '24px 0', border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>Add New Berth</h3>
        <form onSubmit={handleCreate} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Berth No. (e.g. B-105)"
            value={formData.berth_number}
            onChange={(e) => setFormData({ ...formData, berth_number: e.target.value })}
            required
            style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
          />
          <input
            type="number"
            step="0.1"
            placeholder="Max Length (m)"
            value={formData.max_length_meters}
            onChange={(e) => setFormData({ ...formData, max_length_meters: parseFloat(e.target.value) || 0 })}
            required
            style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: 'ffffff', color: '#0f172a', width: '130px' }}
          />
          <input
            type="number"
            step="0.1"
            placeholder="Max Draft (m)"
            value={formData.max_draft_meters}
            onChange={(e) => setFormData({ ...formData, max_draft_meters: parseFloat(e.target.value) || 0 })}
            required
            style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: 'ffffff', color: '#0f172a', width: '130px' }}
          />
          <button
            type="submit"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#0284c7',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            <Plus size={16} /> Add Berth
          </button>
        </form>
      </section>

      {/* Grid Display */}
      {loading ? (
        <p>Loading dockyard records...</p>
      ) : error ? (
        <p style={{ color: 'red' }}>{error}</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {berths.map((berth) => (
            <div
              key={berth.id}
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '16px',
                backgroundColor: 'white',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>{berth.berth_number}</h3>
                <button
                  onClick={() => handleDelete(berth.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <div style={{ margin: '12px 0', fontSize: '14px', color: '#475569' }}>
                <p style={{ margin: '4px 0' }}>Max Length: <strong>{berth.max_length_meters} m</strong></p>
                <p style={{ margin: '4px 0' }}>Max Draft: <strong>{berth.max_draft_meters} m</strong></p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 'bold',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    backgroundColor:
                      berth.status === 'AVAILABLE' ? '#dcfce7' : berth.status === 'OCCUPIED' ? '#fee2e2' : '#fef3c7',
                    color:
                      berth.status === 'AVAILABLE' ? '#166534' : berth.status === 'OCCUPIED' ? '#991b1b' : '#92400e',
                  }}
                >
                  {berth.status}
                </span>

                <button
                  onClick={() => handleToggleStatus(berth)}
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #94a3b8',
                    backgroundColor: '#f1f5f9',
                    color: '#0f172a',
                    cursor: 'pointer',
                  }}
                >
                  Cycle Status
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}