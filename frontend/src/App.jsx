import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Collections from './pages/Collections';
import WasteHistory from './pages/WasteHistory';
import Payments from './pages/Payments';
import Settings from './pages/Settings';
import SensorData from './pages/SensorData';
import Navbar from './components/Navbar';
import './App.css';

function App() {
  // debug log: dump imported components to console to detect undefined values
  try {
    // eslint-disable-next-line no-console
    console.log('Imported components:', { Login, Signup, Dashboard, Collections, WasteHistory, Payments, Settings, Navbar, SensorData });
  } catch (e) {}
  // runtime diagnostics: check that imported route components are valid
  const importsToCheck = [
    { name: 'Login', comp: Login },
    { name: 'Signup', comp: Signup },
    { name: 'Dashboard', comp: Dashboard },
    { name: 'Collections', comp: Collections },
    { name: 'WasteHistory', comp: WasteHistory },
    { name: 'Payments', comp: Payments },
    { name: 'Settings', comp: Settings },
    { name: 'Navbar', comp: Navbar },
    { name: 'SensorData', comp: SensorData }
  ];
  const invalid = importsToCheck.filter(i => {
    // allow React components (function or object/class)
    return !(i.comp && (typeof i.comp === 'function' || typeof i.comp === 'object'));
  });
  if (invalid.length > 0) {
    return (
      <div style={{ padding: 24 }}>
        <h2 style={{ color: '#b91c1c' }}>Import diagnostic: invalid component(s)</h2>
        <p>The app detected one or more imported components are undefined or not valid React components.</p>
        <ul>
          {invalid.map(i => (
            <li key={i.name}><strong>{i.name}</strong> — value: {String(i.comp)}</li>
          ))}
        </ul>
        <p>Check your imports/exports for those modules. Open the browser console for more details.</p>
      </div>
    );
  }
  return (
    <Router>
      <Navbar/>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/collections" element={<Collections />} />
        <Route path="/waste-history" element={<WasteHistory />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/sensors" element={<SensorData />} />
      </Routes>
    </Router>
  );
}

export default App;
