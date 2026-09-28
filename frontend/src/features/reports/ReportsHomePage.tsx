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
      description="Read-only reports over existing operational data. Browser print is available on each report. CSV and generated PDF files are not provided."
    >
      <Stack spacing={2}>
        {reportLinks.map((report) => (
          <Can key={report.path} permission={report.permission}>
            <Card>
              <CardActionArea component={Link} to={report.path}>
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
