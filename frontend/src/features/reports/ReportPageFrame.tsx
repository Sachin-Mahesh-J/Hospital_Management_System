import { Button } from '@mui/material'
import type { ReactNode } from 'react'
import { Page } from '../../shared/components/Page'
import { ReportPrintStyles } from './ReportPrintStyles'

type ReportPageFrameProps = {
  title: string
  description: string
  onRefresh: () => void
  extraActions?: ReactNode
  children: ReactNode
}

export function ReportPageFrame({
  title,
  description,
  onRefresh,
  extraActions,
  children,
}: ReportPageFrameProps) {
  return (
    <Page
      title={title}
      description={description}
      actions={
        <span className="no-print" style={{ display: 'flex', gap: 8 }}>
          {extraActions}
          <Button onClick={() => window.print()} variant="outlined">
            Print
          </Button>
          <Button onClick={onRefresh} variant="contained">
            Refresh
          </Button>
        </span>
      }
    >
      <ReportPrintStyles />
      {children}
    </Page>
  )
}
