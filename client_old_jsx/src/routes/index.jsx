import { createBrowserRouter } from 'react-router-dom'
import AppLayout from '../layouts/AppLayout.jsx'
import HomePage from '../pages/HomePage.jsx'
import LoginPage from '../pages/LoginPage.jsx'
import SurveysPage from '../pages/SurveysPage.jsx'
import NotFoundPage from '../pages/NotFoundPage.jsx'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'surveys',
        element: <SurveysPage />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
])


