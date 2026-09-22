import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { store as agentStore } from '@/modules/data-analyst-agent/state/store'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={agentStore}>
      <App />
    </Provider>
  </StrictMode>,
)
