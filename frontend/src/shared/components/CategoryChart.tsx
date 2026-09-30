import { Box, Stack, Typography } from '@mui/material'

export type CategoryDatum = {
  label: string
  value: number
}

type CategoryChartProps = {
  title: string
  description?: string
  data: CategoryDatum[]
  emptyMessage: string
}

export function CategoryChart({
  title,
  description,
  data,
  emptyMessage,
}: CategoryChartProps) {
  const max = Math.max(0, ...data.map((item) => item.value))
  const total = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <Box
      aria-label={title}
      component="figure"
      sx={{ m: 0, minWidth: 0, width: '100%' }}
    >
      <Typography component="figcaption" variant="subtitle1">
        {title}
      </Typography>
      {description && (
        <Typography color="text.secondary" sx={{ mb: 2 }} variant="body2">
          {description}
        </Typography>
      )}
      {total === 0 ? (
        <Typography color="text.secondary" variant="body2">
          {emptyMessage}
        </Typography>
      ) : (
        <Stack component="ul" spacing={1.5} sx={{ listStyle: 'none', m: 0, p: 0 }}>
          {data.map((item) => {
            const width = max === 0 ? 0 : Math.max(4, (item.value / max) * 100)
            return (
              <Box component="li" key={item.label} sx={{ minWidth: 0 }}>
                <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography sx={{ overflowWrap: 'anywhere' }} variant="body2">
                    {item.label}
                  </Typography>
                  <Typography variant="body2">{item.value}</Typography>
                </Stack>
                <Box
                  aria-hidden
                  sx={{
                    bgcolor: 'action.hover',
                    borderRadius: 1,
                    height: 10,
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      bgcolor: 'primary.main',
                      borderRadius: 1,
                      height: '100%',
                      width: `${width}%`,
                    }}
                  />
                </Box>
              </Box>
            )
          })}
        </Stack>
      )}
    </Box>
  )
}
