import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '@features/auth/pages/LoginPage/LoginPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
