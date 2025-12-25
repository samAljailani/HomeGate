import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import '@/App.css'
import { Home } from './pages/Home';
import { Admin } from './pages/Admin';

function App() {
  //const [count, setCount] = useState(0)

  return (
    <BrowserRouter>
      <nav>
        <Link to="/">Home</Link> |{" "}
        <Link to="/admin">Admin</Link> |{" "}
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
