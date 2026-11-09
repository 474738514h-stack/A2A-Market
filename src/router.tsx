import { createBrowserRouter } from 'react-router-dom'
import App from './App'
import BuyerWorkbench from './pages/BuyerWorkbench'
import DealFlow from './pages/DealFlow'
import EvalInfo from './pages/EvalInfo'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <BuyerWorkbench /> },
      { path: 'deal', element: <DealFlow /> },
      { path: 'eval', element: <EvalInfo /> },
      { path: '*', element: <BuyerWorkbench /> },
    ],
  },
])
