import React, { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';

const ROAD_NAMES = [
  'Maple Street','Oak Avenue','Pine Road','River Drive','Hillcrest Blvd','Elm Lane','Cedar Way','Birch Street','Willow Ave','Sunset Road','Highland Street','Meadow Lane','Parkside Ave','Lakeshore Drive'
];

function randomWithin(prev, idx) {
  // produce a new value near prev but not equal across nodes
  const jitter = Math.max(1, Math.round(Math.random() * 8));
  const dir = (idx % 3) - 1; // -1,0,1 cycling by index
  let next = prev + dir * jitter + (Math.random() > 0.7 ? Math.round(Math.random()*5) : 0);
  if (next < 0) next = Math.abs(next);
  if (next > 100) next = 100 - (next % 10);
  return Math.round(next);
}

function SensorCard({ node }) {
  return (
    <div className="bg-white rounded-lg shadow p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-500">Node</div>
          <div className="text-lg font-semibold">{node.id} — {node.road}</div>
        </div>
        <div className="text-xs text-gray-400">Last update: {new Date(node.updatedAt).toLocaleTimeString()}</div>
      </div>

      <div className="grid grid-cols-1 gap-2">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">Bin level</div>
          <div className="font-medium">{node.bin}%</div>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded overflow-hidden">
          <div style={{ width: `${node.bin}%` }} className={`h-2 ${node.bin > 80 ? 'bg-red-500' : node.bin > 50 ? 'bg-yellow-400' : 'bg-green-500'}`}></div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">Moisture</div>
          <div className="font-medium">{node.moist}%</div>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded overflow-hidden">
          <div style={{ width: `${node.moist}%` }} className={`h-2 ${node.moist > 70 ? 'bg-yellow-500' : 'bg-green-400'}`}></div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">Smell</div>
          <div className="font-medium">{node.smell}%</div>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded overflow-hidden">
          <div style={{ width: `${node.smell}%` }} className={`h-2 ${node.smell > 70 ? 'bg-red-400' : 'bg-green-400'}`}></div>
        </div>
      </div>
    </div>
  );
}

export default function SensorData() {
  const [nodes, setNodes] = useState(() => {
    // initialize 14 nodes with staggered base values
    return Array.from({ length: 14 }).map((_, i) => ({
      id: `N-${String(i+1).padStart(2,'0')}`,
      road: ROAD_NAMES[i % ROAD_NAMES.length],
      bin: Math.max(2, Math.round(Math.random() * 20 + i * 2)),
      moist: Math.max(1, Math.round(Math.random() * 10 + i)),
      smell: Math.max(0, Math.round(Math.random() * 6 + i % 5)),
      updatedAt: Date.now()
    }));
  });

  const tickRef = useRef(null);
  const alertedRef = useRef(new Set());
  const THRESHOLD = 85; // bin % threshold to alert

  useEffect(() => {
    // every 10s increment values slightly but differently per node
    tickRef.current = setInterval(() => {
      setNodes(prev => prev.map((n, idx) => ({
        ...n,
        bin: randomWithin(n.bin + Math.round(Math.sin((Date.now()/10000) + idx) * 2), idx),
        moist: randomWithin(n.moist + Math.round(Math.cos((Date.now()/12000) + idx) * 1), idx + 1),
        smell: randomWithin(n.smell + Math.round(Math.sin((Date.now()/8000) + idx*0.3) * 1), idx + 2),
        updatedAt: Date.now()
      })));
    }, 10000);

    // watch for threshold crossing by checking nodes every tick as well
    const alertChecker = setInterval(() => {
      setNodes(prev => {
        prev.forEach(n => {
          if (n.bin >= THRESHOLD) {
            if (!alertedRef.current.has(n.id)) {
              alertedRef.current.add(n.id);
              toast.warning(`${n.id} (${n.road}) bin level high: ${n.bin}%`, { duration: 8000 });
            }
          } else {
            // clear flag if dropped below threshold so future alerts allowed
            if (alertedRef.current.has(n.id)) alertedRef.current.delete(n.id);
          }
        });
        return prev;
      });
    }, 10000);

    return () => { clearInterval(tickRef.current); clearInterval(alertChecker); };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">Sensor Nodes</h2>
          <div className="text-sm text-gray-500">Live demo — values update every 10s</div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {nodes.map(node => (
            <SensorCard key={node.id} node={node} />
          ))}
        </div>
      </div>
    </div>
  );
}
