import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './Context/AuthContext';
import { ToastProvider } from './Context/ToastContext';
import { AppRoutes } from './components/LayoutArea/AppRoutes';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
