export function ReportPrintStyles() {
  return (
    <style>
      {`
        @media print {
          header, nav, .no-print { display: none !important; }
          main { padding: 0 !important; max-width: none !important; }
        }
      `}
    </style>
  )
}
