import { Navigate, Route, Routes } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ThemeProvider } from '@/components/theme'
import { LangProvider } from '@/lib/i18n'
import { LandingPage } from '@/pages/landing-page'
import { SeriesPage } from '@/pages/series-page'

export default function App() {
  return (
    <LangProvider>
      <ThemeProvider>
        <TooltipProvider delayDuration={150}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/:slug" element={<SeriesPage />} />
            <Route path="/:slug/:epId" element={<SeriesPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </TooltipProvider>
      </ThemeProvider>
    </LangProvider>
  )
}
