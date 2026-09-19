import { Button } from '@mui/material'
import { isRouteErrorResponse, useRouteError } from 'react-router-dom'
import { Page } from '../shared/components/Page'
import { ErrorState } from '../shared/components/StateViews'

export function RouteErrorPage() {
  const routeError = useRouteError()
  const message = isRouteErrorResponse(routeError)
    ? `The page could not be loaded (${routeError.status}).`
    : 'The page could not be loaded.'

  return (
    <Page title="Application error">
      <ErrorState message={message} />
      <Button onClick={() => window.location.assign('/')} sx={{ alignSelf: 'flex-start' }}>
        Return home
      </Button>
    </Page>
  )
}
