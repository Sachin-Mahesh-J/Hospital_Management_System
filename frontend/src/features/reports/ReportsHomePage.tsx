import {
  Card,
  CardActionArea,
  CardContent,
  Stack,
  Typography,
} from '@mui/material'
import { Link } from 'react-router-dom'
import { Can } from '../../auth/Can'
import { Page } from '../../shared/components/Page'
import { reportLinks } from './permissions'

export function ReportsHomePage() {
  return (
    <Page
      title="Reports"
      description="Reports based on existing hospital records. Print is available on each report."
    >
      <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: 'wrap' }}>
        {reportLinks.map((report) => (
          <Can key={report.path} permission={report.permission}>
            <Card sx={{ flex: '1 1 260px', maxWidth: 420, minWidth: 0 }}>
              <CardActionArea component={Link} to={report.path} sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6">{report.label}</Typography>
                  <Typography color="text.secondary">
                    {report.description}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Can>
        ))}
      </Stack>
    </Page>
  )
}
