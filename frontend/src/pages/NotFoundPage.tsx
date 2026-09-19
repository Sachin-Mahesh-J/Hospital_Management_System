import { Button } from '@mui/material'
import { Link } from 'react-router-dom'
import { Page } from '../shared/components/Page'
import { EmptyState } from '../shared/components/StateViews'

export function NotFoundPage() {
  return (
    <Page title="Page not found">
      <EmptyState
        action={
          <Button component={Link} to="/" variant="contained">
            Return home
          </Button>
        }
        description="The requested application page does not exist."
        title="Nothing to show here"
      />
    </Page>
  )
}
